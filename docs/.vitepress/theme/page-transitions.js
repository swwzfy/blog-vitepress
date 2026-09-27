// 同文档 View Transitions（Chrome 111+ / Safari 18+ / Firefox 144+，不支持则静默跳过）。
// VitePress 是 SPA 导航：站内点击由 client router 换 DOM，不产生跨文档请求，
// `@view-transition { navigation: auto }` 拦不住它 —— 路由过渡只能用
// document.startViewTransition 包住 router 钩子：before 拍旧快照，
// afterRouteChanged 时 resolve 让浏览器拍新快照播放 cross-fade。
export function initPageTransitions(router) {
  if (typeof document.startViewTransition !== 'function') return

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // —— 路由切换 cross-fade ——
  // VitePress 初始加载也会走一遍路由生命周期；那次不是"页面间切换"，
  // 包 VT 会把首屏渲染冻结进空快照 3s（兜底才放行），还会干扰 Teleport defer
  // 的注入时序（时钟卡错位）—— 初始周期直接放行，只包真正的页间导航
  let resolveNav = null
  let initialDone = false
  router.onBeforeRouteChange = () => {
    if (!initialDone) return
    if (reduced()) return
    document.startViewTransition(
      () =>
        new Promise((resolve) => {
          resolveNav = resolve
        })
    )
    // 兜底：路由中断时 3s 强制放行，避免渲染被 VT 挂起冻结
    setTimeout(() => resolveNav?.(), 3000)
  }
  router.onAfterRouteChanged = () => {
    initialDone = true
    const resolve = resolveNav
    resolveNav = null
    resolve?.()
  }

  // —— 主题切换 cross-fade：capture 阶段拦下首次点击，包进 VT 后重放；
  //    重放的事件经 replaying 标记直接放行，否则会无限递归 ——
  let replaying = false
  document.addEventListener(
    'click',
    (e) => {
      if (replaying) return
      const btn = e.target.closest?.('.VPSwitchAppearance')
      if (!btn || reduced()) return
      e.preventDefault()
      e.stopPropagation()
      replaying = true
      document.startViewTransition(() => btn.click())
      setTimeout(() => {
        replaying = false
      }, 100)
    },
    true
  )
}
