/**
 * 日期工具
 */

/**
 * 把 frontmatter date 字符串（YYYY-MM-DD 或 ISO）格式化为 YYYY-MM-DD。
 * 无效或空输入返回空串。
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
