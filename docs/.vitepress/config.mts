import { defineConfig } from 'vitepress'
import { writeFileSync, readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

const hostname = 'https://www.jossecho.com'

// —— 构建期全站字数统计 ——
// Node 侧直接扫 posts 目录，经 vite define 注入为编译期常量（不进客户端 bundle）。
// 口径与 Layout.vue 阅读时长一致：中文字符数 + 英文单词数；draft 页不计入。
function countWords(dir: string): number {
  let total = 0
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.md')) continue
    const raw = readFileSync(resolve(dir, name), 'utf-8')
    const fmEnd = raw.indexOf('\n---', 3)
    const frontmatter = fmEnd > 0 ? raw.slice(0, fmEnd) : ''
    if (/^draft:\s*true\s*$/m.test(frontmatter)) continue
    const body = fmEnd > 0 ? raw.slice(fmEnd + 4) : raw
    const chinese = (body.match(/[一-鿿]/g) || []).length
    const english = (body.match(/[a-zA-Z]+/g) || []).length
    total += chinese + english
  }
  return total
}

const SITE_WORDS = {
  zh: countWords(resolve(process.cwd(), 'docs/posts')),
  en: countWords(resolve(process.cwd(), 'docs/en/posts'))
}

// —— 构建期排除草稿页 ——
// VitePress 不认 frontmatter.draft，只能靠 srcExclude 挡在路由外。
// 手写文件名会漏：新增草稿时没人记得同步，页面就直接上线，而且不进 sitemap /
// 列表 / RSS，反而更难被发现。所以扫目录动态生成，判定口径与 countWords 一致。
function draftExcludes(): string[] {
  const patterns: string[] = []
  const dirs: Array<[string, string]> = [['docs/posts', 'posts'], ['docs/en/posts', 'en/posts']]
  for (const [dir, prefix] of dirs) {
    const abs = resolve(process.cwd(), dir)
    for (const name of readdirSync(abs)) {
      if (!name.endsWith('.md')) continue
      const raw = readFileSync(resolve(abs, name), 'utf-8')
      const fmEnd = raw.indexOf('\n---', 3)
      const frontmatter = fmEnd > 0 ? raw.slice(0, fmEnd) : ''
      if (/^draft:\s*true\s*$/m.test(frontmatter)) patterns.push(`**/${prefix}/${name}`)
    }
  }
  return patterns
}

// 社交链接：RSS 入口必须按语种分开 —— 英文站此前一律指向中文 /feed.rss，
// 而 /en/feed.rss 早就由 buildRss 生成好了。github / email 两种语言一致，
// 用工厂函数避免两处重复维护。
// 注意放在 locale.themeConfig 里而不是顶层：顶层会同时作用于两个语种。
function makeSocialLinks(rssHref: string) {
  return [
    { icon: 'rss', link: rssHref, ariaLabel: 'RSS Feed' },
    { icon: 'github', link: 'https://github.com/swwzfy' },
    {
      icon: {
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" fill="none"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" fill="none"/></svg>'
      },
      link: 'mailto:swwzfy@163.com',
      ariaLabel: 'Email'
    }
  ]
}

