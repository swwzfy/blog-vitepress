<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const postModules = import.meta.glob('../../posts/*.md', { eager: true })

const stats = computed(() => {
  let postCount = 0
  const tagSet = new Set<string>()

  for (const [, mod] of Object.entries(postModules)) {
    const data = (mod as any).__pageData
    if (!data) continue

    postCount++
    const tags: string[] = data.frontmatter?.tags || []
    tags.forEach(t => tagSet.add(t))
  }

  return {
    posts: postCount,
    tags: tagSet.size
  }
})
</script>

<template>
  <div class="stats">
    <div class="stat-item">
      <span class="stat-number">{{ stats.posts }}</span>
      <span class="stat-label">{{ isEn ? 'Posts' : '篇文章' }}</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <span class="stat-number">{{ stats.tags }}</span>
      <span class="stat-label">{{ isEn ? 'Tags' : '个标签' }}</span>
    </div>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  margin-top: 32px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-border);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-number {
  font-size: 36px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: var(--vp-c-text-3);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--vp-c-divider);
}

@media (max-width: 768px) {
  .stats {
    gap: 24px;
    padding: 20px;
  }

  .stat-number {
    font-size: 28px;
  }
}
</style>
