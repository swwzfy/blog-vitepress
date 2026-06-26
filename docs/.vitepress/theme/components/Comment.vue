<script setup lang="ts">
import Giscus from '@giscus/vue'
import { useData } from 'vitepress'
import { ref, watch, nextTick } from 'vue'

const { isDark, page } = useData()

const giscusConfig = {
  repo: 'swwzfy/blog-vitepress',
  repoId: 'R_kgDOTFnNyQ',
  category: 'Announcements',
  categoryId: 'DIC_kwDOTFnNyc4C_6e9',
}

const showComment = ref(true)

watch(() => page.value.relativePath, async () => {
  showComment.value = false
  await nextTick()
  showComment.value = true
})
</script>

<template>
  <div class="comment-section">
    <Giscus
      v-if="showComment"
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
    />
  </div>
</template>

<style scoped>
.comment-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
}

.comment-section :deep(iframe) {
  max-width: 100%;
}
</style>
