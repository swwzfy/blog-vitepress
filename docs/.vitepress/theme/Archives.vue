<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

interface Post {
  title: string
  url: string
  date: string
}

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const zhModules = import.meta.glob('../../posts/*.md', { eager: true })
const enModules = import.meta.glob('../../en/posts/*.md', { eager: true })

interface GroupedPosts {
  [year: string]: {
    [month: string]: Post[]
  }
}

const grouped = computed<GroupedPosts>(() => {
  const list: Post[] = []
  const modules = isEn.value ? enModules : zhModules

  for (const [filePath, mod] of Object.entries(modules)) {
    const data = (mod as any).__pageData
    if (!data) continue
    const relPath = filePath.replace(/^\.\.\/\.\.\//, '').replace(/\.md$/, '')
    list.push({
      title: data.title || '',
      url: withBase('/' + relPath),
      date: data.frontmatter?.date || ''
    })
  }

  const sorted = list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const grouped: GroupedPosts = {}

  for (const post of sorted) {
    if (!post.date) continue
    const d = new Date(post.date)
    const year = String(d.getFullYear())
    const month = String(d.getMonth() + 1)
    if (!grouped[year]) grouped[year] = {}
    if (!grouped[year][month]) grouped[year][month] = []
    grouped[year][month].push(post)
  }

  return grouped
})

function monthLabel(m: string): string {
  return isEn.value ? `${m}月` : `${m}月`
}
</script>

<template>
  <div v-for="(months, year) in grouped" :key="year" class="archive-year">
    <h2>{{ year }}</h2>
    <div v-for="(posts, month) in months" :key="month" class="archive-month">
      <h3>{{ monthLabel(month) }}</h3>
      <ul class="archive-list">
        <li v-for="post in posts" :key="post.url">
          <a :href="post.url">{{ post.title }}</a>
          <time>{{ post.date }}</time>
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
