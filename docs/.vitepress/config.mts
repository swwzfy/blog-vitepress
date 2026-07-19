import { defineConfig } from 'vitepress'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const hostname = 'https://www.jossecho.com'

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
      head: [
        ['meta', { property: 'og:image', content: hostname + '/og-en.png' }],
        ['meta', { property: 'og:image:width', content: '1200' }],
        ['meta', { property: 'og:image:height', content: '630' }],
        ['meta', { name: 'twitter:image', content: hostname + '/og-en.png' }],
        ['meta', { property: 'og:description', content: 'Indie Developer · Writer · Lifelong Learner' }],
        ['meta', { name: 'twitter:description', content: 'Indie Developer · Writer · Lifelong Learner' }]
      ],
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
    // 给 dev / preview 的 RSS 与 HTML 预览补 Content-Type charset。
    // 多数 reader 优先看 HTTP 头而不是 XML prolog，缺 charset 在中文 Windows 上会乱码。
    plugins: [
      {
        name: 'rss-charset-headers',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/feed.rss' || req.url === '/en/feed.rss') {
              res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
            } else if (req.url === '/feed-preview.html' || req.url === '/en/feed-preview.html') {
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
            }
            next()
          })
        },
        configurePreviewServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/feed.rss' || req.url === '/en/feed.rss') {
              res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
            } else if (req.url === '/feed-preview.html' || req.url === '/en/feed-preview.html') {
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
            }
            next()
          })
        }
      }
    ],
    resolve: {
      alias: {
        '@': resolve(process.cwd(), 'docs/.vitepress/theme')
      }
    }
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap', rel: 'stylesheet' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: "Kiran's Blog" }],
    ['meta', { property: 'og:description', content: '独立开发者 · 写作者 · 终身学习者' }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],
    ['meta', { property: 'og:image', content: hostname + '/og.png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:image', content: hostname + '/og.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    // i18n SEO：每个语种首页互链，x-default 指向中文
    ['link', { rel: 'alternate', hreflang: 'zh-CN', href: hostname + '/' }],
    ['link', { rel: 'alternate', hreflang: 'en', href: hostname + '/en/' }],
    ['link', { rel: 'alternate', hreflang: 'x-default', href: hostname + '/' }],
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

    // RSS 双语：自写 build-rss.js 替代 vitepress-plugin-rss（0.4.4 locales bug）
    // esbuild 编译 config 后 import.meta.url 指向临时 .mjs，导致 '../scripts' 路径偏移。
    // 用 process.cwd() 拼绝对路径稳定；createRequire 把 cwd 包成 require 入口。
    const { createRequire } = await import('module')
    const cwdRequire = createRequire(resolve(process.cwd(), 'index.js'))
    const { buildRss } = cwdRequire('./scripts/build-rss.js')
    await buildRss(siteConfig)

    // 把生成的 RSS / HTML 预览镜像一份到 docs/public/，dev mode 下 VitePress 默认会 serve public/
    // 解决 dev mode 访问 /feed.rss / /feed.html 报 404 的问题
    // outDir 默认是 docs/.vitepress/dist，publicDir 默认是 docs/public/
    const { copyFileSync, mkdirSync } = await import('node:fs')
    const { dirname, relative } = await import('node:path')
    const PROJECT_ROOT_DOCS = resolve(siteConfig.outDir, '..', '..')
    const PUBLIC_DIR = resolve(PROJECT_ROOT_DOCS, 'public')
    const files = ['feed.rss', 'en/feed.rss', 'feed-preview.html', 'en/feed-preview.html']
    for (const rel of files) {
      const srcPath = resolve(siteConfig.outDir, rel)
      const destPath = resolve(PUBLIC_DIR, rel)
      mkdirSync(dirname(destPath), { recursive: true })
      copyFileSync(srcPath, destPath)
      console.log(`  mirrored ${rel} -> ${relative(PROJECT_ROOT_DOCS, destPath)}`)
    }
  },
  themeConfig: {
    search: {
      provider: 'local'
    },
    socialLinks: [
      { icon: 'rss', link: '/feed.rss', ariaLabel: 'RSS Feed' },
      { icon: 'github', link: 'https://github.com/swwzfy' },
      {
        icon: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" fill="none"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" fill="none"/></svg>'
        },
        link: 'mailto:swwzfy@163.com',
        ariaLabel: 'Email'
      }
    ]
    // footer 配置已移除：用 #layout-bottom 自定义
  }
})
