import DefaultTheme from 'vitepress/theme'
import './custom.css'
import { onMounted } from 'vue'
import Layout from './Layout.vue'

export default {
  extends: DefaultTheme,
  Layout,
  setup() {
    onMounted(async () => {
      await import('./effects.js')
      const { initThemeTransition } = await import('./theme-transition.js')
      initThemeTransition()
    })
  },
  async enhanceApp({ app }) {
    const Tags = (await import('./Tags.vue')).default
    const RecentPosts = (await import('./RecentPosts.vue')).default
    const Stats = (await import('./Stats.vue')).default
    const DateTimeWeather = (await import('./DateTimeWeather.vue')).default
    app.component('Tags', Tags)
    app.component('RecentPosts', RecentPosts)
    app.component('Stats', Stats)
    app.component('DateTimeWeather', DateTimeWeather)
  }
}
