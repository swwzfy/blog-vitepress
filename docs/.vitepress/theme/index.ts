import DefaultTheme from 'vitepress/theme'
import { useRouter } from 'vitepress'
// JetBrains Mono 自托管（400/500，仅首页时钟卡使用）；替代大陆不可达的 Google Fonts
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './custom.css'
import { onMounted } from 'vue'
import Layout from './Layout.vue'

export default {
  extends: DefaultTheme,
  Layout,
  setup() {
    // useRouter 必须在 setup 同步上下文调用（inject），钩子挂载延后到 onMounted
    const router = useRouter()
    onMounted(async () => {
      await import('./effects.js')
      const { initPageTransitions } = await import('./page-transitions.js')
      initPageTransitions(router)
    })
  },
  async enhanceApp({ app }) {
    const Tags = (await import('./Tags.vue')).default
    const RecentPosts = (await import('./RecentPosts.vue')).default
    const Stats = (await import('./Stats.vue')).default
    const DateTimeWeather = (await import('./DateTimeWeather.vue')).default
    const Archives = (await import('./Archives.vue')).default
    const LifeList = (await import('./components/LifeList.vue')).default
    const HomeBento = (await import('./HomeBento.vue')).default
    const FriendsLinks = (await import('./components/FriendsLinks.vue')).default
    app.component('Tags', Tags)
    app.component('RecentPosts', RecentPosts)
    app.component('Stats', Stats)
    app.component('DateTimeWeather', DateTimeWeather)
    app.component('Archives', Archives)
    app.component('LifeList', LifeList)
    app.component('HomeBento', HomeBento)
    app.component('FriendsLinks', FriendsLinks)
  }
}
