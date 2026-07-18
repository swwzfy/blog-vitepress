<script setup lang="ts">
import { computed } from 'vue'
import { zhPosts, enPosts } from '@/utils/posts'
import { formatDate } from '@/utils/format'
import { useLocale } from '@/composables/useLocale'
import type { Post } from '@/utils/types'

interface GroupedPosts {
  [year: string]: {
    [month: string]: Post[]
  }
}

const { isEn } = useLocale()

const grouped = computed<GroupedPosts>(() => {
  const list = isEn.value ? enPosts : zhPosts
  const sorted = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
  <div v-for="year in sortedYears" :key="year" class="archive-year">
    <h2>{{ year }}</h2>
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
