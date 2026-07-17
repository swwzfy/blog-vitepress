<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { zhPosts, enPosts } from '@/utils/posts'
import { formatDate } from '@/utils/format'
import { useLocale } from '@/composables/useLocale'

const { Layout } = DefaultTheme
const { frontmatter, page } = useData()
const { t, isEn } = useLocale()

const isArticle = computed(() => !!frontmatter.value.date)

const wordCount = ref(0)
const readingTime = ref(0)

/** 阅读时长缓存，避免重复扫文 */
const readTimeCache = new Map<string, { words: number; minutes: number }>()

function computeReadingTime() {
  nextTick(() => {
    const el = document.querySelector('.vp-doc')
    if (!el) return
    const path = page.value.relativePath
    const cached = readTimeCache.get(path)
    if (cached) {
      wordCount.value = cached.words
      readingTime.value = cached.minutes
      return
    }
    const text = el.textContent || ''
    const chinese = (text.match(/[一-鿿]/g) || []).length
    const english = (text.match(/[a-zA-Z]+/g) || []).length
    const words = chinese + english
    const minutes = Math.max(1, Math.ceil(words / 300))
    readTimeCache.set(path, { words, minutes })
    wordCount.value = words
    readingTime.value = minutes
  })
}

interface RelatedPost {
  title: string
  url: string
  date: string
  tags: string[]
}

const relatedPosts = ref<RelatedPost[]>([])

function findRelated() {
  const currentTags: string[] = frontmatter.value.tags || []
  const currentPath = page.value.relativePath.replace(/\.md$/, '')
  if (!currentTags.length) {
    relatedPosts.value = []
    return
  }
  const source = isEn.value ? enPosts : zhPosts
  relatedPosts.value = source
    .filter(p => {
      const relPath = p.url.replace(/^\//, '').replace(/\/$/, '')
      return relPath !== currentPath && p.tags.some(tg => currentTags.includes(tg))
    })
    .sort((a, b) => {
      const aScore = a.tags.filter(tg => currentTags.includes(tg)).length
      const bScore = b.tags.filter(tg => currentTags.includes(tg)).length
      return bScore - aScore || new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    .slice(0, 3) as RelatedPost[]
}

function update() {
  if (!isArticle.value) return
  computeReadingTime()
  findRelated()
}

/** 通用后退入口：history 可用就用，否则回首页。 */
function goBack() {
  if (typeof window === 'undefined') return
  if (window.history.length > 1) window.history.back()
  else window.location.href = '/'
}

onMounted(update)
watch(() => page.value.relativePath, update)
</script>

<template>
  <Layout>
    <template #doc-before>
      <div v-if="isArticle" class="article-header">
        <button class="back-btn" @click="goBack">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5"></path>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>{{ t('back') }}</span>
        </button>
        <div class="article-meta">
          <time class="meta-date">{{ formatDate(frontmatter.date) }}</time>
          <span class="meta-dot">·</span>
          <span class="meta-reading">{{ readingTime }} {{ t('minRead') }}</span>
          <span class="meta-dot">·</span>
          <span class="meta-words">{{ wordCount }} {{ t('words') }}</span>
          <span class="meta-dot">·</span>
          <span class="meta-views">👁 <span id="busuanzi_value_page_pv">-</span> {{ t('reads') }}</span>
        </div>
        <div v-if="frontmatter.tags?.length" class="article-tags">
          <span v-for="tag in frontmatter.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
      </div>
    </template>

    <template #doc-after>
      <div v-if="isArticle && relatedPosts.length" class="related-posts">
        <h3 class="related-title">{{ t('relatedPosts') }}</h3>
        <div class="related-grid">
          <a v-for="post in relatedPosts" :key="post.url" :href="post.url" class="related-card">
            <span class="related-date">{{ formatDate(post.date) }}</span>
            <span class="related-name">{{ post.title }}</span>
          </a>
        </div>
      </div>
      <!-- <Comment v-if="isArticle" /> --> <!-- 评论功能已下线 -->
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
            <h1 class="error-title">{{ t('pageNotFound') }}</h1>
            <p class="error-desc">{{ t('pageNotFoundDesc') }}</p>
            <div class="not-found-actions">
              <button class="back-button" @click="goBack">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 12H5"></path>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                {{ t('backPrev') }}
              </button>
              <a href="/" class="home-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                {{ t('backHome') }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #layout-bottom>
      <footer class="site-footer">
        <div class="footer-landscape-wrap" aria-hidden="true">
          <img class="footer-landscape footer-landscape-light" src="/footer-landscape.webp" alt="" loading="lazy" />
          <img class="footer-landscape footer-landscape-dark" src="/footer-landscape-dark.webp" alt="" loading="lazy" />
        </div>

        <div class="footer-inner">
          <div class="footer-main">
            <div class="footer-brand">Kiran's Blog</div>
            <p class="footer-desc">{{ t('footerDesc') }}</p>
            <p class="footer-meta">
              © 2026 Kiran. {{ t('rights') }}<br />
              Powered by VitePress
            </p>
            <div class="site-stats">
              <span id="busuanzi_container_site_uv">{{ t('visit') }} <span id="busuanzi_value_site_uv">-</span></span>
              <span class="stats-dot">·</span>
              <span id="busuanzi_container_site_pv">{{ t('views') }} <span id="busuanzi_value_site_pv">-</span></span>
            </div>
          </div>

          <div class="footer-aside">
            <a v-if="isEn" href="/en/feed.rss">RSS</a>
            <a v-else href="/feed.rss">RSS</a>
            <span class="aside-dot">/</span>
            <a href="https://github.com/swwzfy" target="_blank" rel="noopener">GitHub</a>
            <span class="aside-dot">/</span>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">苏ICP备2026040107号-1</a>
          </div>
        </div>
      </footer>
    </template>
  </Layout>
</template>
