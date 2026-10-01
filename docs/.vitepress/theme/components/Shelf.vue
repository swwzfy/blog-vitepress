<script setup lang="ts">
import { computed } from 'vue'
import shelfData from '../../shelf.json'
import { useLocale } from '@/composables/useLocale'

/**
 * 书影音页：三栏卡片墙（书 / 影视 / 音乐）。
 * 数据源 docs/.vitepress/shelf.json —— status 是自带 zh/en 的双语数据对
 * （遵循字典边界约定：数据自带的双语不进 useLocale），
 * 加一条目 = json 里复制一段改文字，空栏目整栏隐藏。
 */
interface ShelfItem {
  title: string
  creator?: string
  status: { zh: string; en: string }
  rating?: number
  comment: string
  commentEn: string
}

interface ShelfData {
  books: ShelfItem[]
  movies: ShelfItem[]
  music: ShelfItem[]
}

const data = shelfData as ShelfData
const { isEn, t } = useLocale()

const sections = computed(() =>
  [
    { key: 'books', icon: '📚', label: t('shelfBooks'), tone: 'book', items: data.books },
    { key: 'movies', icon: '🎬', label: t('shelfMovies'), tone: 'film', items: data.movies },
    { key: 'music', icon: '🎵', label: t('shelfMusic'), tone: 'music', items: data.music }
  ].filter(s => s.items.length > 0)
)

function stars(rating?: number): string {
  if (!rating) return ''
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}
</script>

<template>
  <div class="shelf-page">
    <section v-for="section in sections" :key="section.key" class="shelf-section">
      <h2 class="shelf-heading">
        <span class="shelf-icon">{{ section.icon }}</span>
        {{ section.label }}
      </h2>
      <div class="shelf-grid">
        <article
          v-for="item in section.items"
          :key="item.title"
          class="shelf-card"
          :class="`tone-${section.tone}`"
        >
          <div class="shelf-card-top">
            <h3 class="shelf-title">{{ item.title }}</h3>
            <span class="shelf-status">{{ isEn ? item.status.en : item.status.zh }}</span>
          </div>
          <p v-if="item.creator" class="shelf-creator">{{ item.creator }}</p>
          <p class="shelf-comment">{{ isEn ? item.commentEn : item.comment }}</p>
          <span v-if="item.rating" class="shelf-stars" :aria-label="String(item.rating)">{{ stars(item.rating) }}</span>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.shelf-section {
  margin-bottom: var(--space-6);
}

.shelf-section:last-child {
  margin-bottom: 0;
}

.shelf-heading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-4);
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.shelf-icon {
  font-size: 22px;
  line-height: 1;
}

.shelf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-3);
}

.shelf-card {
  position: relative;
  padding: var(--space-4) var(--space-4) var(--space-4) calc(var(--space-4) + 4px);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  transition: border-color 0.25s, box-shadow 0.25s;
}

.shelf-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--shadow-card);
}

/* 左侧书脊色条：三个栏目各占品牌色板一角 */
.shelf-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 3px;
}

.tone-book::before {
  background: var(--vp-c-brand-1);
}

.tone-film::before {
  background: var(--vp-c-brand-3);
}

.tone-music::before {
  background: var(--vp-c-brand-2);
}

.shelf-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.shelf-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.5;
}

.shelf-status {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

.shelf-creator {
  margin: var(--space-1) 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.shelf-comment {
  margin: var(--space-2) 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.shelf-stars {
  margin-top: var(--space-2);
  font-size: 13px;
  letter-spacing: 2px;
  color: var(--vp-c-brand-2);
}

@media (max-width: 768px) {
  .shelf-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shelf-card {
    transition: none;
  }
}
</style>
