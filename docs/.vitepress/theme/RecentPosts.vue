<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

interface Post {
  title: string
  url: string
  date: string
  description: string
  tags: string[]
}

const { frontmatter, lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const zhModules = import.meta.glob('../../posts/*.md', { eager: true })
const enModules = import.meta.glob('../../en/posts/*.md', { eager: true })

const posts = computed<Post[]>(() => {
  const list: Post[] = []
  const modules = isEn.value ? enModules : zhModules

  for (const [filePath, mod] of Object.entries(modules)) {
    const data = (mod as any).__pageData
    if (!data) continue

    const relPath = filePath.replace(/^\.\.\/\.\.\//, '').replace(/\.md$/, '')
    list.push({
      title: data.title || '',
      url: withBase('/' + relPath),
      date: data.frontmatter?.date || '',
      description: data.frontmatter?.description || '',
      tags: data.frontmatter?.tags || []
    })
  }

  return list
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
})

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <div class="recent-posts">
    <h2 class="section-title">
      <span class="title-icon">📝</span>
      {{ isEn ? 'Recent Posts' : '最新文章' }}
    </h2>
    <div class="posts-list">
      <a v-for="post in posts" :key="post.url" :href="post.url" class="post-card">
        <div class="post-header">
          <h3 class="post-title">{{ post.title }}</h3>
          <time class="post-date">{{ formatDate(post.date) }}</time>
        </div>
        <p v-if="post.description" class="post-desc">{{ post.description }}</p>
        <div v-if="post.tags.length" class="post-tags">
          <span v-for="tag in post.tags" :key="tag" class="post-tag">{{ tag }}</span>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.recent-posts {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--vp-c-divider);
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 24px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 28px;
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.post-card {
  display: block;
  padding: 20px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.post-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 4px 16px var(--vp-c-brand-soft);
  transform: translateY(-2px);
}

.post-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.post-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0;
  line-height: 1.4;
}

.post-date {
  font-size: 14px;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

.post-desc {
  font-size: 14px;
  color: var(--vp-c-text-2);
  margin: 8px 0 0 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.post-tag {
  font-size: 12px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  padding: 2px 8px;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .post-header {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
