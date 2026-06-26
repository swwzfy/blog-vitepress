import { ref, onMounted } from 'vue'

interface TagMap {
  [tag: string]: {
    title: string
    url: string
    date: string
    description: string
    tags: string[]
  }[]
}

export function useTags() {
  const tags = ref<TagMap>({})
  const postModules = import.meta.glob('../../posts/*.md', { eager: true })

  function loadTags() {
    const tagMap: TagMap = {}

    for (const [filePath, mod] of Object.entries(postModules)) {
      const data = (mod as any).__pageData
      if (!data) continue

      const title = data.title || ''
      const date = data.frontmatter?.date || ''
      const postTags: string[] = data.frontmatter?.tags || []
      const relPath = filePath.replace(/^\.\.\/\.\.\//, '').replace(/\.md$/, '')

      for (const tag of postTags) {
        if (!tagMap[tag]) tagMap[tag] = []
        tagMap[tag].push({ title, url: `/${relPath}`, date, description: data.frontmatter?.description || '', tags: postTags })
      }
    }

    // 按标签文章数排序
    const sorted: TagMap = {}
    Object.keys(tagMap)
      .sort((a, b) => tagMap[b].length - tagMap[a].length)
      .forEach(key => {
        sorted[key] = tagMap[key].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      })

    tags.value = sorted
  }

  onMounted(loadTags)

  return { tags }
}
