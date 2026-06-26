<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData, withBase } from 'vitepress'
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import Comment from './components/Comment.vue'

const { Layout } = DefaultTheme
const { frontmatter, page } = useData()

// 文章页检测
const isArticle = computed(() => !!frontmatter.value.date)

// 阅读时间 & 字数
const wordCount = ref(0)
const readingTime = ref(0)

function computeReadingTime() {
  nextTick(() => {
    const el = document.querySelector('.vp-doc')
    if (!el) return
    const text = el.textContent || ''
    const chinese = (text.match(/[一-鿿]/g) || []).length
    const english = (text.match(/[a-zA-Z]+/g) || []).length
    wordCount.value = chinese + english
    readingTime.value = Math.max(1, Math.ceil((chinese + english) / 300))
  })
}

// 相关文章
interface RelatedPost {
  title: string
  url: string
  date: string
  tags: string[]
}

const relatedPosts = ref<RelatedPost[]>([])
const postModules = import.meta.glob('../../posts/*.md', { eager: true })

function findRelated() {
  const currentTags: string[] = frontmatter.value.tags || []
  const currentPath = page.value.relativePath.replace(/\.md$/, '')

  if (!currentTags.length) {
    relatedPosts.value = []
    return
  }

  const posts: RelatedPost[] = []

  for (const [filePath, mod] of Object.entries(postModules)) {
    const data = (mod as any).__pageData
    if (!data) continue
    const relPath = filePath.replace(/^\.\.\/\.\.\//, '').replace(/\.md$/, '')
    if (relPath === currentPath) continue
    const tags: string[] = data.frontmatter?.tags || []
    if (!tags.some(t => currentTags.includes(t))) continue
    posts.push({
      title: data.title || '',
      url: withBase('/' + relPath),
      date: data.frontmatter?.date || '',
      tags
    })
  }

  relatedPosts.value = posts
    .sort((a, b) => {
      const aScore = a.tags.filter(t => currentTags.includes(t)).length
      const bScore = b.tags.filter(t => currentTags.includes(t)).length
      return bScore - aScore || new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    .slice(0, 3)
}

// 日期格式化
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 初始化 & 路由更新
function update() {
  if (!isArticle.value) return
  computeReadingTime()
  findRelated()
}

onMounted(update)
watch(() => page.value.relativePath, update)
</script>

<template>
  <Layout>
    <template #doc-before>
      <div v-if="isArticle" class="article-header">
        <button class="back-btn" onclick="history.back()">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5"></path>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>返回</span>
        </button>
        <div class="article-meta">
          <time class="meta-date">{{ formatDate(frontmatter.date) }}</time>
          <span class="meta-dot">·</span>
          <span class="meta-reading">{{ readingTime }} 分钟阅读</span>
          <span class="meta-dot">·</span>
          <span class="meta-words">{{ wordCount }} 字</span>
          <span class="meta-dot">·</span>
          <span class="meta-views">👁 <span id="busuanzi_value_page_pv">-</span> 次阅读</span>
        </div>
        <div v-if="frontmatter.tags?.length" class="article-tags">
          <span v-for="tag in frontmatter.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
      </div>
    </template>

    <template #doc-after>
      <div v-if="isArticle && relatedPosts.length" class="related-posts">
        <h3 class="related-title">相关文章</h3>
        <div class="related-grid">
          <a v-for="post in relatedPosts" :key="post.url" :href="post.url" class="related-card">
            <span class="related-date">{{ formatDate(post.date) }}</span>
            <span class="related-name">{{ post.title }}</span>
          </a>
        </div>
      </div>
      <Comment v-if="isArticle" />
    </template>

    <template #not-found>
      <div class="not-found-page">
        <div class="not-found">
          <div class="not-found-bg">
            <div class="floating-star" style="--delay: 0s; --x: 20%; --y: 30%;"></div>
            <div class="floating-star" style="--delay: 1s; --x: 70%; --y: 20%;"></div>
            <div class="floating-star" style="--delay: 2s; --x: 40%; --y: 60%;"></div>
            <div class="floating-star" style="--delay: 3s; --x: 80%; --y: 70%;"></div>
            <div class="floating-star" style="--delay: 4s; --x: 15%; --y: 80%;"></div>
            <div class="floating-star" style="--delay: 5s; --x: 60%; --y: 40%;"></div>
          </div>
          <div class="not-found-content">
            <div class="error-code">
              <span class="digit">4</span>
              <span class="digit">0</span>
              <span class="digit">4</span>
            </div>
            <h1 class="error-title">页面迷失在虚空中</h1>
            <p class="error-desc">
              你要找的页面可能已被移除、改名，或者从未存在过。
            </p>
            <div class="not-found-actions">
              <button class="back-button" onclick="history.back()">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 12H5"></path>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                返回上一页
              </button>
              <a href="/" class="home-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                返回首页
              </a>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #layout-bottom>
      <footer class="site-footer">
        <div class="site-stats">
          <span id="busuanzi_container_site_uv">访客 <span id="busuanzi_value_site_uv">-</span></span>
          <span class="stats-dot">·</span>
          <span id="busuanzi_container_site_pv">访问 <span id="busuanzi_value_site_pv">-</span></span>
        </div>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">苏ICP备2026040107号-1</a>
      </footer>
    </template>
  </Layout>
</template>
