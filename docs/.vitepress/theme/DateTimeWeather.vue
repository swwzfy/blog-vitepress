<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLocale } from '@/composables/useLocale'

const { isEn, t } = useLocale()

// 时钟数据源。SSR/水合期保持 null：时间随时钟流逝，静态渲染（SSG 时刻）与访问时刻
// 必然不一致，直接渲染会 hydration mismatch 导致水合失败 —— 先出稳定占位，onMounted 再起真实时钟
const now = ref<Date | null>(null)
const weather = ref('')

function updateTime() {
  now.value = new Date()
}

function formatDate() {
  if (!now.value) return t('datePlaceholder')
  const d = now.value
  const weekdays = isEn.value
    ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    : ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const weekday = weekdays[d.getDay()]
  return `${year}-${month}-${day} · ${weekday}`
}

// 时/分/秒拆开渲染：秒缩小退后，避免整串等宽大字太压场
const hh = computed(() => (now.value ? String(now.value.getHours()).padStart(2, '0') : '--'))
const mm = computed(() => (now.value ? String(now.value.getMinutes()).padStart(2, '0') : '--'))
const ss = computed(() => (now.value ? String(now.value.getSeconds()).padStart(2, '0') : '--'))

// 时段 emoji 跟 getGreeting 同档位，给图标盒用（呼应 VPFeature 的 icon 槽）
function greetingEmoji() {
  if (!now.value) return '🕒'
  const h = now.value.getHours()
  if (h < 6) return '🌙'
  if (h < 12) return '☀️'
  if (h < 18) return '🌤️'
  return '🌆'
}

function getGreeting() {
  if (!now.value) return t('greetingHello')
  const h = now.value.getHours()
  if (h < 6) return t('greetingNight')
  if (h < 12) return t('greetingMorning')
  if (h < 18) return t('greetingAfternoon')
  return t('greetingEvening')
}

// 公历固定节日倒计时（借鉴友链 Leelaa 首页的 STATUS 节日条；农历需查表换算，暂不覆盖）。
// 跟随 now 的 computed：SSR 期 now 为 null 输出空串，水合后才有值，无 mismatch
const FESTIVALS = [
  { m: 1, d: 1, zh: '元旦', en: "New Year's Day", emoji: '🎊' },
  { m: 2, d: 14, zh: '情人节', en: "Valentine's Day", emoji: '💝' },
  { m: 5, d: 1, zh: '劳动节', en: 'Labour Day', emoji: '🛠️' },
  { m: 6, d: 1, zh: '儿童节', en: "Children's Day", emoji: '🎈' },
  { m: 10, d: 1, zh: '国庆节', en: 'National Day', emoji: '🇨🇳' },
  { m: 12, d: 25, zh: '圣诞节', en: 'Christmas', emoji: '🎄' }
]
const festival = computed(() => {
  if (!now.value) return ''
  const d = now.value
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  let next: { name: string; days: number; emoji: string } | null = null
  for (let y = today.getFullYear(); y <= today.getFullYear() + 1; y++) {
    for (const f of FESTIVALS) {
      const days = Math.round((new Date(y, f.m - 1, f.d).getTime() - today.getTime()) / 86400000)
      if (days >= 0 && (!next || days < next.days)) {
        next = { name: isEn.value ? f.en : f.zh, days, emoji: f.emoji }
      }
    }
  }
  if (!next) return ''
  const text = next.days === 0
    ? t('todayIs', { name: next.name })
    : t('countdownTo', { name: next.name, days: next.days })
  return `${next.emoji} ${text}`
})

const weatherCodeMap: Record<number, { zh: string; en: string }> = {
  0: { zh: '晴', en: 'Clear' },
  1: { zh: '大部晴朗', en: 'Mainly Clear' },
  2: { zh: '多云', en: 'Partly Cloudy' },
  3: { zh: '阴', en: 'Overcast' },
  45: { zh: '雾', en: 'Fog' },
  48: { zh: '雾凇', en: 'Depositing Rime Fog' },
  51: { zh: '小毛毛雨', en: 'Light Drizzle' },
  53: { zh: '毛毛雨', en: 'Moderate Drizzle' },
  55: { zh: '大毛毛雨', en: 'Dense Drizzle' },
  61: { zh: '小雨', en: 'Slight Rain' },
  63: { zh: '中雨', en: 'Moderate Rain' },
  65: { zh: '大雨', en: 'Heavy Rain' },
  71: { zh: '小雪', en: 'Slight Snow' },
  73: { zh: '中雪', en: 'Moderate Snow' },
  75: { zh: '大雪', en: 'Heavy Snow' },
  77: { zh: '雪粒', en: 'Snow Grains' },
  80: { zh: '小阵雨', en: 'Slight Rain Showers' },
  81: { zh: '阵雨', en: 'Moderate Rain Showers' },
  82: { zh: '大阵雨', en: 'Violent Rain Showers' },
  85: { zh: '小阵雪', en: 'Slight Snow Showers' },
  86: { zh: '大阵雪', en: 'Heavy Snow Showers' },
  95: { zh: '雷暴', en: 'Thunderstorm' },
  96: { zh: '雷暴+小冰雹', en: 'Thunderstorm with Slight Hail' },
  99: { zh: '雷暴+大冰雹', en: 'Thunderstorm with Heavy Hail' }
}

