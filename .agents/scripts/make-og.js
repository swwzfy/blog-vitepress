#!/usr/bin/env node
/**
 * 合成博客 OG 图（1200×630 PNG）。
 *
 * 三种布局：
 *   npm run og                                          # 默认 symmetrical（左/右 285px 品牌块 + 中央头像 630×630 完整 contain）
 *   node .agents/scripts/make-og.js --layout split       # 左侧头像 60% + 右侧渐变文字
 *   node .agents/scripts/make-og.js --layout fullbleed   # 全屏覆盖 + 大字
 *
 * 参数：--src / --out / --layout / --title / --subtitle / --eyebrow / --url / --w / --h / --position
 */

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const SCRIPT_DIR = __dirname
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '../..')
const HOME = process.env.USERPROFILE || process.env.HOME || ''
const DESKTOP = path.join(HOME, 'Desktop')

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]
    if (!tok.startsWith('--')) continue
    const key = tok.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) {
      out[key] = true
    } else {
      out[key] = next
      i++
    }
  }
  return out
}

const args = parseArgs(process.argv.slice(2))

const W = Number(args.w) || 1200
const H = Number(args.h) || 630
const LAYOUT = String(args.layout || 'split')
const POSITION = String(args.position || 'attention')
const SRC = path.resolve(
  args.src || path.join(DESKTOP, 'joss_avatar.png')
)
const OUT = path.resolve(
  args.out || path.join(PROJECT_ROOT, 'docs/public/og.png')
)
const EYEBROW = String(args.eyebrow || "KIRAN'S BLOG")
const TITLE = String(args.title || 'Kiran')
const SUBTITLE = String(args.subtitle || '独立开发者 · 写作者 · 终身学习者')
const URL_TEXT = String(args.url || 'jossecho.com')

