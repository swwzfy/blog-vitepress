/**
 * 搜索弹层「大家在搜」：消费 /api/searches.json（stats 后端近 30 天热词榜），
 * 在弹层打开且输入为空 / 无结果时注入热词 chips，点击即代填代搜——
 * 点击本身以 input 事件进入现有热词打点（utils/stats.ts），形成使用闭环。
 * 只展示被搜过 ≥2 次的词（防单人自嗨上墙），服务不可达或热词为空时不渲染
 * （站规：不挂占位符）。数据缓存 30 分钟，避免每次开弹层都打后端。
 */
import { statsAvailable } from './stats'

let cache: { at: number; words: string[] } | null = null

async function loadHotwords(): Promise<string[]> {
  if (cache && Date.now() - cache.at < 30 * 60 * 1000) return cache.words
  try {
    const res = await fetch('/api/searches.json?n=8')
    if (!res.ok) return []
    const data = await res.json()
    const words: string[] = (data.items || [])
      .filter((it: { count: number }) => Number(it.count) >= 2)
      .slice(0, 8)
      .map((it: { term: string }) => it.term)
    cache = { at: Date.now(), words }
    return words
  } catch {
    return []
  }
}

function ensureStyle(): void {
  if (document.getElementById('vp-hotwords-style')) return
  const st = document.createElement('style')
  st.id = 'vp-hotwords-style'
  st.textContent = `
    .vp-hotwords { display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
      padding: 12px 16px; border-bottom: 1px solid var(--vp-c-divider); }
    .vp-hotwords-label { font-size: 12px; color: var(--vp-c-text-3); }
    .vp-hotword { font-size: 13px; padding: 3px 12px; border-radius: 999px;
      border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft);
      color: var(--vp-c-text-2); cursor: pointer; transition: border-color .2s, color .2s; }
    .vp-hotword:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
  `
  document.head.appendChild(st)
}

function inject(box: Element, words: string[]): void {
  if (!words.length || box.querySelector('.vp-hotwords')) return
  const ul = box.querySelector('ul.results')
  if (!ul || !ul.parentElement) return
  const row = document.createElement('div')
  row.className = 'vp-hotwords'
  const label = document.createElement('span')
  label.className = 'vp-hotwords-label'
  label.textContent = '大家在搜'
  row.appendChild(label)
  for (const w of words) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'vp-hotword'
    b.textContent = w
    b.addEventListener('click', () => {
      const input = box.querySelector<HTMLInputElement>('.search-bar input')
      if (!input) return
      input.value = w
      // 代填代搜：input 事件驱动 VitePress 的 v-model，同时被热词打点捕获
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.focus()
      row.remove()
    })
    row.appendChild(b)
  }
  ul.parentElement.insertBefore(row, ul)
}

function refresh(box: Element): void {
  const input = box.querySelector<HTMLInputElement>('.search-bar input')
  const row = box.querySelector<HTMLElement>('.vp-hotwords')
  if (!row) return
  const empty = !input || input.value.trim() === ''
  const noResults = !!box.querySelector('.no-results')
  row.style.display = empty || noResults ? '' : 'none'
}

export function setupSearchHotwords(): void {
  if (!statsAvailable()) return
  ensureStyle()
  const observer = new MutationObserver(async mutations => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement)) continue
        const box = n.matches('.VPLocalSearchBox') ? n : n.querySelector('.VPLocalSearchBox')
        if (!box) continue
        const words = await loadHotwords()
        // 异步取词期间弹层可能已被关掉再开：确认仍在文档里才注入
        if (!box.isConnected || !words.length) continue
        inject(box, words)
        refresh(box)
        box.addEventListener('input', () => refresh(box))
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}
