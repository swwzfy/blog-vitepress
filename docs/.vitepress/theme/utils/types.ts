/**
 * 全站共用的文章结构，由 utils/posts.ts 标准化产出。
 */
export interface Post {
  title: string
  url: string
  date: string
  description: string
  tags: string[]
}
