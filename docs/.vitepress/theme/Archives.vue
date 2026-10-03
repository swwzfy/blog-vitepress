<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { zhPosts, enPosts, byDateDesc } from '@/utils/posts'
import { formatDate } from '@/utils/format'
import { useLocale } from '@/composables/useLocale'
import type { Post } from '@/utils/types'

const { isEn, t } = useLocale()

// 构建期在 config.mts 里扫稿统计、vite define 注入的字数常量
declare const __SITE_WORDS__: { zh: number; en: number }

// 年 → 平铺文章列表（按日期倒序）。不再按月分组：日期锚点卡上已印「日 + 月」，
// 月份小标题是重复信息，还把页面拉长（leelaa 同款结构）
const grouped = computed<{ [year: string]: Post[] }>(() => {
  const list = isEn.value ? enPosts : zhPosts
  const sorted = [...list].sort(byDateDesc)
  const out: { [year: string]: Post[] } = {}

  for (const post of sorted) {
    if (!post.date) continue
    const year = String(new Date(post.date).getFullYear())
    ;(out[year] ||= []).push(post)
  }
  return out
})

const sortedYears = computed<string[]>(() =>
  Object.keys(grouped.value).sort((a, b) => Number(b) - Number(a))
)

// 年份锚点条与年份标题行的篇数
const yearCounts = computed<Record<string, number>>(() => {
  const out: Record<string, number> = {}
  for (const year of Object.keys(grouped.value)) {
    out[year] = grouped.value[year].length
  }
  return out
})

// header 统计行：篇数与全站字数是构建期事实，SSG 直接渲染；
// 「本月更新」是运行时事实（同 Stats.vue 的时钟套路），onMounted 再算，避免 hydration 错位
const postCount = computed(() => (isEn.value ? enPosts : zhPosts).length)
const wordCount = computed(() =>
  (isEn.value ? __SITE_WORDS__.en : __SITE_WORDS__.zh).toLocaleString()
)
const now = ref<Date | null>(null)
onMounted(() => {
  now.value = new Date()
})
const monthly = computed(() => {
  if (!now.value) return null
  const list = isEn.value ? enPosts : zhPosts
  return list.filter(p => {
    if (!p.date) return false
    const d = new Date(p.date)
    return d.getFullYear() === now.value!.getFullYear() && d.getMonth() === now.value!.getMonth()
  }).length
})

// —— scroll-spy：滚到哪一年，吸顶条上哪年的 chip 点亮 ——
// IntersectionObserver 视口上 1/3 处的年份算「当前」；年份变化（切语言）后重建
const activeYear = ref('')
let spy: IntersectionObserver | null = null

function setupSpy() {
  spy?.disconnect()
  const headings = document.querySelectorAll('.archive-year .year-heading')
  if (!headings.length) {
    activeYear.value = ''
    return
  }
  spy = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeYear.value = (entry.target.querySelector('h2')?.textContent || '').trim()
        }
      }
    },
    { rootMargin: '-25% 0px -65% 0px' }
  )
  headings.forEach(h => spy!.observe(h))
}

onMounted(() => {
  nextTick(setupSpy)
})
watch(sortedYears, () => nextTick(setupSpy))
onBeforeUnmount(() => spy?.disconnect())

