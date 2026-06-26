import { defineConfig } from 'vitepress'
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { RSSOptions, RssPlugin } from 'vitepress-plugin-rss'

const hostname = 'https://www.jossecho.com'

const RSS: RSSOptions = {
  title: "Kiran's Blog",
  baseUrl: hostname,
  copyright: `Copyright (c) 2026-present, Kiran`,
  description: '独立开发者 · 写作者 · 终身学习者',
  language: 'zh-CN',
}

export default defineConfig({
  title: "Kiran's Blog",
  description: '独立开发者 · 写作者 · 终身学习者',
  lang: 'zh-CN',
  locales: {
    root: {
      label: '中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '文章', link: '/archives' },
          { text: '项目', link: '/projects' },
          { text: '标签', link: '/tags' },
          { text: '时间线', link: '/timeline' },
          { text: '友链', link: '/friends' },
          { text: '关于', link: '/about' }
        ],
        outline: {
          level: [2, 3],
          label: '目录'
        },
        lastUpdated: {
          text: '最后更新'
        },
        docFooter: {
          prev: '上一篇',
          next: '下一篇'
        }
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      title: "Kiran's Blog",
      description: 'Indie Developer · Writer · Lifelong Learner',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Articles', link: '/en/archives' },
          { text: 'Projects', link: '/en/projects' },
          { text: 'Tags', link: '/en/tags' },
          { text: 'Timeline', link: '/en/timeline' },
          { text: 'Friends', link: '/en/friends' },
          { text: 'About', link: '/en/about' }
        ],
        outline: {
          level: [2, 3],
          label: 'On this page'
        },
        lastUpdated: {
          text: 'Last Updated'
        },
        docFooter: {
          prev: 'Previous',
          next: 'Next'
        }
      }
    }
  },
  vite: {
    plugins: [RssPlugin(RSS)]
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap', rel: 'stylesheet' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: "Kiran's Blog" }],
    ['meta', { property: 'og:description', content: '独立开发者 · 写作者 · 终身学习者' }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: "Kiran's Blog" }],
    ['meta', { name: 'twitter:description', content: '独立开发者 · 写作者 · 终身学习者' }],
    ['script', { async: '', src: '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js' }]
  ],
  async buildEnd(siteConfig) {
    const { SitemapStream, streamToPromise } = await import('sitemap')
    const sitemap = new SitemapStream({ hostname })
    const pages = siteConfig.pages.map(page => {
      const url = page.replace(/index\.html$/, '').replace(/\.html$/, '')
      return { url: url === 'index' ? '/' : `/${url}`, changefreq: 'weekly' }
    })
    pages.forEach(page => sitemap.write(page))
    sitemap.end()
    const data = await streamToPromise(sitemap)
    writeFileSync(resolve(siteConfig.outDir, 'sitemap.xml'), data.toString())
  },
  themeConfig: {
    search: {
      provider: 'local'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: '© 2026 Kiran'
    }
  }
})
