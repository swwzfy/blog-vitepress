import DefaultTheme from 'vitepress/theme'
import './custom.css'
import { onMounted } from 'vue'
import Layout from './Layout.vue'
import Tags from './Tags.vue'
import RecentPosts from './RecentPosts.vue'
import Stats from './Stats.vue'
import DateTimeWeather from './DateTimeWeather.vue'

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
  enhanceApp({ app }) {
    app.component('Tags', Tags)
    app.component('RecentPosts', RecentPosts)
    app.component('Stats', Stats)
    app.component('DateTimeWeather', DateTimeWeather)
  }
}
