/**
 * 广告法绝对化用语体检：扫描会发布到站上的文案（docs/ 下的 md/json/ts/mts/vue/js/css），
 * 命中即退出码非 0，让 CI 拦下，避免新文章带着「最/唯一/永久/天花板」这类词上线。
 *
 * 口径（2026-10-12 与站主确认，全站已按此清零）：
 *   - 《广告法》第九条第三项禁止「国家级/最高级/最佳」及同义近义用语，罚则 20 万–100 万；
 *     《广告绝对化用语执法指南》（市场监管总局 2023 年第 6 号）第四条/第五条/第六条另有豁免
 *     （自设网站未推销商品、时空顺序客观事实、消费提示等）。本站不做豁免判断，一律清零，
 *     包括法律上安全的「最新/最后/最近」等时间副词——目的是过任何粗糙的极限词扫描。
 *   - 「第一」不在检查范围：全站 37 处都是序数（第一次/第一版/第一个项目），不是排名宣称。
 *     同理不查「100%」的 CSS 数值用法，只查后面跟中文的「100% 有效」式承诺。
 *   - 英文侧不检查：best/only/most/never 在英文里大量是功能词，正则分不出宣称与陈述。
 *   - 技术术语走 ALLOW 白名单（唯一索引、永久链接、绝对路径…），避免误报。
 *
 * 用法：npm run check:adwords （须在项目根目录执行）
 */
const fs = require('fs');
const path = require('path');

// 扫描范围：会进产物的文案与样式。dist/cache 是构建产物，public 下只有资源文件与构建期生成的 feed
const EXT = ['.md', '.json', '.ts', '.mts', '.vue', '.js', '.css'];
const SKIP = [
  'node_modules',
  `${path.sep}.vitepress${path.sep}dist`,
  `${path.sep}.vitepress${path.sep}cache`,
  `${path.sep}public${path.sep}`,
  'posts-meta.json',
];

// 技术术语白名单：命中先遮蔽（等长替换，保住列号），避免下面规则误报
const ALLOW = /唯一索引|唯一约束|唯一键|唯一性|唯一标识|永久链接|绝对路径|完美哈希|unique/g;

const RULES = [
  [/最/, '绝对化用语（含最新/最后/最近等时间副词，本站口径一律清零）'],
  [/唯一/, '唯一'],
  [/永久|永远/, '永久/永远'],
  [/天花板/, '天花板'],
  [/首选/, '首选'],
  [/完美/, '完美'],
  [/极致|顶级/, '极致/顶级'],
  [/绝对/, '绝对'],
  [
    /独家|独创|全网|国家级|世界级|遥遥领先|封神|无敌|首屈一指|第一品牌|销量第一|行业第一/,
    '排他性/权威性宣称',
  ],
  [/100%(?=[\u4e00-\u9fa5])|百分之百/, '100% 承诺'],
];

function walk(dir) {
  let out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (SKIP.some((s) => p.includes(s))) continue;
    const s = fs.statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (EXT.includes(path.extname(f)) && !f.endsWith('.min.js')) out.push(p);
  }
  return out;
}

const files = walk('docs').sort();
let hits = 0;
for (const f of files) {
  const rel = f.split(path.sep).join('/');
  fs.readFileSync(f, 'utf8')
    .split(/\r?\n/)
    .forEach((line, i) => {
      if (!line.trim()) return;
      const masked = line.replace(ALLOW, (m) => '·'.repeat([...m].length));
      for (const [re, why] of RULES) {
        const m = masked.match(re);
        if (!m) continue;
        hits++;
        console.log(`${rel}:${i + 1}  「${m[0]}」  ${why}`);
        console.log(`    ${line.trim().slice(0, 120)}`);
      }
    });
}

console.log('---');
if (hits) {
  console.log(`绝对化用语命中 ${hits} 处（行 × 规则），请改写后再提交。`);
  console.log('本项目不做《广告绝对化用语执法指南》豁免判断，时间副词也要清零；');
  console.log('确属技术术语的（如「唯一索引」）请加进本脚本的 ALLOW 白名单。');
  process.exit(1);
}
console.log(`✓ 未发现绝对化用语（扫描 ${files.length} 个文件）`);
