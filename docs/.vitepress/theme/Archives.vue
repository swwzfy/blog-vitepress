<script setup lang="ts">
import { computed } from 'vue'
import { zhPosts, enPosts, byDateDesc } from '@/utils/posts'
import { formatDate } from '@/utils/format'
import { useLocale } from '@/composables/useLocale'
import type { Post } from '@/utils/types'

interface GroupedPosts {
  [year: string]: {
    [month: string]: Post[]
  }
}

const { isEn, t } = useLocale()

const grouped = computed<GroupedPosts>(() => {
  const list = isEn.value ? enPosts : zhPosts
  const sorted = [...list].sort(byDateDesc)
  const out: GroupedPosts = {}

  for (const post of sorted) {
    if (!post.date) continue
    const d = new Date(post.date)
    const year = String(d.getFullYear())
    const month = String(d.getMonth() + 1)
    ;(out[year] ||= {})[month] ||= []
    out[year][month].push(post)
  }
  return out
})

const sortedYears = computed<string[]>(() =>
  Object.keys(grouped.value).sort((a, b) => Number(b) - Number(a))
)

const sortedMonths = computed<Record<string, string[]>>(() => {
  const out: Record<string, string[]> = {}
  for (const year of Object.keys(grouped.value)) {
    out[year] = Object.keys(grouped.value[year]).sort((a, b) => Number(b) - Number(a))
  }
  return out
})

// 年份锚点条用的篇数：该年所有月份条目求和
const yearCounts = computed<Record<string, number>>(() => {
  const out: Record<string, number> = {}
  for (const year of Object.keys(grouped.value)) {
    out[year] = Object.values(grouped.value[year]).reduce((sum, posts) => sum + posts.length, 0)
  }
  return out
})

function monthLabel(m: string): string {
  if (isEn.value) {
    const idx = parseInt(m, 10) - 1
    return MONTH_NAMES_EN[idx] || m
  }
  return `${m}月`
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const
</script>

<template>
  <nav class="year-nav" :aria-label="t('yearNav')">
    <a v-for="year in sortedYears" :key="year" class="year-pill" :href="`#year-${year}`">
      {{ year }}
      <span class="year-pill-count">{{ yearCounts[year] }}</span>
    </a>
  </nav>
  <div v-for="year in sortedYears" :key="year" class="archive-year">
    <h2 :id="`year-${year}`">{{ year }}</h2>
    <div v-for="month in sortedMonths[year]" :key="month" class="archive-month">
      <h3>{{ monthLabel(month) }}</h3>
      <ul class="archive-list">
        <li v-for="post in grouped[year][month]" :key="post.url">
          <a :href="post.url">{{ post.title }}</a>
          <time>{{ formatDate(post.date) }}</time>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* 年份锚点条：吸在导航栏下方，滚动时随时可跳 */
.year-nav {
  position: sticky;
  top: calc(var(--vp-nav-height) + 8px);
  z-index: 9;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--vp-c-bg) 82%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--radius-pill);
}

.year-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 3px 14px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s, background 0.2s;
}

.year-pill:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.year-pill-count {
  font-size: 11px;
  font-weight: 400;
  color: var(--vp-c-text-3);
}

.archive-year {
  margin-bottom: 32px;
}

.archive-year h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--vp-c-brand-1);
  /* 锚点跳转时给吸顶导航 + 锚点条留出空间 */
  scroll-margin-top: calc(var(--vp-nav-height) + 72px);
}

.archive-month h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin: 16px 0 12px;
}

.archive-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.archive-list li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.archive-list li:last-child {
  border-bottom: none;
}

.archive-list a {
  color: var(--vp-c-text-1);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.archive-list a:hover {
  color: var(--vp-c-brand-1);
}

.archive-list time {
  font-size: 14px;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .archive-list li {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
