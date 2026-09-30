import { computed } from 'vue'
import { useData } from 'vitepress'

type LocaleEntry = { zh: string; en: string }

/**
 * 站点文案双语字典。新增字段统一在这里加，组件用 t('key') 调用。
 * 保留中英文键名 key 不变，文案调整只改一侧。
 * 需要插值的写 {name} 占位，调用 t('key', { name: 'x' })。
 *
 * 边界：这里只放「可翻译文案」。每项数据自带 zh/en 的双语数据对不搬进来 ——
 * PLANETS / ANSWERS / FESTIVALS / weatherCodeMap / friends.json 的 descEn 等
 * 属于数据结构，搬进扁平字典反而更难维护。
 *
 * 用 satisfies 而不是 `: Record<...>` 注解：注解会把 key 宽化成 string，
 * t('拼错的键') 就不再是类型错误，只能等它在页面上渲染出键名才发现。
 */
const dict = {
  back: { zh: '返回', en: 'Back' },
  backPrev: { zh: '返回上一页', en: 'Go Back' },
  backHome: { zh: '返回首页', en: 'Home' },
  relatedPosts: { zh: '相关文章', en: 'Related Posts' },
  pageNotFound: { zh: '页面迷失在虚空中', en: 'Lost in the Void' },
  pageNotFoundDesc: {
    zh: '你要找的页面可能已被移除、改名，或者从未存在过。',
    en: 'The page you are looking for may have been removed, renamed, or never existed.'
  },
  visit: { zh: '访客', en: 'Visitors' },
  views: { zh: '访问', en: 'Views' },
  minRead: { zh: '分钟阅读', en: 'min read' },
  words: { zh: '字', en: 'words' },
  reads: { zh: '次阅读', en: 'reads' },
  ttsPlay: { zh: '朗读本文', en: 'Read aloud' },
  ttsStop: { zh: '停止朗读', en: 'Stop reading' },
  footerDesc: {
    zh: '独立开发者 · 写作者 · 终身学习者',
    en: 'Indie Developer · Writer · Lifelong Learner'
  },
  rights: { zh: '保留所有权利', en: 'All rights reserved.' },
  uptime: { zh: '已运行 {days} 天', en: '{days} days online' },

  // —— 首页 Bento 卡片 ——
  bentoTech: { zh: '技术', en: 'Tech' },
  bentoDescTech: {
    zh: '全栈开发，喜欢折腾新工具。Rust、Python、TypeScript 都写。',
    en: 'Full-stack development, love tinkering with new tools. Rust, Python, TypeScript.'
  },
  bentoWriting: { zh: '写作', en: 'Writing' },
  bentoDescWriting: {
    zh: '记录思考过程，分享踩过的坑。写作是最好的学习方式。',
    en: 'Documenting the thinking process, sharing lessons learned. Writing is the best way to learn.'
  },
  bentoLife: { zh: '生活', en: 'Life' },
  bentoDescLife: {
    zh: '咖啡爱好者，独立开发者，偶尔跑步。在扬州，用代码和文字构建自己的世界。',
    en: 'Coffee enthusiast, indie developer, occasional runner. In Yangzhou, building my own world with code and words.'
  },
  bentoSubscribe: { zh: '订阅本站', en: 'Subscribe' },
  bentoDescSubscribe: {
    zh: 'RSS 全文输出，也欢迎在 GitHub、邮箱找到我。',
    en: 'Full-text RSS feed, or find me on GitHub and by email.'
  },
  bentoCommands: { zh: '快捷指令', en: 'Quick Commands' },
  bentoDescCommands: {
    zh: '站内的小玩具，点一行就运行。',
    en: 'Little toys on this site. Click a line to run it.'
  },
  cmdRandomPost: { zh: '随机逛一篇', en: 'Random post' },
  cmdAnswer: { zh: '答案之书', en: 'Book of Answers' },
  cmdWander: { zh: '流浪星球', en: 'Wander the planets' },
  cmdVisitFriend: { zh: '去串个门', en: 'Visit a friend' },
  warpingTo: { zh: '正在飞往「{name}」—— {desc}', en: 'warping to {name} — {desc}' },

  // —— 首页统计条 ——
  statPosts: { zh: '篇文章', en: 'Posts' },
  statTags: { zh: '个标签', en: 'Tags' },
  statWords: { zh: '全站字数', en: 'Words' },
  statThisMonth: { zh: '本月更新', en: 'This month' },
  recentPosts: { zh: '最新文章', en: 'Recent Posts' },

  // —— 友链 / 生活 ——
  circleTitle: { zh: '圈子动态', en: 'Latest from the Circle' },
  circleDesc: {
    zh: '构建时聚合的朋友博客最新文章，去他们那里看看。',
    en: 'Recent posts from friend blogs, aggregated at build time.'
  },
  noLifePosts: { zh: '还没有生活类文章。', en: 'No life articles yet.' },

  // —— 首页时钟卡 ——
  datePlaceholder: { zh: '---- · -- · --', en: '-- · -- · ----' },
  greetingHello: { zh: '你好', en: 'Hello' },
  greetingNight: { zh: '夜深了', en: 'Good Night' },
  greetingMorning: { zh: '早上好', en: 'Good Morning' },
  greetingAfternoon: { zh: '下午好', en: 'Good Afternoon' },
  greetingEvening: { zh: '晚上好', en: 'Good Evening' },
  todayIs: { zh: '今天是{name}', en: 'Today is {name}' },
  countdownTo: { zh: '距{name}还有 {days} 天', en: '{days}d to {name}' }
} satisfies Record<string, LocaleEntry>

/**
 * 简化版 i18n hook。返回当前 locale 判断 + 简易翻译函数。
 * 后续若需要更完整（嵌套 key、locale fallback），可替换为 vue-i18n。
 */
export function useLocale() {
  const { lang } = useData()
  const isEn = computed(() => lang.value.startsWith('en'))

  function t(key: keyof typeof dict, vars?: Record<string, string | number>): string {
    const entry = dict[key]
    if (!entry) return key
    const raw = isEn.value ? entry.en : entry.zh
    if (!vars) return raw
    return raw.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
  }

  return { isEn, t, lang }
}
