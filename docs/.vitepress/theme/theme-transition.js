// 主题切换动画 - 动态渐变
export function initThemeTransition() {
  document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.VPSwitchAppearance, .VPSwitch')
    if (!toggleBtn) return

    const rect = toggleBtn.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    createGradientTransition(x, y)
  })
}

function createGradientTransition(x, y) {
  const isDark = document.documentElement.classList.contains('dark')

  // 渐变颜色
  const fromColor = isDark ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)'
  const accentColor = isDark ? 'rgba(108, 92, 231, 0.3)' : 'rgba(162, 155, 254, 0.3)'

  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 99999;
    background: radial-gradient(circle at ${x}px ${y}px, ${accentColor} 0%, ${fromColor} 30%, transparent 70%);
    opacity: 0;
    transform: scale(0.5);
    transition: opacity 0.8s ease, transform 1.2s cubic-bezier(0.4, 0, 0.2, 1);
  `

  document.body.appendChild(overlay)

  // 触发动画
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
      overlay.style.transform = 'scale(2)'
    })
  })

  // 淡出
  setTimeout(() => {
    overlay.style.opacity = '0'
    setTimeout(() => overlay.remove(), 800)
  }, 800)
}
