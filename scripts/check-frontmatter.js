/**
 * 发布前 frontmatter 体检：扫描 docs/ 全部 .md，检查
 *   - YAML 解析错误（如 title 含英文冒号未加引号，会直接弄挂生产构建）
 *   - posts 缺 title / date，标记 draft: true 的草稿
 * 用法：npm run check:frontmatter （须在项目根目录执行）
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

function walk(dir) {
  let out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (f.endsWith('.md')) out.push(p);
  }
  return out;
}

const files = walk('docs').filter(f => !f.includes('node_modules') && !f.includes('.vitepress'));
let flagged = 0;
const posts = [];
for (const f of files) {
  try {
    const m = matter(fs.readFileSync(f, 'utf8'));
    const d = m.data;
    const issues = [];
    if (d.title === undefined) issues.push('missing title');
    if (d.date === undefined) issues.push('missing date');
    if (d.draft === true) issues.push('DRAFT');
    const rel = f.split(path.sep).join('/');
    if (issues.length) { console.log(rel, '=>', issues.join(', ')); flagged++; }
    if (rel.includes('/posts/')) {
      posts.push({ rel, title: d.title, date: d.date, tags: d.tags, lang: rel.includes('/en/') ? 'en' : 'zh', draft: d.draft === true });
    }
  } catch (e) {
    console.log('YAML ERROR:', f.split(path.sep).join('/'), '--', e.message.split('\n')[0]);
    flagged++;
  }
}
console.log('---');
console.log('total md:', files.length, 'flagged:', flagged);
console.log('--- posts:', posts.length);
for (const p of posts.sort((a, b) => String(b.date).localeCompare(String(a.date)))) {
  console.log(p.lang, p.date, p.draft ? '[DRAFT]' : '      ', JSON.stringify(p.tags), p.rel);
}
