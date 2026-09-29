// 构建期聚合友链 RSS —— 借鉴友链 Leelaa 的「圈子」页（leelaa.cn/circle）。
// 他是后端接口（api/getFriendsRss）实时聚合；本站纯静态，改为 vite buildStart 阶段
// 抓取各友链 feed，产物 friends-activity.json 由 FriendsLinks.vue eager import。
// 兜底策略：缓存未过期直接复用；抓取失败保留上一次该友链的条目 —— 有网没网构建都不挂。
const { writeFileSync, readFileSync, statSync, mkdirSync } = require('fs')
const { resolve, dirname } = require('path')

const CACHE_FILE = resolve(__dirname, '..', 'docs', '.vitepress', 'friends-activity.json')
const FRIENDS_FILE = resolve(__dirname, '..', 'docs', '.vitepress', 'friends.json')

// 缓存 24h 内视为新鲜（dev 反复启动不打友链站点）；改动友链想立即生效可手动删缓存
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const FEED_TIMEOUT_MS = 8000
// 每个友链最多取 4 条，全局按时间排序后取 8 条
const MAX_ITEMS_PER_FRIEND = 4
const MAX_TOTAL = 8

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" }

function decodeEntities(s) {
  return s.replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, e) => ENTITIES[`&${e}`] ?? _)
}

async function fetchFeed(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FEED_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'jossecho-blog friends-feed fetcher (+https://www.jossecho.com)' }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

// 极简 RSS 2.0 / Atom 解析：只取 title / link / 日期，剥 CDATA 与内联标签。
// 手写而不引依赖：字段少且受控，rss 包 100KB+ 不值得
function parseFeed(xml) {
  const blocks = xml.split(/<(?:item|entry)[\s>]/).slice(1)
  const items = []
  for (const block of blocks) {
    const pick = tag => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
      if (!m) return ''
      return decodeEntities(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '')).trim()
    }
    const title = pick('title')
    const link =
      pick('link') ||
      (block.match(/<link[^>]*href="([^"]+)"/i) || [])[1] ||
      ''
    const date = pick('pubDate') || pick('published') || pick('updated')
    if (title && link) items.push({ title, link, date })
  }
  return items
}

async function refreshFriendsActivity() {
  try {
    const stat = statSync(CACHE_FILE)
    if (Date.now() - stat.mtimeMs < MAX_AGE_MS) {
      console.log('friends-activity: cache is fresh (<24h), skip fetch')
      return
    }
  } catch {
    /* 无缓存文件，继续抓 */
  }

  const friends = JSON.parse(readFileSync(FRIENDS_FILE, 'utf-8'))
  let prevItems = []
  try {
    prevItems = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')).items || []
  } catch {
    /* 首次生成无旧缓存 */
  }

  const all = []
  await Promise.all(
    friends
      .filter(f => f.feed)
      .map(async f => {
        try {
          const xml = await fetchFeed(f.feed)
          for (const it of parseFeed(xml).slice(0, MAX_ITEMS_PER_FRIEND)) {
            all.push({ ...it, friend: f.name, avatar: f.avatar || '' })
          }
        } catch (e) {
          console.warn(`friends-activity: ${f.name} feed failed (${e.message || e}), keep previous items`)
          for (const it of prevItems) if (it.friend === f.name) all.push(it)
        }
      })
  )

  all.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
  const items = all.slice(0, MAX_TOTAL)
  mkdirSync(dirname(CACHE_FILE), { recursive: true })
  writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), items }, null, 2) + '\n')
  const friendsCount = new Set(items.map(i => i.friend)).size
  console.log(`friends-activity: ${items.length} items from ${friendsCount} friend(s)`)
}

module.exports = { refreshFriendsActivity }