function getWeatherEmoji(code: number): string {
  if (code <= 1) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 48) return '🌫️'
  if (code <= 55) return '🌦️'
  if (code <= 65) return '🌧️'
  if (code <= 77) return '🌨️'
  if (code <= 82) return '🌧️'
  if (code <= 86) return '🌨️'
  return '⛈️'
}

async function fetchWeather() {
  try {
    // 坐标硬编码为扬州（站主所在地）；open-meteo 免费且无需 key
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=32.39&longitude=119.40&current=temperature_2m,weather_code'
    )
    const data = await res.json()
    const { temperature_2m, weather_code } = data.current
    const desc = weatherCodeMap[weather_code]
    const text = desc ? (isEn.value ? desc.en : desc.zh) : ''
    const emoji = getWeatherEmoji(weather_code)
    weather.value = `${emoji} ${temperature_2m}°C ${text}`
  } catch {
    weather.value = ''
  }
}

let timeTimer: ReturnType<typeof setInterval> | undefined
let weatherTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  updateTime()
  timeTimer = setInterval(updateTime, 1000)
  fetchWeather()
  weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000) // 每30分钟刷新
})

// 不清理的话 dev HMR 每次热更新都会叠一个 interval，时钟会越走越快
onUnmounted(() => {
  clearInterval(timeTimer)
  clearInterval(weatherTimer)
})
</script>

<template>
  <div class="datetime-weather">
    <div class="greeting-row">
      <span class="icon-box">{{ greetingEmoji() }}</span>
      <span class="greeting">{{ getGreeting() }}</span>
      <span v-show="festival" class="festival-chip">{{ festival }}</span>
    </div>
    <div class="info-row">
      <span class="date">{{ formatDate() }}</span>
      <span class="time">{{ hh }}<span class="time-colon">:</span>{{ mm }}<span class="time-sec">{{ ss }}</span></span>
      <span v-show="weather" class="weather">{{ weather }}</span>
    </div>
  </div>
</template>

<style scoped>
/* 首页 Bento 的时钟卡（HomeBento 第一格）：撑满网格单元，圆角/内边距对齐 bento 卡（12px / 24px）。
   底色 = 品牌渐变 + 两个静态氛围光斑（粉紫双色呼应全站配色，纯背景层，无动画开销） */
.datetime-weather {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24px 20px;
  background:
    radial-gradient(120px 120px at 100% 0, rgba(253, 121, 168, 0.32), transparent),
    radial-gradient(100px 100px at 0 100%, rgba(162, 155, 254, 0.35), transparent),
    linear-gradient(135deg, var(--vp-c-brand-soft), var(--vp-c-bg-soft));
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 12px;
  box-shadow: 0 4px 20px var(--vp-c-brand-soft);
}

/* 头部：时段 emoji 图标盒 + 问候语 + 节日倒计时，结构对齐三张特性卡的 icon 槽 */
.greeting-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

/* 节日倒计时：样式与天气胶囊一致，靠 space-between 靠右 */
.festival-chip {
  margin-left: auto;
  padding: 5px 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  font-size: 24px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.greeting {
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.info-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.date {
  font-size: 13px;
  color: var(--vp-c-text-3);
  letter-spacing: 0.04em;
}

/* 时间：品牌渐变字呼应 hero name / 统计数字；秒缩小退后 */
.time {
  display: inline-flex;
  align-items: baseline;
  margin: 2px 0 4px;
  font-size: 34px;
  font-weight: 800;
  font-family: 'JetBrains Mono', 'Noto Sans SC', 'Source Han Mono', monospace;
  letter-spacing: 2px;
  line-height: 1.2;
  background: linear-gradient(120deg, var(--vp-c-brand-1), var(--vp-c-brand-2) 50%, var(--vp-c-brand-3));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.time-sec {
  font-size: 17px;
  letter-spacing: 0;
  color: var(--vp-c-text-3);
  -webkit-text-fill-color: var(--vp-c-text-3);
}

.weather {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

@media (max-width: 768px) {
  .time {
    font-size: 28px;
  }
}

/* 宽卡（HomeBento 跨 2 列，容器 ≥480px）：信息行转横向，时钟放大做视觉锚点。
   用容器查询而非媒体查询 —— 卡片实际宽度由网格断点决定，视口宽度判断不了容器 */
@container (min-width: 480px) {
  .info-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .time {
    font-size: 42px;
  }
}
</style>
