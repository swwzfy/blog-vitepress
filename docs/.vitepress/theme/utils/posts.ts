import type { Post } from './types'
import postsMeta from '../../posts-meta.json'

/**
 * 文章按日期倒序。Archives / RecentPosts / LifeList / useTags 以及 Layout 相关文章的
 * 次级排序共用这一处实现 —— 同一条比较逻辑散落五份后很容易各自漂移。
 * 泛型只约束 date 字段，所以 useTags 的轻量条目和 Layout 的 RelatedPost 也能用。
 */
export function byDateDesc<T extends { date: string }>(a: T, b: T): number {
  return new Date(b.date).getTime() - new Date(a.date).getTime()
}

/**
 * post url（/posts/x）→ 路由相对路径（posts/x），用于和 page.relativePath 对比。
 * Layout 的相关文章与上一篇/下一篇共用。
 */
export function postRoutePath(url: string): string {
  return url.replace(/^\//, '').replace(/\/$/, '')
}

/**
 * 中英文文章列表：数据来自构建期 scripts/build-posts-meta.js 生成的 posts-meta.json
 * （config.mts 的 posts-meta 插件在 buildStart 刷新；dev 下监听文章增删改重生成）。
 * 取代旧实现对 md 页面模块的 eager glob —— 那会把全部文章的编译产物合进一个每页
 * 都 modulepreload 的大 chunk，而列表只需要这几 KB 元信息。draft 已在生成期排除。
 * 页面正文由 VitePress 路由按需加载，不经此处。
 */
function toPosts(entries: typeof postsMeta.zh): Post[] {
  return entries.map(({ title, url, date, description, tags }) => ({ title, url, date, description, tags }))
}

export const zhPosts: Post[] = toPosts(postsMeta.zh)
export const enPosts: Post[] = toPosts(postsMeta.en)

/**
 * 路由相对路径（posts/x）→ 构建期字数。Layout 文章头的字数与阅读时长由此取值，
 * SSG 输出即非 0（原先客户端扫 .vp-doc 现算，爬虫看到的是 0）。
 */
export const wordsByRoutePath = new Map<string, number>(
  [...postsMeta.zh, ...postsMeta.en].map(e => [e.path.replace(/\.md$/, ''), e.words])
)
