/**
 * Generate two RSS feeds at build time:
 *   dist/feed.rss       — 中文版（独立开发者 · 写作者 · 终身学习者）
 *   dist/en/feed.rss    — 英文版（Indie Developer · Writer · Lifelong Learner）
 *
 * 替代 vitepress-plugin-rss（0.4.4 的 locales 字段不会拆出独立文件）。
 * 用 CJS（package.json 没声明 "type": "module"）兼容 esbuild config resolver。
 */
const fs = require('node:fs')
const path = require('node:path')
const { Feed } = require('feed')
const matter = require('gray-matter')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const ZH_POSTS_DIR = path.join(PROJECT_ROOT, 'docs/posts')
const EN_POSTS_DIR = path.join(PROJECT_ROOT, 'docs/en/posts')
const HOSTNAME = 'https://www.jossecho.com'
const COPYRIGHT = 'Copyright (c) 2026-present, Kiran'
const LIMIT = 20

function loadPosts(dir, urlPrefix) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf-8')
      const { data } = matter(raw)
      const slug = f.replace(/\.md$/, '')
      return {
        title: data.title || slug,
        description: data.description || '',
        date: data.date ? new Date(data.date) : new Date(),
        url: '/' + urlPrefix + '/' + slug,
        tags: Array.isArray(data.tags) ? data.tags : []
      }
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, LIMIT)
}

/**
 * 从 dist/posts/<slug>.html 已经渲染好的页面里抽出 <main> 内 vp-doc 区域 HTML，
 * 作为 RSS `<content:encoded>`，让阅读器订阅能看到完整正文。
 * VitePress 1.6 default cleanUrls: false，路径是 <slug>.html。
 */
function extractArticleHtml(distDir, slug) {
  const htmlPath = path.join(distDir, slug + '.html')
  if (!fs.existsSync(htmlPath)) return ''
  const raw = fs.readFileSync(htmlPath, 'utf-8')
  // vp-doc 是文章正文容器；用 main 闭合作为 vp-doc 结束标记（vp-doc 在 main 内先闭合）
  const m = raw.match(/<div[^>]*\bvp-doc\b[^>]*>([\s\S]*?)<\/main>/)
  if (!m) return ''
  return m[1]
    // 剥掉 RSS 阅读器用不到的 VitePress 内部 span（如 vpi-* 图标）
    .replace(/<span[^>]*class="vpi-[^"]*"[^>]*>\s*<\/span>/g, '')
    .trim()
}

