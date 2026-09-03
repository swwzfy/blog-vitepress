/**
 * Kiran's Blog —— 动态内容 + 友链审核 API
 *
 * 依赖：仅 express（纯 JS）。SQLite 用 Node 内置的 node:sqlite（Node ≥ 24，无需原生编译）。
 * 部署：宝塔 Node 项目管理器，启动文件 server.js，环境变量 ADMIN_TOKEN 必填。
 * 监听：127.0.0.1:3000，由 nginx 反向代理 /api 与 /admin 到本端口。
 */
const express = require('express')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

let DatabaseSync
try {
  ;({ DatabaseSync } = require('node:sqlite'))
} catch {
  console.error('[blog-api] 需要 Node ≥ 24（内置 node:sqlite）。当前版本不支持，请升级 Node 后重试。')
  process.exit(1)
}

const HOST = process.env.HOST || '127.0.0.1'
const PORT = Number(process.env.PORT || 3000)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''

const DATA_DIR = path.join(__dirname, 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new DatabaseSync(path.join(DATA_DIR, 'blog.db'))
db.exec(`
  CREATE TABLE IF NOT EXISTS memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    desc TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TEXT NOT NULL,
    decided_at TEXT
  );
`)

/** 首次启动时导入现有静态友链，之后全部在后台审核 */
const SEED_FRIENDS = [{ name: 'Leelaa', url: 'https://leelaa.cn', desc: '' }]
const friendCount = db.prepare('SELECT COUNT(*) AS n FROM friends').get().n
if (friendCount === 0) {
  const now = new Date().toISOString()
  const seed = db.prepare(
    'INSERT INTO friends (name, url, desc, status, created_at) VALUES (?, ?, ?, ?, ?)'
  )
  for (const f of SEED_FRIENDS) seed.run(f.name, f.url, f.desc, 'approved', now)
  console.log(`[blog-api] 已导入 ${SEED_FRIENDS.length} 条初始友链`)
}

/** 敏感词过滤：data/secure-words.txt 存在则加载（# 开头与空行忽略），词间用逗号/空白分隔 */
const wordsPath = path.join(DATA_DIR, 'secure-words.txt')
let sensitiveWords = []
if (fs.existsSync(wordsPath)) {
  sensitiveWords = fs
    .readFileSync(wordsPath, 'utf8')
    .split(/[\s,，]+/)
    .map(w => w.trim())
    .filter(w => w && !w.startsWith('#'))
}
function hasSensitiveWord(...texts) {
  if (!sensitiveWords.length) return false
  const joined = texts.join(' ')
  return sensitiveWords.some(w => joined.includes(w))
}

/** 简易内存限频：key 维度（如 IP），窗口内超限返回 false */
const buckets = new Map()
function rateLimited(key, max, windowMs) {
  const now = Date.now()
  const list = (buckets.get(key) || []).filter(ts => now - ts < windowMs)
  if (list.length >= max) {
    buckets.set(key, list)
    return true
  }
  list.push(now)
  buckets.set(key, list)
  return false
}

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', true) // nginx 反代，req.ip 取真实访客 IP
app.use(express.json({ limit: '32kb' }))

/** 管理端鉴权：Authorization: Bearer <ADMIN_TOKEN> */
function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) {
    return res.status(503).json({ error: '服务端未配置 ADMIN_TOKEN 环境变量' })
  }
  const header = req.headers.authorization || ''
  const provided = header.startsWith('Bearer ') ? header.slice(7) : ''
  const a = crypto.createHash('sha256').update(provided).digest()
  const b = crypto.createHash('sha256').update(ADMIN_TOKEN).digest()
  if (!crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: '未授权或 Token 错误' })
  }
  next()
}

const fail = (res, status, error) => res.status(status).json({ error })

/* ---------------- 公开接口 ---------------- */

/** 动态列表 */
app.get('/api/memos', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100)
  const rows = db
    .prepare('SELECT id, content, created_at FROM memos ORDER BY id DESC LIMIT ?')
    .all(limit)
  res.json(rows)
})

/** 已通过的友链 */
app.get('/api/friends', (req, res) => {
  const rows = db
    .prepare(
      "SELECT id, name, url, desc FROM friends WHERE status = 'approved' ORDER BY id ASC"
    )
    .all()
  res.json(rows)
})

