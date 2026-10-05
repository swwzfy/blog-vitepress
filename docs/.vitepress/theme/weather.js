// 访客实时天气共享源：Bento 时钟卡（DateTimeWeather.vue）与粒子换肤（effects.js）
// 从这里拿同一份 Open-Meteo 数据——全站只发一次请求、每 30 分钟自刷。
// 位置按访客出口 IP 做城市级定位（免授权弹窗，天气粒度足够）：主 ipwho.is、
// 备 geojs.io，结果进 sessionStorage 缓存 6 小时（一次会话多次进站只打一次定位）；
// 定位全部失败或缓存过期定位失败时回退扬州（站主所在地兜底）。
// 天气请求失败不推送、不改 current，两个消费端各自按「无天气」降级（胶囊隐藏 /
// 粒子退季节皮肤），下个 tick 成功后自然恢复。

const YANGZHOU = { latitude: 32.39, longitude: 119.4, city: 'Yangzhou' };
const weatherUrl = (lat, lon) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
const REFRESH_MS = 30 * 60 * 1000;
const LOC_TTL = 6 * 60 * 60 * 1000;

// 主备定位源：pick 把各家 JSON 折叠成统一的 { latitude, longitude, city }，数据不可信返回 null
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
    .then(res => res.json())
    .finally(() => clearTimeout(timer));
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

let current = null;
let location = YANGZHOU; // 上一次成功定位；初始即兜底值，定位从未成功过时天气就是扬州的
let started = false;
let timer;
const subscribers = new Set();

async function tick() {
  location = (await resolveLocation()) || location;
  try {
    const data = await fetchJson(weatherUrl(location.latitude, location.longitude), 8000);
    current = {
      code: data.current.weather_code,
      temperature: data.current.temperature_2m,
      city: location.city,
    };
    subscribers.forEach(fn => fn(current));
  } catch {
    // 静默：消费端按「无天气」处理，下个 tick 自愈
  }
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
