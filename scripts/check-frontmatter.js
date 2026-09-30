/**
 * 发布前 frontmatter 体检：扫描 docs/ 全部 .md，检查
 *   - YAML 解析错误（如 title 含英文冒号未加引号，会直接弄挂生产构建）
 *   - description 含裸 ASCII 双引号（会静默截断 <meta name="description" content="...">）
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
let yamlErrors = 0;
let descQuoteErrors = 0;
const posts = [];
for (const f of files) {
  try {
    const m = matter(fs.readFileSync(f, 'utf8'));
    const d = m.data;
    const issues = [];
    if (d.title === undefined) issues.push('missing title');
    if (d.date === undefined) issues.push('missing date');
    if (d.draft === true) issues.push('DRAFT');
    // YAML 会剥掉定界引号，所以解析结果里仍含裸 " 就一定会截断 meta 属性值。
    // 全站已有的 3 处截断（meta description 只剩 6/24/146 字）就是这么来的。
    if (typeof d.description === 'string' && d.description.includes('"')) {
      issues.push('description has a raw " (truncates meta tag)');
      descQuoteErrors++;
    }
    const rel = f.split(path.sep).join('/');
    if (issues.length) { console.log(rel, '=>', issues.join(', ')); flagged++; }
    if (rel.includes('/posts/')) {
      posts.push({ rel, title: d.title, date: d.date, tags: d.tags, lang: rel.includes('/en/') ? 'en' : 'zh', draft: d.draft === true });
    }
  } catch (e) {
    console.log('YAML ERROR:', f.split(path.sep).join('/'), '--', e.message.split('\n')[0]);
    flagged++;
    yamlErrors++;
  }
}
console.log('---');
console.log('total md:', files.length, 'flagged:', flagged);
// YAML 解析错误会直接弄挂生产构建，description 带裸引号会静默截断 SEO 摘要，
// 这两类都用退出码非 0 让 CI 拦下；
// 缺 title/date 只是提醒（about/tags 等静态页合法地没有），不影响退出码。
if (yamlErrors > 0 || descQuoteErrors > 0) process.exit(1);
console.log('--- posts:', posts.length);
for (const p of posts.sort((a, b) => String(b.date).localeCompare(String(a.date)))) {
  console.log(p.lang, p.date, p.draft ? '[DRAFT]' : '      ', JSON.stringify(p.tags), p.rel);
}
