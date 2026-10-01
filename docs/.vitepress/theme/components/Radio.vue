<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import radioData from '../../radio.json'
import { useLocale } from '@/composables/useLocale'
import { formatDate } from '@/utils/format'

/**
 * 电台页：剧集列表 + 单实例播放器。
 * 数据源 docs/.vitepress/radio.json —— 加一集 = 往 public/radio/ 丢音频文件 + json 加一条，
 * 音频就位后播放键直接可用，无需改组件。
 * 音频缺失（404）时 audio 元素触发 error，卡片内就地提示，不影响其他剧集。
 */
interface Episode {
  title: string
  titleEn: string
  date: string
  duration?: string
  desc: string
  descEn: string
  file: string
}

const episodes = (radioData as Episode[])
  .slice()
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

const { isEn, t } = useLocale()

const playingFile = ref<string | null>(null)
const failedFile = ref<string | null>(null)
const progress = ref(0)
const currentTime = ref('')

let audioEl: HTMLAudioElement | null = null
let currentFile = ''

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds)) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = String(Math.floor(seconds % 60)).padStart(2, '0')
  return `${m}:${s}`
}

function ensureAudio(): HTMLAudioElement {
  if (audioEl) return audioEl
  // Audio 构造器只在客户端存在：懒创建，SSG 渲染期不碰
  const el = new Audio()
  el.addEventListener('timeupdate', () => {
    currentTime.value = fmt(el.currentTime)
    progress.value = el.duration ? (el.currentTime / el.duration) * 100 : 0
  })
  el.addEventListener('ended', () => {
    playingFile.value = null
    progress.value = 0
    currentTime.value = ''
  })
  el.addEventListener('error', () => {
    failedFile.value = currentFile
    playingFile.value = null
  })
  audioEl = el
  return el
}

function toggle(ep: Episode) {
  if (playingFile.value === ep.file) {
    audioEl?.pause()
    playingFile.value = null
    return
  }
  const el = ensureAudio()
  if (currentFile !== ep.file) {
    el.pause()
    currentFile = ep.file
    failedFile.value = null
    progress.value = 0
    currentTime.value = ''
    el.src = ep.file
  }
  void el.play().catch(() => {}) // 自动播放策略拒绝时静默，error 事件兜底
  playingFile.value = ep.file
}

function seek(event: MouseEvent, ep: Episode) {
  if (!audioEl || currentFile !== ep.file || !audioEl.duration) return
  const track = event.currentTarget as HTMLElement
  const pct = Math.min(1, Math.max(0, (event.clientX - track.getBoundingClientRect().left) / track.getBoundingClientRect().width))
  audioEl.currentTime = pct * audioEl.duration
}

onBeforeUnmount(() => {
  audioEl?.pause()
})
</script>

<template>
  <div class="radio-page">
    <article
      v-for="ep in episodes"
      :key="ep.file"
      class="radio-ep"
      :class="{ 'is-playing': playingFile === ep.file, 'is-failed': failedFile === ep.file }"
    >
      <button
        class="ep-play"
        type="button"
        :aria-label="playingFile === ep.file ? t('radioPause') : t('radioPlay')"
        @click="toggle(ep)"
      >
        <svg v-if="playingFile !== ep.file" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
        </svg>
      </button>
      <div class="ep-body">
        <h3 class="ep-title">{{ isEn ? ep.titleEn : ep.title }}</h3>
        <p class="ep-desc">{{ isEn ? ep.descEn : ep.desc }}</p>
        <p class="ep-meta">
          <time>{{ formatDate(ep.date) }}</time>
          <template v-if="ep.duration">
            <span class="meta-dot">·</span><span>{{ ep.duration }}</span>
          </template>
          <template v-if="playingFile === ep.file && currentTime">
            <span class="meta-dot">·</span><span>{{ currentTime }}</span>
          </template>
        </p>
        <p v-if="failedFile === ep.file" class="ep-failed">{{ t('radioMissing') }}</p>
      </div>
      <div
        v-if="playingFile === ep.file"
        class="ep-progress"
        :aria-label="t('radioPlay')"
        @click="seek($event, ep)"
      >
        <div class="ep-progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.radio-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.radio-ep {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--radius-card);
  transition: border-color 0.25s, box-shadow 0.25s;
}

.radio-ep.is-playing {
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--shadow-card);
}

.radio-ep.is-failed {
  border-color: var(--vp-c-border);
  opacity: 0.75;
}

.ep-play {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  margin-top: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--radius-circle);
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  cursor: pointer;
  transition: all 0.2s;
}

.ep-play:hover {
  border-color: var(--vp-c-brand-1);
  transform: scale(1.05);
}

.is-playing .ep-play {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-white);
}

.ep-body {
  min-width: 0;
  flex: 1;
}

.ep-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.5;
}

.ep-desc {
  margin: var(--space-1) 0 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.ep-meta {
  margin: var(--space-2) 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.meta-dot {
  opacity: 0.5;
}

.ep-progress {
  position: absolute;
  left: var(--space-5);
  right: var(--space-5);
  bottom: 6px;
  height: 3px;
  border-radius: var(--radius-pill);
  background: var(--vp-c-divider);
  cursor: pointer;
}

.ep-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  transition: width 0.2s linear;
}

.ep-failed {
  margin: var(--space-2) 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
  font-style: italic;
}

@media (max-width: 768px) {
  .radio-ep {
    padding: var(--space-4);
  }

  .ep-progress {
    left: var(--space-4);
    right: var(--space-4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .radio-ep,
  .ep-play {
    transition: none;
  }

  .ep-progress-fill {
    transition: none;
  }
}
</style>
