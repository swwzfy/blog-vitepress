import type { Post } from './types'

interface PageModule {
  __pageData?: {
    title?: string
    frontmatter?: {
      date?: string
      description?: string
      tags?: string[]
    }
  }
}

const zhModules = import.meta.glob('../../../posts/*.md', { eager: true }) as Record<string, PageModule>
const enModules = import.meta.glob('../../../en/posts/*.md', { eager: true }) as Record<string, PageModule>

function parsePost(filePath: string, mod: PageModule): Post | null {
  const data = mod.__pageData
  if (!data) return null
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
 * 中英文 post 列表。eager glob 在构建期被内联，运行时是稳定对象。
 * 每次调用 usePosts 时不再重新扫描文件。
 */
export const zhPosts: Post[] = toPosts(zhModules)
export const enPosts: Post[] = toPosts(enModules)
