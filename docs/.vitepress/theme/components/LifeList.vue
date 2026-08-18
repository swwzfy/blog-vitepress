<script setup lang="ts">
import { computed } from 'vue'
import { zhPosts, enPosts } from '@/utils/posts'
import { formatDate } from '@/utils/format'
import { useLocale } from '@/composables/useLocale'
import type { Post } from '@/utils/types'

const { isEn } = useLocale()

const LIFE_TAG_ZH = '生活'
const LIFE_TAG_EN = 'Life'

const lifePosts = computed<Post[]>(() => {
  const source = isEn.value ? enPosts : zhPosts
  const targetTag = isEn.value ? LIFE_TAG_EN : LIFE_TAG_ZH
  return source
    .filter(post => post.tags.includes(targetTag))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const emptyText = computed(() =>
  isEn.value ? 'No life articles yet.' : '还没有生活类文章。'
)
</script>

<template>
  <div class="life-page">
    <p v-if="lifePosts.length === 0" class="life-empty">
      {{ emptyText }}
    </p>
    <ul v-else class="life-list">
      <li v-for="post in lifePosts" :key="post.url" class="life-item">
        <a :href="post.url" class="life-link">{{ post.title }}</a>
        <span class="life-date">{{ formatDate(post.date) }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.life-page {
  margin-top: 16px;
}

.life-empty {
  color: var(--vp-c-text-3);
  font-size: 15px;
  padding: 16px 0;
}

.life-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.life-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px dashed var(--vp-c-divider);
}

.life-item:last-child {
  border-bottom: none;
}

.life-link {
  color: var(--vp-c-text-1);
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  transition: color 0.2s;
}

.life-link:hover {
  color: var(--vp-c-brand-1);
}

.life-date {
  font-size: 14px;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
  margin-left: 16px;
}

@media (max-width: 768px) {
  .life-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .life-date {
    margin-left: 0;
  }
}
</style>
