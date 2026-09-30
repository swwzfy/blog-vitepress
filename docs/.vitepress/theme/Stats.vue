<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { zhPosts, enPosts } from '@/utils/posts'
import { useLocale } from '@/composables/useLocale'

// 构建期在 config.mts 里扫稿统计、vite define 注入的字数常量
declare const __SITE_WORDS__: { zh: number; en: number }

const { isEn, t } = useLocale()

const stats = computed(() => {
  const posts = isEn.value ? enPosts : zhPosts
  const tagSet = new Set<string>()
  for (const post of posts) {
    for (const tag of post.tags) tagSet.add(tag)
  }
  return {
    posts: posts.length,
    tags: tagSet.size,
    words: isEn.value ? __SITE_WORDS__.en : __SITE_WORDS__.zh
  }
})

// 本月更新（借鉴糖的博客 sugarat.top 统计卡的更新节奏展示）。
// 「当前月份」是运行时事实，SSG 期不知道访客的时钟 —— 与时钟卡同套路，onMounted 再算
const now = ref<Date | null>(null)
onMounted(() => {
  now.value = new Date()
})
const monthly = computed(() => {
  if (!now.value) return null
  const posts = isEn.value ? enPosts : zhPosts
  return posts.filter(p => {
    if (!p.date) return false
    const d = new Date(p.date)
    return d.getFullYear() === now.value!.getFullYear() && d.getMonth() === now.value!.getMonth()
  }).length
})
</script>

<template>
  <div class="stats">
    <div class="stat-item">
      <span class="stat-number">{{ stats.posts }}</span>
      <span class="stat-label">{{ t('statPosts') }}</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <span class="stat-number">{{ stats.tags }}</span>
      <span class="stat-label">{{ t('statTags') }}</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <span class="stat-number">{{ stats.words.toLocaleString() }}</span>
      <span class="stat-label">{{ t('statWords') }}</span>
    </div>
    <template v-if="monthly !== null">
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-number">+{{ monthly }}</span>
        <span class="stat-label">{{ t('statThisMonth') }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  flex-wrap: wrap;
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
    gap: 20px 24px;
    padding: 20px;
  }
  .stat-number {
    font-size: 28px;
  }
  .stat-divider {
    display: none;
  }
}
</style>