/** 友链自助申请 */
app.post('/api/friends/apply', (req, res) => {
  const ip = req.ip || 'unknown'
  if (rateLimited(`apply:${ip}`, 2, 10 * 60 * 1000)) {
    return fail(res, 429, '提交太频繁，请 10 分钟后再试')
  }
  const name = String(req.body?.name || '').trim()
  const url = String(req.body?.url || '').trim()
  const desc = String(req.body?.desc || '').trim()

  if (!name || name.length > 50) return fail(res, 400, '站点名必填且不超过 50 字')
  if (!url || url.length > 200) return fail(res, 400, '网址必填且不超过 200 字符')
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return fail(res, 400, '网址格式不正确')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return fail(res, 400, '仅支持 http/https 网址')
  }
  if (desc.length > 200) return fail(res, 400, '简介不超过 200 字')
  if (hasSensitiveWord(name, desc)) return fail(res, 400, '内容包含不允许的词')

  const dup = db
    .prepare("SELECT id FROM friends WHERE url = ? AND status != 'rejected'")
    .get(url)
  if (dup) return fail(res, 409, '该友链已存在或在审核中')

  const now = new Date().toISOString()
  const info = db
    .prepare('INSERT INTO friends (name, url, desc, status, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(name, url, desc, 'pending', now)
  res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) })
})

/* ---------------- 管理接口（/admin 页面使用） ---------------- */

app.get('/api/admin/memos', requireAdmin, (req, res) => {
  const rows = db
    .prepare('SELECT id, content, created_at FROM memos ORDER BY id DESC LIMIT 200')
    .all()
  res.json(rows)
})

app.post('/api/admin/memos', requireAdmin, (req, res) => {
  const content = String(req.body?.content || '').trim()
  if (!content || content.length > 2000) return fail(res, 400, '内容必填且不超过 2000 字')
  if (hasSensitiveWord(content)) return fail(res, 400, '内容包含不允许的词')
  const now = new Date().toISOString()
  const info = db
    .prepare('INSERT INTO memos (content, created_at) VALUES (?, ?)')
    .run(content, now)
  res.status(201).json({ ok: true, id: Number(info.lastInsertRowid), created_at: now })
})

app.delete('/api/admin/memos/:id', requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM memos WHERE id = ?').run(Number(req.params.id))
  if (!info.changes) return fail(res, 404, '动态不存在')
  res.json({ ok: true })
})

/** 审核列表，?status=pending（默认）/approved/rejected */
app.get('/api/admin/friends', requireAdmin, (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status)
    ? req.query.status
    : 'pending'
  const rows = db
    .prepare(
      `SELECT id, name, url, desc, created_at FROM friends WHERE status = ? ORDER BY id DESC`
    )
    .all(status)
  res.json(rows)
})

app.post('/api/admin/friends/:id/approve', requireAdmin, (req, res) => {
  const now = new Date().toISOString()
  const info = db
    .prepare("UPDATE friends SET status = 'approved', decided_at = ? WHERE id = ?")
    .run(now, Number(req.params.id))
  if (!info.changes) return fail(res, 404, '申请不存在')
  res.json({ ok: true })
})

app.post('/api/admin/friends/:id/reject', requireAdmin, (req, res) => {
  const now = new Date().toISOString()
  const info = db
    .prepare("UPDATE friends SET status = 'rejected', decided_at = ? WHERE id = ?")
    .run(now, Number(req.params.id))
  if (!info.changes) return fail(res, 404, '申请不存在')
  res.json({ ok: true })
})

/* ---------------- 管理页面 ---------------- */

app.use('/admin', express.static(path.join(__dirname, 'admin'), { extensions: ['html'] }))

/* ---------------- 启动 ---------------- */

app.listen(PORT, HOST, () => {
  console.log(`[blog-api] 运行于 http://${HOST}:${PORT}`)
  console.log(`[blog-api] 管理后台 http://${HOST}:${PORT}/admin`)
  if (!ADMIN_TOKEN) {
    console.warn('[blog-api] ⚠ 未设置 ADMIN_TOKEN 环境变量，管理接口不可用！')
  }
})
