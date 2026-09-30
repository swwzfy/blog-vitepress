import type { Post } from './types'

interface PageModule {
  __pageData?: {
    title?: string
    frontmatter?: {
      date?: string
      description?: string
      tags?: string[]
      draft?: boolean
    }
  }
}

const zhModules = import.meta.glob('../../../posts/*.md', { eager: true }) as Record<string, PageModule>
const enModules = import.meta.glob('../../../en/posts/*.md', { eager: true }) as Record<string, PageModule>

function parsePost(filePath: string, mod: PageModule): Post | null {
  const data = mod.__pageData
  if (!data) return null
  if (data.frontmatter?.draft === true) return null
  const relPath = filePath.replace(/^(?:\.\.\/)+/, '').replace(/\.md$/, '')
  return {
    title: data.title || '',
    url: '/' + relPath,
    date: data.frontmatter?.date || '',
    description: data.frontmatter?.description || '',
    tags: data.frontmatter?.tags || []
  }
}

function toPosts(modules: Record<string, PageModule>): Post[] {
  return Object.entries(modules)
    .map(([fp, m]) => parsePost(fp, m))
    .filter((p): p is Post => p !== null)
}

/**
 * 文章按日期倒序。Archives / RecentPosts / LifeList / useTags 以及 Layout 相关文章的
 * 次级排序共用这一处实现 —— 同一条比较逻辑散落五份后很容易各自漂移。
 * 泛型只约束 date 字段，所以 useTags 的轻量条目和 Layout 的 RelatedPost 也能用。
 */
export function byDateDesc<T extends { date: string }>(a: T, b: T): number {
  return new Date(b.date).getTime() - new Date(a.date).getTime()
}

/**
 * 中英文 post 列表。eager glob 在构建期被内联，运行时是稳定对象。
 * 每次调用 usePosts 时不再重新扫描文件。
 */
export const zhPosts: Post[] = toPosts(zhModules)
export const enPosts: Post[] = toPosts(enModules)