// chip 跳转：平滑滚动 + 静默更新 hash（保留可分享的锚点，又不触发浏览器硬跳）
function jump(year: string) {
  const el = document.getElementById(`year-${year}`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  history.replaceState(null, '', `#year-${year}`)
}

// chip 点亮后自动横滚到可见区（年份多、条子溢出时保持当前年份可见）
watch(activeYear, y => {
  if (!y) return
  nextTick(() => {
    document
      .querySelector(`.year-nav .year-pill[href="#year-${y}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
})

function monthShort(date: string): string {
  const m = new Date(date).getMonth()
  if (isEn.value) return MONTH_NAMES_EN[m].slice(0, 3)
  return `${m + 1}月`
}

function dayLabel(date: string): string {
  return String(new Date(date).getDate()).padStart(2, '0')
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const
</script>

<template>
  <div class="arch-page">
    <header class="arch-header">
      <h1 class="arch-title">{{ t('archTitle') }}</h1>
      <p class="arch-subtitle">{{ t('archSubtitle') }}</p>
      <p class="arch-stats">
        <span>{{ t('archStatPosts', { n: postCount }) }}</span>
        <span class="arch-dot" aria-hidden="true">·</span>
        <span>{{ t('archStatWords', { n: wordCount }) }}</span>
        <template v-if="monthly !== null">
          <span class="arch-dot" aria-hidden="true">·</span>
          <span>{{ t('archStatMonthly', { n: monthly }) }}</span>
        </template>
      </p>
    </header>

    <nav class="year-nav" :aria-label="t('yearNav')">
      <a
        v-for="year in sortedYears"
        :key="year"
        class="year-pill"
        :class="{ 'is-active': activeYear === year }"
        :href="`#year-${year}`"
        @click.prevent="jump(year)"
      >
        {{ year }}
        <span class="year-pill-count">{{ yearCounts[year] }}</span>
      </a>
    </nav>

    <div v-for="year in sortedYears" :key="year" class="archive-year">
      <div :id="`year-${year}`" class="year-heading">
        <h2>{{ year }}</h2>
        <span class="year-line" aria-hidden="true"></span>
        <span class="year-count">{{ t('archStatPosts', { n: yearCounts[year] }) }}</span>
      </div>
      <ul class="archive-list">
        <li v-for="post in grouped[year]" :key="post.url">
          <a class="post-row" :href="post.url">
            <span class="post-date" aria-hidden="true">
              <span class="post-day">{{ dayLabel(post.date) }}</span>
              <span class="post-month">{{ monthShort(post.date) }}</span>
            </span>
            <span class="post-main">
              <span class="post-title">{{ post.title }}</span>
              <span class="post-desc">{{ post.description }}</span>
            </span>
            <span v-if="post.tags.length" class="post-tags">
              <span v-for="tag in post.tags.slice(0, 3)" :key="tag" class="post-tag">{{ tag }}</span>
              <span v-if="post.tags.length > 3" class="post-tag post-tag-more">
                +{{ post.tags.length - 3 }}
              </span>
            </span>
            <time class="post-time">{{ formatDate(post.date) }}</time>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* 归档页自带 header/卡片布局，内容宽度对齐首页 Stats（--axis-page）；
   aside: false 已在 frontmatter 关掉右栏目录 */
.arch-page {
  max-width: var(--axis-page);
  margin: 0 auto;
}

.arch-header {
  margin-bottom: 32px;
}

.arch-title {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--vp-c-text-1);
  margin: 0 0 12px;
  padding: 0;
  border: none;
}

.arch-subtitle {
  font-size: 15px;
  color: var(--vp-c-text-2);
  margin: 0 0 10px;
  padding: 0;
}

.arch-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  color: var(--vp-c-text-3);
  margin: 0;
  padding: 0;
}

.arch-dot {
  opacity: 0.5;
}

/* 年份条（仿 leelaa 扁平横排）：吸在导航栏下方随时可跳；
   不换行 + overflow-x 横向滚动（滚动条隐藏，滚轮/触摸横拖），
   年份再多也不换行、不需要分页 */
.year-nav {
  position: sticky;
  top: calc(var(--vp-nav-height) + 8px);
  z-index: 9;
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 10px;
  margin-bottom: 28px;
  padding: 6px 2px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.year-nav::-webkit-scrollbar {
  display: none;
}

.year-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  flex-shrink: 0;
  padding: 5px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--radius-pill);
  background: var(--vp-c-bg);
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}

.year-pill:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.year-pill-count {
  font-size: 11px;
  font-weight: 400;
  color: var(--vp-c-text-3);
}

.archive-year {
  margin-bottom: 40px;
}

/* 年份标题行：竖线装饰的 h2 在左、计数在右（不加拉线——用户明确不要那道横线） */
.year-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  /* 锚点跳转时给吸顶导航 + 锚点条留出空间 */
  scroll-margin-top: calc(var(--vp-nav-height) + 72px);
}

.year-heading h2 {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
  /* border-top:none：VitePress 给 .vp-doc h2 自带 1px 顶部分隔线（用户指的「头顶横线」），
     归档页年份行不要它 */
  border-top: none;
  /* padding-left 必须保留：站内 h2 有 3px 装饰竖线（.vp-doc h2::before），
     覆盖成 0 会让「2026」紧贴竖线 */
  padding: 0 var(--space-4);
}

.year-line {
  flex: 1;
  height: 1px;
  background: var(--vp-c-divider);
}

.year-count {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

/* 日期锚点卡：大日期数字 + 标题/摘要 + 标签/日期，细分隔线行 */
.archive-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.archive-list li {
  border-bottom: 1px solid var(--vp-c-divider);
}

.archive-list li:last-child {
  border-bottom: none;
}

.post-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 4px;
  text-decoration: none;
}

.post-date {
  flex-shrink: 0;
  width: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  color: var(--vp-c-text-3);
  transition: color 0.2s;
}

.post-day {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--vp-c-text-2);
  transition: color 0.2s;
}

.post-month {
  font-size: 12px;
}

.post-row:hover .post-day,
.post-row:hover .post-month {
  color: var(--vp-c-brand-1);
}

.post-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.post-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}

.post-row:hover .post-title {
  color: var(--vp-c-brand-1);
}

.post-desc {
  font-size: 13px;
  color: var(--vp-c-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-tags {
  flex-shrink: 0;
  display: flex;
  gap: 6px;
}

.post-tag {
  font-size: 12px;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--radius-pill);
  padding: 1px 10px;
  white-space: nowrap;
}

/* 溢出折叠：+N 提示还有更多标签 */
.post-tag-more {
  background: transparent;
  border-style: dashed;
}

/* scroll-spy 点亮的当前年份 chip */
.year-pill.is-active {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.post-time {
  /* 大日期块已承担视觉职能（aria-hidden），完整日期保留给屏幕阅读器 */
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 960px) {
  .post-tags {
    display: none;
  }
}

@media (max-width: 768px) {
  .arch-title {
    font-size: 30px;
  }

  .post-row {
    gap: 14px;
    padding: 12px 2px;
  }

  .post-date {
    width: 40px;
  }

  .post-day {
    font-size: 20px;
  }

  .post-desc {
    display: none;
  }
}
</style>
