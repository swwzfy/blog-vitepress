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
