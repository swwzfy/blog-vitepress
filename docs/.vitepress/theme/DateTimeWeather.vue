<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLocale } from '@/composables/useLocale'

const { isEn } = useLocale()

const now = ref(new Date())
const weather = ref('')

function updateTime() {
  now.value = new Date()
}

function formatDate() {
  const d = now.value
  const weekdays = isEn.value
    ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    : ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const weekday = weekdays[d.getDay()]
  return `${year}-${month}-${day} ${weekday}`
}

function formatTime() {
  const d = now.value
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function getGreeting() {
  const h = now.value.getHours()
  if (isEn.value) {
    if (h < 6) return 'Good Night'
    if (h < 12) return 'Good Morning'
    if (h < 18) return 'Good Afternoon'
    return 'Good Evening'
  }
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
}

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

onMounted(() => {
  updateTime()
  setInterval(updateTime, 1000)
  fetchWeather()
  setInterval(fetchWeather, 30 * 60 * 1000) // 每30分钟刷新
})
</script>

<template>
  <div class="datetime-weather">
    <div class="greeting">{{ getGreeting() }}</div>
    <div class="info-row">
      <span class="date">{{ formatDate() }}</span>
      <span class="time">{{ formatTime() }}</span>
      <span v-show="weather" class="weather">{{ weather }}</span>
    </div>
  </div>
</template>

<style scoped>
.datetime-weather {
  text-align: center;
  padding: 24px 20px;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: linear-gradient(135deg, var(--vp-c-brand-soft), var(--vp-c-bg-soft));
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 16px;
  box-shadow: 0 4px 20px var(--vp-c-brand-soft);
}

.greeting {
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.time {
  font-size: 32px;
  font-weight: 800;
  color: var(--vp-c-text-1);
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 2px;
}

.date,
.weather {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.weather {
  padding: 4px 10px;
  background: var(--vp-c-bg-soft);
  border-radius: 20px;
  font-size: 12px;
}

@media (max-width: 768px) {
  .time {
    font-size: 28px;
  }
}
</style>
