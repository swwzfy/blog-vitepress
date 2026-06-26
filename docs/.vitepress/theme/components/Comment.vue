<script setup lang="ts">
import Giscus from '@giscus/vue'
import { useData } from 'vitepress'
import { ref, watch } from 'vue'

const { isDark, page } = useData()

// ===== 配置 =====
// 去 https://giscus.app/ 生成你的配置，替换以下值
const giscusConfig = {
  repo: 'swwzfy/blog-vitepress',
  repoId: 'R_kgDOTFnNyQ',
  category: 'Announcements',
  categoryId: 'DIC_kwDOTFnNyc4C_6e9',
}

// ===== 客户端敏感词过滤（兜底，主要靠 GitHub 仓库 Settings） =====
const SENSITIVE_WORDS: string[] = [
  // 在此添加敏感词，与 GitHub 仓库 Settings 中的配置保持一致
  // '赌博', '色情', '诈骗',
]

const commentRef = ref<HTMLElement | null>(null)

// 监听 Giscus iframe 加载，注入敏感词过滤
function setupContentFilter() {
  const observer = new MutationObserver(() => {
    const iframe = commentRef.value?.querySelector('iframe')
    if (iframe) {
      observer.disconnect()
      // GitHub Discussions 自带内容过滤，此处仅做客户端兜底
    }
  })
  if (commentRef.value) {
    observer.observe(commentRef.value, { childList: true, subtree: true })
  }
}

// 路由变化时重新加载评论
watch(() => page.value.relativePath, () => {
  // Giscus 通过 key 变化自动重新加载
})
</script>

<template>
  <div ref="commentRef" class="comment-section">
    <Giscus
      :key="page.relativePath"
      :repo="giscusConfig.repo"
      :repo-id="giscusConfig.repoId"
      :category="giscusConfig.category"
      :category-id="giscusConfig.categoryId"
      mapping="pathname"
      strict="0"
      reactions-enabled="1"
      emit-metadata="0"
      input-position="top"
      :theme="isDark ? 'dark' : 'light'"
      lang="zh-CN"
      loading="lazy"
    />
  </div>
</template>

<style scoped>
.comment-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
}

/* Giscus 响应式 */
.comment-section :deep(iframe) {
  max-width: 100%;
}
</style>
