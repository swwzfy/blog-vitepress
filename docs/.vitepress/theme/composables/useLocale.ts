import { computed } from 'vue'
import { useData } from 'vitepress'

type LocaleDict = Record<string, { zh: string; en: string }>

/**
 * 站点文案双语字典。新增字段统一在这里加，组件用 t('key') 调用。
 * 保留中英文键名 key 不变，文案调整只改一侧。
 */
const dict: LocaleDict = {
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
  footerDesc: {
    zh: '独立开发者 · 写作者 · 终身学习者',
    en: 'Indie Developer · Writer · Lifelong Learner'
  },
  rights: { zh: '保留所有权利', en: 'All rights reserved.' }
}

/**
 * 简化版 i18n hook。返回当前 locale 判断 + 简易翻译函数。
 * 后续若需要更完整（嵌套 key、占位符、locale fallback），可替换为 vue-i18n。
 */
export function useLocale() {
  const { lang } = useData()
  const isEn = computed(() => lang.value.startsWith('en'))

  function t(key: keyof typeof dict): string {
    const entry = dict[key]
    if (!entry) return key
    return isEn.value ? entry.en : entry.zh
  }

  return { isEn, t, lang }
}
