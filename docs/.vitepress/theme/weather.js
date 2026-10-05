// 访客实时天气共享源：Bento 时钟卡（DateTimeWeather.vue）与粒子换肤（effects.js）
// 从这里拿同一份天气数据，每 30 分钟自刷。数据链优先级：
//   1) 同源 /api/weather（stats 后端：ip2region 离线定位 + 按城市缓存，国内判定最准）
//   2) 浏览器直连定位链：ipwho.is → geojs.io（IP 城市级、免授权弹窗，sessionStorage
//      缓存 6h）+ Open-Meteo——stats 服务不可用时的回退
//   3) 定位全失败回退扬州（站主所在地兜底）
// 每级失败都静默落到下一级；全部失败不推送、不改 current，两个消费端各自按
// 「无天气」降级（胶囊隐藏 / 粒子退季节皮肤），下个 tick 成功后自然恢复。

const YANGZHOU = { latitude: 32.39, longitude: 119.4, city: 'Yangzhou' };
const weatherUrl = (lat, lon) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
const REFRESH_MS = 30 * 60 * 1000;
const LOC_TTL = 6 * 60 * 60 * 1000;

// 回退定位源：pick 把各家 JSON 折叠成统一的 { latitude, longitude, city }，数据不可信返回 null
const GEO_APIS = [
  {
    url: 'https://ipwho.is/',
    pick: d =>
      d && d.success && isFinite(d.latitude) && isFinite(d.longitude)
        ? { latitude: d.latitude, longitude: d.longitude, city: d.city || '' }
        : null,
  },
  {
    url: 'https://get.geojs.io/v1/ip/geo.json',
    pick: d =>
      d && isFinite(+d.latitude) && isFinite(+d.longitude)
        ? { latitude: +d.latitude, longitude: +d.longitude, city: d.city || '' }
        : null,
  },
];

function fetchJson(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { signal: ctrl.signal })
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .finally(() => clearTimeout(timer));
}

// 源 1：stats 后端（同源，nginx 反代 /api）。只信任有限字段，形状不对按失败处理
async function fetchFromServer() {
  const d = await fetchJson('/api/weather', 4000);
  if (!isFinite(d.code) || !isFinite(d.temperature) || !d.city) {
    throw new Error('bad /api/weather payload');
  }
  return { code: d.code, temperature: d.temperature, city: d.city };
}

async function resolveLocation() {
  try {
    const cached = JSON.parse(sessionStorage.getItem('wx-loc') || 'null');
    if (cached && Date.now() - cached.at < LOC_TTL) return cached.loc;
  } catch {
    // 隐私模式等场景 sessionStorage 不可用：当无缓存，直接走在线定位
  }
  for (const api of GEO_APIS) {
    try {
      const loc = api.pick(await fetchJson(api.url, 3000));
      if (loc) {
        try {
          sessionStorage.setItem('wx-loc', JSON.stringify({ at: Date.now(), loc }));
        } catch {
          // 写不进就算了：下次进站重新定位，不影响本次
        }
        return loc;
      }
    } catch {
      // 该定位源超时/挂了：轮到下一个备源
    }
  }
  return null;
}

// 源 2：浏览器直连定位 + Open-Meteo
async function fetchFromBrowser() {
  location = (await resolveLocation()) || location;
  const d = await fetchJson(weatherUrl(location.latitude, location.longitude), 8000);
  const cur = d.current || {};
  if (!isFinite(cur.weather_code) || !isFinite(cur.temperature_2m)) {
    throw new Error('bad open-meteo payload');
  }
  return { code: cur.weather_code, temperature: cur.temperature_2m, city: location.city };
}

let current = null;
let location = YANGZHOU; // 浏览器直连链的上一次成功定位；初始即兜底值
let started = false;
let timer;
const subscribers = new Set();

async function tick() {
  let w;
  try {
    w = await fetchFromServer();
  } catch {
    try {
      w = await fetchFromBrowser();
    } catch {
      return; // 两级都失败：维持现状，下个 tick 自愈
    }
  }
  current = w;
  subscribers.forEach(fn => fn(current));
}

function start() {
  if (started) return;
  started = true;
  tick();
  timer = setInterval(tick, REFRESH_MS);
}

/**
 * 订阅天气变化，返回退订函数。已有缓存数据时立即同步一次。
 * @param {(w: { code: number, temperature: number, city: string } | null) => void} fn
 * @returns {() => void}
 */
export function watchWeather(fn) {
  start();
  subscribers.add(fn);
  if (current) fn(current);
  return () => subscribers.delete(fn);
}

// dev HMR 重载时清掉旧实例的定时器防叠加（生产 import.meta.hot 为 undefined）
if (import.meta.hot) import.meta.hot.dispose(() => clearInterval(timer));