if (!fs.existsSync(SRC)) {
  console.error(`源图不存在：${SRC}`)
  console.error('用法：node .agents/scripts/make-og.js --src <path>')
  process.exit(1)
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/* ----------- symmetrical：中央头像完整 contain，左右对称品牌块 ----------- */
async function renderSymmetrical() {
  const SIDE_W = 285
  const CENTER_W = W - SIDE_W * 2  // 630

  // 1) 头像 contain 到 630×630（图片比例 1:1，恰好等于 center_w），背景透明
  const avatarBuf = await sharp(SRC)
    .resize(CENTER_W, H, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  // 2) 左右品牌块 SVG：紫粉渐变 + 装饰元素
  const sideSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${SIDE_W}" height="${H}">
  <defs>
    <linearGradient id="leftBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#6c5ce7"/>
      <stop offset="100%" stop-color="#3a2cae"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#leftBg)"/>
  <rect x="${SIDE_W - 4}" y="0" width="4" height="${H}" fill="#fd79a8" opacity="0.7"/>
</svg>
`)

  const sideRightSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${SIDE_W}" height="${H}">
  <defs>
    <linearGradient id="rightBg" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#3a2cae"/>
      <stop offset="100%" stop-color="#fd79a8"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#rightBg)"/>
  <rect x="0" y="0" width="4" height="${H}" fill="#fd79a8" opacity="0.7"/>
</svg>
`)

  // 3) 文字 SVG：顶部 eyebrow 居中 + 底部 URL 居中 + 两侧左右副标题文字
  const textSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>
    .eyebrow { font: 700 28px 'Segoe UI','Microsoft YaHei',sans-serif; fill: #ffffff; letter-spacing: 8px; }
    .sub-l   { font: 500 22px 'Microsoft YaHei','PingFang SC',sans-serif; fill: rgba(255,255,255,0.95); writing-mode: vertical-rl; letter-spacing: 6px; }
    .sub-r   { font: 500 22px 'Microsoft YaHei','PingFang SC',sans-serif; fill: rgba(255,255,255,0.95); writing-mode: vertical-rl; letter-spacing: 6px; }
    .url     { font: 600 22px 'Consolas',monospace; fill: #ffffff; letter-spacing: 4px; }
  </style>

  <!-- 顶部：eyebrow -->
  <rect x="${W / 2 - 30}" y="48" width="60" height="4" fill="#fd79a8"/>
  <text x="${W / 2}" y="100" text-anchor="middle" class="eyebrow">${esc(EYEBROW)}</text>

  <!-- 左竖排副标题（writing-mode 把字竖排）-->
  <text x="40" y="${H - 80}" class="sub-l">${esc(SUBTITLE.split(' · ')[0] || '')}</text>
  <text x="80" y="${H - 80}" class="sub-l">${esc(SUBTITLE.split(' · ')[1] || '')}</text>
  <text x="120" y="${H - 80}" class="sub-l">${esc(SUBTITLE.split(' · ')[2] || '')}</text>

  <!-- 右竖排镜像 -->
  <text x="${W - 120}" y="${H - 80}" class="sub-r">${esc(SUBTITLE.split(' · ')[0] || '')}</text>
  <text x="${W - 80}" y="${H - 80}" class="sub-r">${esc(SUBTITLE.split(' · ')[1] || '')}</text>
  <text x="${W - 40}" y="${H - 80}" class="sub-r">${esc(SUBTITLE.split(' · ')[2] || '')}</text>

  <!-- 底部：URL -->
  <text x="${W / 2}" y="${H - 40}" text-anchor="middle" class="url">${esc(URL_TEXT)}</text>

  <!-- 装饰圆点 -->
  <circle cx="${SIDE_W / 2}" cy="${H / 2}" r="5" fill="#fd79a8"/>
  <circle cx="${SIDE_W / 2}" cy="${H / 2 + 18}" r="3" fill="#a29bfe"/>
  <circle cx="${W - SIDE_W / 2}" cy="${H / 2}" r="5" fill="#fd79a8"/>
  <circle cx="${W - SIDE_W / 2}" cy="${H / 2 - 18}" r="3" fill="#a29bfe"/>
</svg>
`)

  const TRANSPARENT_BASE = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).png().toBuffer()

  return sharp(TRANSPARENT_BASE)
    .composite([
      { input: sideSvg, top: 0, left: 0 },
      { input: sideRightSvg, top: 0, left: W - SIDE_W },
      { input: avatarBuf, top: 0, left: SIDE_W },
      { input: textSvg, top: 0, left: 0 }
    ])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/* ----------- split：左侧头像完整 contain + 右侧完整文字，整画布统一渐变 ----------- */
async function renderSplit() {
  const LEFT_W = 600

  // 头像 1:1 contain 在 600×600 容器内（顶/底各 15px 透明 padding，让渐变透出）
  const avatarBuf = await sharp(SRC)
    .resize(LEFT_W, H, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  // 全画布统一渐变：紫 → 淡紫 → 粉（左上到右下斜向）
  const bgSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#6c5ce7"/>
      <stop offset="50%"  stop-color="#a29bfe"/>
      <stop offset="100%" stop-color="#fd79a8"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
</svg>
`)

  const textSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>
    .eyebrow { font: 700 24px 'Segoe UI','Microsoft YaHei',sans-serif; fill: #ffffff; letter-spacing: 6px; }
    .title   { font: 800 96px 'Segoe UI','Microsoft YaHei',sans-serif; fill: #ffffff; }
    .sub     { font: 500 30px 'Microsoft YaHei','PingFang SC',sans-serif; fill: rgba(255,255,255,0.95); }
    .url     { font: 600 22px 'Consolas',monospace; fill: rgba(255,255,255,0.85); letter-spacing: 4px; }
  </style>

  <!-- 右上角装饰点 -->
  <circle cx="${W - 50}" cy="50" r="6" fill="#ffffff" opacity="0.9"/>
  <circle cx="${W - 75}" cy="65" r="3" fill="#ffffff" opacity="0.7"/>

  <!-- eyebrow -->
  <rect x="${LEFT_W + 50}" y="80" width="56" height="6" fill="#ffffff"/>
  <text x="${LEFT_W + 50}" y="135" class="eyebrow">${esc(EYEBROW)}</text>

  <!-- 大标题 -->
  <text x="${LEFT_W + 50}" y="270" class="title">${esc(TITLE)}</text>

  <!-- 副标题 -->
  <text x="${LEFT_W + 50}" y="335" class="sub">${esc(SUBTITLE)}</text>

  <!-- 分隔线 + URL -->
  <line x1="${LEFT_W + 50}" y1="${H - 110}" x2="${W - 50}" y2="${H - 110}" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
  <text x="${LEFT_W + 50}" y="${H - 60}" class="url">${esc(URL_TEXT)}</text>
</svg>
`)

  const TRANSPARENT_BASE = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).png().toBuffer()

  return sharp(TRANSPARENT_BASE)
    .composite([
      { input: bgSvg, top: 0, left: 0 },
      { input: avatarBuf, top: 0, left: 0 },
      { input: textSvg, top: 0, left: 0 }
    ])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/* ----------- fullbleed：全屏覆盖 + 大字 ----------- */
async function renderFullbleed() {
  const base = await sharp(SRC)
    .resize(W, H, { fit: 'cover', position: POSITION })
    .toBuffer()

  const overlaySvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#6c5ce7" stop-opacity="0.7"/>
      <stop offset="55%"  stop-color="#a29bfe" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#fd79a8" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="vignette" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#0a0a14" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="#0a0a14" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#brand)"/>
  <rect width="100%" height="100%" fill="url(#vignette)"/>
</svg>
`)

  const textSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>
    .eyebrow { font: 600 28px 'Segoe UI','Microsoft YaHei',sans-serif; fill: rgba(255,255,255,0.85); letter-spacing: 5px; }
    .sub     { font: 500 32px 'Microsoft YaHei','PingFang SC',sans-serif; fill: rgba(255,255,255,0.92); }
    .url     { font: 500 24px 'Consolas',monospace; fill: rgba(255,255,255,0.78); }
  </style>
  <rect x="60" y="380" width="80" height="6" fill="#fd79a8"/>
  <text x="60" y="430" class="eyebrow">${esc(EYEBROW)}</text>
  <text x="60" y="500" class="sub">${esc(SUBTITLE)}</text>
  <text x="60" y="555" class="url">${esc(URL_TEXT)}</text>
</svg>
`)

  return sharp(base)
    .composite([
      { input: overlaySvg, blend: 'multiply' },
      { input: textSvg }
    ])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function main() {
  const fn = LAYOUT === 'split' ? renderSplit
            : LAYOUT === 'fullbleed' ? renderFullbleed
            : renderSymmetrical
  const buf = await fn()
  await sharp(buf).toFile(OUT)
  const stat = fs.statSync(OUT)
  console.log(`OK [${LAYOUT}] ${OUT} (${W}x${H}, ${Math.round(stat.size / 1024)} KB)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