function buildOne({ outDir, out, title, description, language, posts }) {
  const rssUrl = HOSTNAME + '/' + out
  const homeUrl = HOSTNAME + (out.startsWith('en/') ? '/en/' : '/')

  const feed = new Feed({
    title,
    description,
    id: homeUrl,
    link: homeUrl,
    language,
    copyright: COPYRIGHT,
    generator: 'custom-build-rss',
    feedLinks: { rss: rssUrl },
    author: { name: 'Kiran', link: HOSTNAME + '/' }
  })

  for (const post of posts) {
    // post.url: '/posts/...' (zh) or '/en/posts/...' (en) —— 去掉前导 '/' 即可
    // 既包含 locale 前缀又包含 path 子目录，两种语言走相同的 dist 路径模式
    const slug = post.url.replace(/^\//, '')
    const html = extractArticleHtml(outDir, slug)
    feed.addItem({
      title: post.title,
      id: HOSTNAME + post.url,
      link: HOSTNAME + post.url,
      description: post.description,
      content: html, // 喂给 feed 后会自动输出 <content:encoded>
      date: post.date,
      author: [{ name: 'Kiran', link: HOSTNAME + '/' }],
      category: post.tags.map(t => ({ name: t }))
    })
  }

  return { xml: feed.rss2(), out, count: posts.length }
}

async function buildRss(siteConfig) {
  const variants = [
    {
      out: 'feed.rss',
      htmlOut: 'feed-preview.html',
      title: "Kiran's Blog",
      description: '独立开发者 · 写作者 · 终身学习者',
      language: 'zh-CN',
      homeUrl: HOSTNAME + '/',
      posts: loadPosts(ZH_POSTS_DIR, 'posts')
    },
    {
      out: 'en/feed.rss',
      htmlOut: 'en/feed-preview.html',
      title: "Kiran's Blog",
      description: 'Indie Developer · Writer · Lifelong Learner',
      language: 'en-US',
      homeUrl: HOSTNAME + '/en/',
      posts: loadPosts(EN_POSTS_DIR, 'en/posts')
    }
  ]

  for (const v of variants) {
    const { xml, count, out, htmlOut } = {
      ...buildOne({ ...v, outDir: siteConfig.outDir }),
      out: v.out,
      htmlOut: v.htmlOut
    }
    // 不再注入 XSL PI：浏览器对 application/rss+xml MIME 处理 XSL 不稳定，
    // 改用同目录的 .html 静态预览页（v.htmlOut）给浏览器订阅器以外的用户。
    const rssPath = path.join(siteConfig.outDir, out)
    fs.mkdirSync(path.dirname(rssPath), { recursive: true })
    fs.writeFileSync(rssPath, xml, 'utf-8')
    console.log(`🎉 RSS generated ${out}`)
    console.log(`  filepath: ${rssPath}`)
    console.log(`  url: ${HOSTNAME}/${out}`)
    console.log(`  included ${count} posts`)

    // HTML 预览：浏览器看到的纯 HTML，中文不会乱码
    const html = buildHtmlPreview(v)
    const htmlPath = path.join(siteConfig.outDir, htmlOut)
    fs.mkdirSync(path.dirname(htmlPath), { recursive: true })
    fs.writeFileSync(htmlPath, html, 'utf-8')
    console.log(`📄 HTML preview generated ${htmlOut}`)
    console.log(`  filepath: ${htmlPath}`)
    console.log()
  }
}

function escXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildHtmlPreview(v) {
  const itemRows = v.posts.map(p => `
    <li class="entry">
      <h2><a href="${escXml(p.url)}">${escXml(p.title)}</a></h2>
      <time>${escXml(p.date.toISOString().slice(0, 10))}</time>
      ${p.tags && p.tags.length ? '<div class="tags">' + p.tags.map(t => '<span class="tag">' + escXml(t) + '</span>').join('') + '</div>' : ''}
      ${p.description ? `<p class="desc">${escXml(p.description)}</p>` : ''}
    </li>
  `).join('\n')

  return `<!DOCTYPE html>
<html lang="${v.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escXml(v.title)} · RSS</title>
  <link rel="alternate" type="application/rss+xml" href="${v.out}">
  <style>
    :root { color-scheme: light dark; }
    body { font: 16px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
           max-width: 760px; margin: 40px auto; padding: 0 24px; color: #1a1a2e; background: #fafafc; }
    @media (prefers-color-scheme: dark) { body { color: #e6e6f0; background: #0f0f1a; } }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px;
         background: linear-gradient(135deg, #6c5ce7, #fd79a8);
         -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .desc { color: #6c6c80; font-size: 14px; margin-top: 4px; }
    .meta-bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
                background: rgba(108,92,231,0.08); border-radius: 12px;
                padding: 14px 18px; margin: 24px 0; font-size: 14px; }
    .meta-bar code { background: rgba(108,92,231,0.18); padding: 4px 10px;
                     border-radius: 6px; font-family: ui-monospace, "JetBrains Mono", Consolas, monospace; }
    .meta-bar a { color: #6c5ce7; text-decoration: none; }
    ol.entries { list-style: none; padding: 0; }
    .entry { border-top: 1px solid #e6e6ea; padding: 24px 0; }
    .entry h2 { font-size: 20px; margin: 0 0 6px 0; line-height: 1.4; }
    .entry h2 a { color: inherit; text-decoration: none; }
    .entry h2 a:hover { color: #6c5ce7; }
    .entry time { color: #888; font-size: 13px; font-variant-numeric: tabular-nums; }
    .entry .tags { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0; }
    .entry .tag { font-size: 12px; background: rgba(108,92,231,0.15); color: #6c5ce7;
                   padding: 2px 10px; border-radius: 12px; font-weight: 500; }
    .entry .desc { color: #555; }
    .back { margin-top: 40px; padding: 20px 0; border-top: 1px solid #e6e6ea;
            color: #888; font-size: 13px; text-align: center; }
  </style>
</head>
<body>
  <header>
    <h1>${escXml(v.title)}</h1>
    <p class="desc">${escXml(v.description)}</p>
    <div class="meta-bar">
      <a href="${v.homeUrl}">← ${escXml(v.title)}</a>
      <code>${HOSTNAME}/${v.out}</code>
      <span>语言: ${v.language} · 共 ${v.posts.length} 篇</span>
    </div>
  </header>

  <ol class="entries">
${itemRows}
  </ol>

  <div class="back">通过 RSS 阅读器（如 Feedly / NetNewsWire / Inoreader）订阅上方链接</div>
</body>
</html>
`
}

module.exports = { buildRss }
