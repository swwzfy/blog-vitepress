<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vitepress'
import { useLocale } from '@/composables/useLocale'
import { zhPosts, enPosts } from '@/utils/posts'

const { isEn, t } = useLocale()
const router = useRouter()

// —— 快捷指令（借鉴友链 Leelaa 的终端命令面板）——
// 随机只发生在点击时：SSR/SSG 渲染稳定，无 hydration 风险
function randomPost() {
  const posts = isEn.value ? enPosts : zhPosts
  if (!posts.length) return
  const p = posts[Math.floor(Math.random() * posts.length)]
  router.go(p.url)
}

// 流浪星球（借鉴友链 Leelaa）：随机飞往一个精选的趣味网站。
// 词池手动维护，选大陆可达的站点。用真 <a target="_blank"> 而非 window.open：
// 点击时随机写入 href，交给浏览器原生新开标签，不被弹窗拦截器误伤
const PLANETS = [
  { url: 'https://zhongguose.com', zh: '中国色', en: 'Chinese Colors', desc: '传统色卡，取一个颜色写进 CSS', descEn: 'Traditional Chinese color palette' },
  { url: 'https://www.window-swap.com', zh: 'WindowSwap', en: 'WindowSwap', desc: '看别人窗外的风景', descEn: 'Views from strangers\' windows' },
  { url: 'https://asoftmurmur.com', zh: 'A Soft Murmur', en: 'A Soft Murmur', desc: '自己调配一段白噪音', descEn: 'Mix your own ambient noise' },
  { url: 'https://www.zoomquilt.org', zh: 'Zoom Quilt', en: 'Zoom Quilt', desc: '一张可以无限放大的画', descEn: 'An endlessly zooming painting' },
  { url: 'https://scaleofuniverse.com', zh: '宇宙的尺度', en: 'Scale of the Universe', desc: '从普朗克长度滑到整个宇宙', descEn: 'From Planck length to the universe' },
  { url: 'https://ltfc.net', zh: '中华珍宝馆', en: 'Chinese Treasures', desc: '高清书法与国画', descEn: 'Hi-res calligraphy and paintings' },
  { url: 'https://www.zdic.net', zh: '汉典', en: 'ZDIC', desc: '查一个字的来龙去脉', descEn: 'Look up a character\'s story' },
  { url: 'https://ctext.org/zhs', zh: '中国哲学书电子化计划', en: 'CTEXT', desc: '古籍原文，随手读一段', descEn: 'Classical texts in the original' },
  { url: 'https://patatap.com', zh: 'Patatap', en: 'Patatap', desc: '键盘敲出声音和动画', descEn: 'Keyboard becomes an instrument' },
  { url: 'https://neal.fun', zh: 'Neal.fun', en: 'Neal.fun', desc: '一堆上头的小实验', descEn: 'A pile of addictive little experiments' }
]

// SSR/SSG 渲染期固定为首个站点，点击时才随机 —— 与时钟同一套 hydration 安全模式
const wanderUrl = ref(PLANETS[0].url)
function pickPlanet() {
  const p = PLANETS[Math.floor(Math.random() * PLANETS.length)]
  wanderUrl.value = p.url
  feedback.value = isEn.value
    ? t('warpingTo', { name: p.en, desc: p.descEn })
    : t('warpingTo', { name: p.zh, desc: p.desc })
}

// 答案之书：心里默念一个问题，点一下翻一"页"。内置词池，不依赖外部 API
const ANSWERS = [
  { zh: '去做吧，别想太多。', en: 'Do it. Stop overthinking.' },
  { zh: '再等等，时机未到。', en: 'Not yet. Let it ripen.' },
  { zh: '你早就有答案了。', en: 'You already know the answer.' },
  { zh: '先去睡一觉再说。', en: 'Sleep on it first.' },
  { zh: '大胆一点，没关系的。', en: 'Be bold. It will be fine.' },
  { zh: '去喝杯水，回来再想。', en: 'Have some water, then think again.' },
  { zh: '问出来，答案就成功一半。', en: 'Ask it aloud — that is half the answer.' },
  { zh: '现在不行，但快了。', en: 'Not now, but soon.' },
  { zh: '换个顺序试试。', en: 'Try it in reverse order.' },
  { zh: '这件事没那么重要。', en: 'It matters less than you think.' },
  { zh: '写下来，别在脑子里转。', en: 'Write it down. Stop spinning it in your head.' },
  { zh: '留白也是一种答案。', en: 'Blank space is an answer too.' },
  { zh: '去外面走十分钟。', en: 'Go take a ten-minute walk.' },
  { zh: '相信第一直觉。', en: 'Trust your first instinct.' }
]
// 指令卡的回显行：答案之书与流浪星球共用一条终端输出
const feedback = ref('')
function askAnswer() {
  const a = ANSWERS[Math.floor(Math.random() * ANSWERS.length)]
  feedback.value = isEn.value ? a.en : a.zh
}
</script>

