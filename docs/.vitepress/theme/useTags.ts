import { ref } from 'vue'
import { zhPosts } from '@/utils/posts'

type TagMap = Record<string, { title: string; url: string; date: string }[]>

/**
 * 聚合所有中文文章的 tags 索引。
 * 同语言站点只有中文版本使用（英文版暂未挂 tags.md）。
 * 同步执行以让 SSR 拿到完整数据。
 */
export function useTags() {
  const tags = ref<TagMap>({})
  const tagMap: TagMap = {}

  for (const post of zhPosts) {
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