export default defineConfig({
  title: "Kiran's Blog",
  description: '独立开发者 · 写作者 · 终身学习者',
  lang: 'zh-CN',
  // 顶层开关：VPDocFooter 靠 page.lastUpdated 才渲染"最后更新"，
  // themeConfig.lastUpdated 只是 label，缺这个开关时间戳永远不出数
  lastUpdated: true,
  locales: {
    root: {
      label: '中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '文章', link: '/archives' },
          { text: '项目', link: '/projects' },
          { text: '生活', link: '/life' },
          { text: '书影音', link: '/shelf' },
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
        },
        socialLinks: makeSocialLinks('/feed.rss')
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
          { text: 'Life', link: '/en/life' },
          { text: 'Shelf', link: '/en/shelf' },
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
        },
        socialLinks: makeSocialLinks('/en/feed.rss')
      }
    }
  },
  vite: {
    define: {
      __SITE_WORDS__: JSON.stringify(SITE_WORDS)
    },
    // 给 dev / preview 的 RSS 与 HTML 预览补 Content-Type charset。
    // 多数 reader 优先看 HTTP 头而不是 XML prolog，缺 charset 在中文 Windows 上会乱码。
    plugins: [
      // 构建期聚合友链 RSS（借鉴 Leelaa 的「圈子」页）：
      // FriendsLinks.vue eager import 生成的 friends-activity.json，
      // 所以必须在编译开始前完成抓取 —— 挂在 vite buildStart 而不是 buildEnd。
      // 抓取失败不阻塞构建（脚本内部保留旧缓存兜底）
      {
        name: 'friends-activity',
        async buildStart() {
          const { createRequire } = await import('module')
          const cwdRequire = createRequire(resolve(process.cwd(), 'index.js'))
          await cwdRequire('./scripts/build-friends-activity.js').refreshFriendsActivity()
        }
      },
      {
        name: 'rss-charset-headers',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/feed.rss' || req.url === '/en/feed.rss') {
              res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
            } else if (req.url === '/feed.html' || req.url === '/en/feed.html') {
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
            }
            next()
          })
        },
        configurePreviewServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/feed.rss' || req.url === '/en/feed.rss') {
              res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
            } else if (req.url === '/feed.html' || req.url === '/en/feed.html') {
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
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' }],
    // JetBrains Mono 改 @fontsource 自托管（theme/index.ts 引入）：Google Fonts 大陆不可达，
    // 样式表请求失败会拖慢首屏；Inter 全站无引用已移除（9 个字重纯死重）
    // 展示字：霞鹜文楷屏幕版，unicode-range 分片 + font-display: swap，浏览器只拉用到的字块
    // 展示字：霞鹜文楷屏幕版，unicode-range 分片 + font-display: swap，浏览器只拉用到的字块。
    // 整包 19.7MB 不宜进仓库与产物，保留 jsDelivr；不可达时降级系统字体（swap 兜底）
    ['link', { href: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-webfont@1.7.0/lxgwwenkaiscreen.css', rel: 'stylesheet' }],
    ['meta', { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' }],
    ['meta', { name: 'theme-color', content: '#1b1b1f', media: '(prefers-color-scheme: dark)' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: "Kiran's Blog" }],
    ['meta', { property: 'og:description', content: '独立开发者 · 写作者 · 终身学习者' }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],
    ['meta', { property: 'og:image', content: hostname + '/og.png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:image', content: hostname + '/og.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    // i18n SEO 的 hreflang 改由 buildEnd 逐页注入（scripts/build-seo.js），
    // 指向对应语种的同一页面，而不是全站一律指向首页
    ['meta', { name: 'twitter:title', content: "Kiran's Blog" }],
    ['meta', { name: 'twitter:description', content: '独立开发者 · 写作者 · 终身学习者' }]
  ],
  async buildEnd(siteConfig) {
    const { createRequire } = await import('module')
    const cwdRequire = createRequire(resolve(process.cwd(), 'index.js'))
    const { buildRss } = cwdRequire('./scripts/build-rss.js')
    const seo = cwdRequire('./scripts/build-seo.js')

    // 逐页 frontmatter 元信息：sitemap 过滤 draft 与每页 head 注入共用一份。
    // draft 页面若忘了加 srcExclude 仍会被构建进路由，这里从 sitemap 侧兜底排除。
    const pageMeta = seo.loadPageMeta(siteConfig)
    const { SitemapStream, streamToPromise } = await import('sitemap')
    const sitemap = new SitemapStream({ hostname })
    const pages = siteConfig.pages
      .filter(page => !pageMeta.get(page)?.draft)
      .map(page => {
      // pages 是相对路径且以 .md 结尾（如 'posts/x.md'）；.html 分支防御未来变化。
      // URL 无后缀，与 RSS 里的链接惯例一致（nginx 侧做去后缀解析）
      const url = page.replace(/index\.(md|html)$/, '').replace(/\.(md|html)$/, '')
      return { url: url === '' ? '/' : `/${url}`, changefreq: 'weekly' }
    })
    pages.forEach(page => sitemap.write(page))
    sitemap.end()
    const data = await streamToPromise(sitemap)
    writeFileSync(resolve(siteConfig.outDir, 'sitemap.xml'), data.toString())

    // RSS 双语：自写 build-rss.js 替代 vitepress-plugin-rss（0.4.4 locales bug）
    // esbuild 编译 config 后 import.meta.url 指向临时 .mjs，导致 '../scripts' 路径偏移。
    // 用 process.cwd() 拼绝对路径稳定；createRequire 把 cwd 包成 require 入口。
    await buildRss(siteConfig)

    // 每页 og:title/description/url、canonical、article:*、og:locale、逐页 hreflang 注入
    seo.injectSeo(siteConfig, pageMeta)

    // 把生成的 RSS / HTML 预览镜像一份到 docs/public/，dev mode 下 VitePress 默认会 serve public/
    // 解决 dev mode 访问 /feed.rss / /feed.html 报 404 的问题
    // outDir 默认是 docs/.vitepress/dist，publicDir 默认是 docs/public/
    const { copyFileSync, mkdirSync } = await import('node:fs')
    const { dirname, relative } = await import('node:path')
    const PROJECT_ROOT_DOCS = resolve(siteConfig.outDir, '..', '..')
    const PUBLIC_DIR = resolve(PROJECT_ROOT_DOCS, 'public')
    const files = ['feed.rss', 'en/feed.rss', 'feed.html', 'en/feed.html']
    for (const rel of files) {
      const srcPath = resolve(siteConfig.outDir, rel)
      const destPath = resolve(PUBLIC_DIR, rel)
      mkdirSync(dirname(destPath), { recursive: true })
      copyFileSync(srcPath, destPath)
      console.log(`  mirrored ${rel} -> ${relative(PROJECT_ROOT_DOCS, destPath)}`)
    }
  },
  // VitePress 不会自动排除 draft: true 的页面 —— 设 srcExclude 让它不进入路由表。
  // 原来的硬编码文件名会漏掉新增草稿，现在由 draftExcludes() 扫 frontmatter 生成。
  // 列表组件（Archives/Tags/LifeList 等）扫的是 src/posts/*.md，不走路由，
  // 所以 build-rss.js 里还按 frontmatter.draft 再过滤一次。
  srcExclude: draftExcludes(),
  themeConfig: {
    logo: '/logo.svg',
    search: {
      provider: 'local',
      options: {
        // 本地搜索弹层默认英文兜底（源码 fallback 'Search'），中文 locale 需显式翻译；en 用默认
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
              modal: {
                displayDetails: '显示详细列表',
                resetButtonTitle: '清除查询条件',
                backButtonTitle: '关闭搜索',
                noResultsText: '未找到相关结果',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
              }
            }
          }
        }
      }
    },
    // socialLinks 下放到各 locale：RSS 入口按语种不同，见 makeSocialLinks
    // footer 配置已移除：用 #layout-bottom 自定义
  }
})
