<script setup lang="ts">
import { computed } from 'vue'
import { useTags } from '@/useTags'
import { formatDate } from '@/utils/format'

const { tags } = useTags()

/**
 * 词云视图：分组按篇数降序排，字号/浓度随篇数缩放；
 * 云里的标签是锚点，点击跳到下方对应分组。
 */
const tagEntries = computed(() =>
  Object.entries(tags.value)
    .map(([tag, posts]) => ({ tag, posts }))
    .sort((a, b) => b.posts.length - a.posts.length)
)

const minCount = computed(() => {
  const counts = tagEntries.value.map(e => e.posts.length)
  return counts.length ? Math.min(...counts) : 0
})

const maxCount = computed(() => {
  const counts = tagEntries.value.map(e => e.posts.length)
  return counts.length ? Math.max(...counts) : 0
})

function tagSize(count: number): string {
  const span = maxCount.value - minCount.value || 1
  return `${14 + Math.round(((count - minCount.value) / span) * 12)}px`
}

function tagOpacity(count: number): number {
  const span = maxCount.value - minCount.value || 1
  return 0.6 + ((count - minCount.value) / span) * 0.4
}
</script>

<template>
  <div class="tags-page">
    <div class="tag-cloud">
      <a
        v-for="(entry, idx) in tagEntries"
        :key="entry.tag"
        class="cloud-tag"
        :href="`#tag-${idx}`"
        :style="{ fontSize: tagSize(entry.posts.length), '--cloud-o': tagOpacity(entry.posts.length) }"
      >
        {{ entry.tag }}
        <span class="cloud-count">{{ entry.posts.length }}</span>
      </a>
    </div>

    <div v-for="(entry, idx) in tagEntries" :id="`tag-${idx}`" :key="entry.tag" class="tag-section">
      <h2 class="tag-name">
        {{ entry.tag }}
        <span class="tag-name-count">{{ entry.posts.length }}</span>
      </h2>
      <ul class="tag-posts">
        <li v-for="post in entry.posts" :key="post.url" class="tag-post-item">
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
  align-items: baseline;
  gap: 6px 18px;
  margin-bottom: 32px;
  padding: 20px 24px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--radius-card);
}

.cloud-tag {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  color: var(--vp-c-brand-1);
  font-weight: 600;
  line-height: 1.6;
  text-decoration: none;
  opacity: var(--cloud-o, 1);
  transition: color 0.2s, opacity 0.2s;
}

.cloud-tag:hover {
  color: var(--vp-c-brand-2);
  opacity: 1;
}

.cloud-count {
  font-size: 11px;
  font-weight: 400;
  color: var(--vp-c-text-3);
}

.tag-section {
  margin-bottom: 28px;
  /* 锚点跳转时给吸顶导航留出空间 */
  scroll-margin-top: calc(var(--vp-nav-height) + 16px);
}

.tag-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.tag-name-count {
  font-size: 13px;
  font-weight: 400;
  color: var(--vp-c-text-3);
  margin-left: 6px;
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
  .tag-cloud {
    gap: 4px 14px;
    padding: 16px;
  }

  .tag-post-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .tag-post-date {
    margin-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cloud-tag,
  .tag-post-link {
    transition: none;
  }
}
</style>
