// 扬州（站主所在地）实时天气共享源：Bento 时钟卡（DateTimeWeather.vue）与
// 粒子换肤（effects.js）从这里拿同一份 Open-Meteo 数据 —— 全站只发一次请求、
// 每 30 分钟自刷。请求失败不推送、也不改 current，两个消费端各自按「无天气」
// 降级（时钟卡隐藏胶囊 / 粒子退回季节皮肤），下个 tick 成功后自然恢复。

const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=32.39&longitude=119.40&current=temperature_2m,weather_code';
const REFRESH_MS = 30 * 60 * 1000;

let current = null;
let started = false;
let timer;
const subscribers = new Set();

function start() {
  if (started) return;
  started = true;
  const tick = () => {
    fetch(OPEN_METEO_URL)
      .then(res => res.json())
      .then(data => {
        current = { code: data.current.weather_code, temperature: data.current.temperature_2m };
        subscribers.forEach(fn => fn(current));
      })
      .catch(() => {});
  };
  tick();
  timer = setInterval(tick, REFRESH_MS);
}

/**
 * 订阅天气变化，返回退订函数。已有缓存数据时立即同步一次。
 * @param {(w: { code: number, temperature: number } | null) => void} fn
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
