<script setup lang="ts">
import { computed } from 'vue'
import { useTags } from './useTags'

const { tags } = useTags()

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const tagEntries = computed(() => Object.entries(tags.value))
const tagNames = computed(() => Object.keys(tags.value))
</script>

<template>
  <div class="tags-page">
    <div class="tag-cloud">
      <span v-for="tag in tagNames" :key="tag" class="cloud-tag">
        {{ tag }}
        <span class="cloud-count">{{ tags[tag].length }}</span>
      </span>
    </div>

    <div v-for="[tag, posts] in tagEntries" :key="tag" class="tag-section">
      <h2 class="tag-name">{{ tag }}</h2>
      <ul class="tag-posts">
        <li v-for="post in posts" :key="post.url" class="tag-post-item">
          <a :href="post.url" class="tag-post-link">{{ post.title }}</a>
          <span class="tag-post-date">{{ formatDate(post.date) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 32px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
}

.cloud-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.cloud-count {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.tag-section {
  margin-bottom: 28px;
}

.tag-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.tag-posts {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tag-post-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed var(--vp-c-divider);
}

.tag-post-item:last-child {
  border-bottom: none;
}

.tag-post-link {
  color: var(--vp-c-text-1);
  text-decoration: none;
  font-size: 15px;
  transition: color 0.2s;
}

.tag-post-link:hover {
  color: var(--vp-c-brand-1);
}

.tag-post-date {
  font-size: 14px;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
  margin-left: 16px;
}

@media (max-width: 768px) {
  .tag-post-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .tag-post-date {
    margin-left: 0;
  }
}
</style>
