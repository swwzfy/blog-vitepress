// 构建期文章元信息聚合：扫 docs/posts 与 docs/en/posts 的 frontmatter + 正文字数，
// 产物 posts-meta.json 由 theme/utils/posts.ts 导入。取代原先对 md 页面模块的
// eager glob —— 那会把全部文章的编译产物合进一个每页都 modulepreload 的大 chunk。
// 字数口径与 config.mts 的 countWords 一致：中文字符数 + 英文单词数；
// Layout 的阅读时长（words/300 向上取整）也以此为源，SSG 输出即非 0。
const { writeFileSync, readFileSync, readdirSync } = require('fs')
const { resolve, sep } = require('path')
const matter = require('gray-matter')

const ROOT = resolve(__dirname, '..')
const OUT_FILE = resolve(ROOT, 'docs', '.vitepress', 'posts-meta.json')
const DIRS = [
  { dir: resolve(ROOT, 'docs', 'posts'), prefix: 'posts' },
  { dir: resolve(ROOT, 'docs', 'en', 'posts'), prefix: 'en/posts' }
]

// AGENTS.md 第 5 节：拼装出的路径必须在项目根内才能读写
function guard(p) {
  if (!p.startsWith(ROOT + sep)) throw new Error(`refusing to touch outside ${ROOT}: ${p}`)
}

/** 中文字符数 + 英文单词数，与 config.mts countWords / Layout 旧口径一致 */
function countWords(body) {
  const chinese = (body.match(/[一-鿿]/g) || []).length
  const english = (body.match(/[a-zA-Z]+/g) || []).length
  return chinese + english
}

/** frontmatter 的 date 可能是 YAML 日期对象（js-yaml）或字符串，统一成 YYYY-MM-DD */
function normalizeDate(d) {
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return d ? String(d) : ''
}

function scanDir({ dir, prefix }) {
  guard(dir)
  const entries = []
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.md')) continue
    const { data, content } = matter(readFileSync(resolve(dir, name), 'utf-8'))
    if (data.draft === true) continue
    entries.push({
      path: `${prefix}/${name}`,
      url: `/${prefix}/${name.replace(/\.md$/, '')}`,
      title: data.title || '',
      date: normalizeDate(data.date),
      description: data.description || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      words: countWords(content)
    })
  }
  return entries
}

function buildPostsMeta() {
  guard(OUT_FILE)
  const zh = scanDir(DIRS[0])
  const en = scanDir(DIRS[1])
  // 按路径排序：连续两次构建产物稳定，git diff 不出噪音
  const byPath = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
  zh.sort(byPath)
  en.sort(byPath)
  writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), zh, en }, null, 2) + '\n')
  console.log(`  posts-meta: ${zh.length} zh + ${en.length} en posts (drafts excluded)`)
}

module.exports = { buildPostsMeta }
