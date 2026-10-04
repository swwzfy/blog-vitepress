/**
 * 自建统计（server/stats.py + nginx /api/ 反代）的可用域：
 * 生产域名下打点/拉数；localhost 走 vite 代理（config.mts）连本机 stats.py，
 * 供本地端到端联调。请求全是同源相对路径，本地数据永远不会碰线上库；
 * 接口不在跑时请求 404，前端优雅隐藏，无副作用。
 */
export function statsAvailable(): boolean {
  return (
    typeof window !== 'undefined'
    && /(^|\.)jossecho\.com$|^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
  )
}

/**
 * 搜索热词打点：VitePress 本地搜索弹层的输入框挂在 body 传送门里，
 * document 级事件委托捕获输入，防抖 900ms 记录最终词（≥2 字符）。
 * 服务端另有 同 IP+词 10 分钟 去重；只在可用域启用。
 */
export function setupSearchBeacon(): void {
  if (!statsAvailable()) return
  let timer: ReturnType<typeof setTimeout> | undefined
  let last = ''
  document.addEventListener('input', e => {
    const t = e.target as HTMLInputElement | null
    if (!(t instanceof HTMLInputElement) || !t.closest('.VPLocalSearchBox')) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      const term = t.value.trim()
      if (term.length < 2 || term === last) return
      last = term
      fetch(`/api/search?q=${encodeURIComponent(term)}`).catch(() => {})
    }, 900)
  })
}
