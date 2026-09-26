import { ref } from 'vue'
import { zhPosts, enPosts } from '@/utils/posts'
import { useLocale } from '@/composables/useLocale'

type TagMap = Record<string, { title: string; url: string; date: string }[]>

/**
 * 按当前 locale 聚合对应语言文章的 tags 索引（中文站 zhPosts / 英文站 enPosts）。
 * 同步执行以让 SSR 拿到完整数据。
 * 注意：只在 setup 时按 isEn 取一次数，ref 仅供模板解包，不是响应式依赖 ——
 * 依赖 VitePress 切语言是整页跳转（组件重建），若改为 SPA 内切换需重写为 computed。
 */
export function useTags() {
  const { isEn } = useLocale()
  const source = isEn.value ? enPosts : zhPosts

  const tags = ref<TagMap>({})
  const tagMap: TagMap = {}

  for (const post of source) {
    for (const tag of post.tags) {
      ;(tagMap[tag] ||= []).push({
        title: post.title,
        url: post.url,
        date: post.date
      })
    }
  }

  const sorted: TagMap = {}
  Object.keys(tagMap)
    .sort((a, b) => tagMap[b].length - tagMap[a].length)
    .forEach(key => {
      sorted[key] = tagMap[key].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    })

  tags.value = sorted
  return { tags }
}