<template>
  <!-- 首页 Bento 网格：静态渲染，不走 Teleport 注入。
       SSG 输出与水合 DOM 天然一致 —— Teleport 注入在 SSG+hydration 下会把
       虚拟 DOM（3 张静态卡）和真实 DOM（5 张卡）错位，刷新后技术卡被时钟内容顶掉。
       DOM 序即显示序，无需 order / :has 接管。 -->
  <!-- 水平留白交给外层 VPHomeContent 的 container，与 Stats / RecentPosts 同宽对齐 -->
  <div class="home-bento">
    <div class="items">
        <div class="item bento-item-wide bento-clock-item">
          <DateTimeWeather />
        </div>
        <div class="item">
          <div class="bento-card">
            <div class="bento-icon">⚡</div>
            <h3 class="bento-title">{{ t('bentoTech') }}</h3>
            <p class="bento-desc">{{ t('bentoDescTech') }}</p>
          </div>
        </div>
        <div class="item">
          <div class="bento-card">
            <div class="bento-icon">✍️</div>
            <h3 class="bento-title">{{ t('bentoWriting') }}</h3>
            <p class="bento-desc">{{ t('bentoDescWriting') }}</p>
          </div>
        </div>
        <div class="item bento-item-wide">
          <div class="bento-card">
            <div class="bento-icon">🌱</div>
            <h3 class="bento-title">{{ t('bentoLife') }}</h3>
            <p class="bento-desc">{{ t('bentoDescLife') }}</p>
          </div>
        </div>
        <div class="item bento-item-wide">
          <div class="bento-card">
            <div class="bento-icon">📮</div>
            <h3 class="bento-title">{{ t('bentoSubscribe') }}</h3>
            <p class="bento-desc">{{ t('bentoDescSubscribe') }}</p>
            <div class="bento-links">
              <a :href="isEn ? '/en/feed.rss' : '/feed.rss'" target="_blank" rel="noopener">RSS</a>
              <span class="bento-dot">·</span>
              <a href="https://github.com/swwzfy" target="_blank" rel="noopener">GitHub</a>
              <span class="bento-dot">·</span>
              <a href="mailto:swwzfy@163.com">Email</a>
            </div>
          </div>
        </div>
        <div class="item bento-item-full">
          <div class="bento-card cmd-card">
            <div class="bento-icon">⌨️</div>
            <h3 class="bento-title">{{ t('bentoCommands') }}</h3>
            <p class="bento-desc">{{ t('bentoDescCommands') }}</p>
            <div class="cmd-list">
              <button class="cmd-row" type="button" @click="randomPost">
                <span class="cmd-icon">🎲</span>
                <span class="cmd-text">
                  <span class="cmd-name">{{ t('cmdRandomPost') }}</span>
                  <code class="cmd-code">kiran.randomPost()</code>
                </span>
                <span class="cmd-arrow">→</span>
              </button>
              <button class="cmd-row" type="button" @click="askAnswer">
                <span class="cmd-icon">📖</span>
                <span class="cmd-text">
                  <span class="cmd-name">{{ t('cmdAnswer') }}</span>
                  <code class="cmd-code">kiran.answerAsk()</code>
                </span>
                <span class="cmd-arrow">→</span>
              </button>
              <a class="cmd-row" :href="wanderUrl" target="_blank" rel="noopener" @click="pickPlanet">
                <span class="cmd-icon">🪐</span>
                <span class="cmd-text">
                  <span class="cmd-name">{{ t('cmdWander') }}</span>
                  <code class="cmd-code">kiran.wander()</code>
                </span>
                <span class="cmd-arrow">→</span>
              </a>
              <a class="cmd-row" href="https://leelaa.cn" target="_blank" rel="noopener">
                <span class="cmd-icon">🏡</span>
                <span class="cmd-text">
                  <span class="cmd-name">{{ t('cmdVisitFriend') }}</span>
                  <code class="cmd-code">kiran.friendRandom()</code>
                </span>
                <span class="cmd-arrow">→</span>
              </a>
              <div v-if="feedback" class="cmd-output">↳ {{ feedback }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>
