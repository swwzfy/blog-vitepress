/**
 * buildEnd 的 SEO 后处理（config.mts 调用）：
 *   loadPageMeta(siteConfig)        读每个待构建页的 frontmatter（title/date/description/draft）
 *   injectSeo(siteConfig, pageMeta) 对 dist 逐页 HTML 注入：
 *     og:title / og:description / og:url / canonical / article:published_time（posts）
 *     og:type=article（posts）/ og:locale（en 页把全站 zh_CN 纠正为 en_US）
 *     twitter:title / twitter:description / zh↔en 逐页 hreflang
 *
 * VitePress 1.6 的 og:* 是 config head 里的全站静态值，分享出去的卡片每页长一个样；
 * hreflang 若写在全站 head 里只能指向首页，对内页是错的。这里在产物上做替换/补齐。
 * 用 CJS（package.json 没声明 "type": "module"）兼容 esbuild config resolver，与 build-rss.js 同理。
 */
const fs = require('node:fs')
const path = require('node:path')
const matter = require('gray-matter')

const HOSTNAME = 'https://www.jossecho.com'
const SITE_TITLE = "Kiran's Blog"

/** 与 config.mts sitemap 同一套 URL 规则：无后缀，index 折叠成目录根 */
function pageUrl(page) {
  const url = page.replace(/index\.(md|html)$/, '').replace(/\.(md|html)$/, '')
  return url === '' ? '/' : `/${url}`
}

function loadPageMeta(siteConfig) {
  const meta = new Map()
  for (const page of siteConfig.pages) {
    let fm = {}
    try {
      fm = matter(fs.readFileSync(path.resolve(siteConfig.srcDir, page), 'utf8')).data || {}
    } catch {
      // frontmatter 读不到时 injectSeo 会退回解析产物 HTML，此处不中断构建
    }
    meta.set(page, { title: fm.title, description: fm.description, date: fm.date, draft: fm.draft === true })
  }
  return meta
}

function unescapeHtml(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function injectSeo(siteConfig, pageMeta) {
  let injected = 0
  for (const [page, info] of pageMeta) {
    const htmlPath = path.resolve(siteConfig.outDir, page.replace(/\.md$/, '.html'))
    if (!fs.existsSync(htmlPath)) continue
    let html = fs.readFileSync(htmlPath, 'utf8')

    // 标题/描述：frontmatter 优先；about/tags 等静态页常没有，退回解析产物。
    // 产物 <title> 是 "<页名> | Kiran's Blog"，og:title 只取管道前半段。
    const fullTitle = info.title || unescapeHtml((html.match(/<title>([^<]*)<\/title>/) || [])[1] || SITE_TITLE)
    const ogTitle = fullTitle.includes(' | ') ? fullTitle.slice(0, fullTitle.lastIndexOf(' | ')) : fullTitle
    const desc = info.description || (html.match(/<meta name="description" content="([^"]*)">/) || [])[1] || ''

    const isEn = page.startsWith('en/')
    const isPost = /(^|\/)posts\//.test(page)
    const url = HOSTNAME + pageUrl(page)

    // callback 形式防替换串里的 $ 序列被当成特殊模式
    const swap = (re, value) => {
      html = html.replace(re, () => value)
    }
    swap(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeAttr(ogTitle)}">`)
    swap(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeAttr(desc)}">`)
    swap(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeAttr(ogTitle)}">`)
    swap(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeAttr(desc)}">`)
    // og:locale 是 head 里的全站值，en 页纠正
    if (isEn) swap(/<meta property="og:locale" content="zh_CN">/, '<meta property="og:locale" content="en_US">')
    if (isPost) swap(/<meta property="og:type" content="website">/, '<meta property="og:type" content="article">')

    const extra = [`<link rel="canonical" href="${url}">`, `<meta property="og:url" content="${url}">`]
    if (isPost && info.date) {
      extra.push(`<meta property="article:published_time" content="${new Date(info.date).toISOString()}">`)
    }
    // zh↔en 逐页互链；对面语种是 draft（未上线）就不输出该 hreflang
    const zhPage = isEn ? page.slice(3) : page
    const enPage = isEn ? page : 'en/' + page
    const zhMeta = pageMeta.get(zhPage)
    const enMeta = pageMeta.get(enPage)
    if (zhMeta && !zhMeta.draft) {
      extra.push(`<link rel="alternate" hreflang="zh-CN" href="${HOSTNAME + pageUrl(zhPage)}">`)
      extra.push(`<link rel="alternate" hreflang="x-default" href="${HOSTNAME + pageUrl(zhPage)}">`)
    }
    if (enMeta && !enMeta.draft) {
      extra.push(`<link rel="alternate" hreflang="en" href="${HOSTNAME + pageUrl(enPage)}">`)
    }

    fs.writeFileSync(htmlPath, html.replace('</head>', extra.join('\n') + '\n</head>'))
    injected++
  }
  console.log(`  build-seo: per-page head injected into ${injected} pages`)
}

module.exports = { loadPageMeta, injectSeo }
