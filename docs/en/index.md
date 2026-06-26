---
layout: home
hero:
  name: Kiran
  text: Indie Developer · Writer
  tagline: Sanskrit for "light" — clean, simple, unconventional
  actions:
    - theme: brand
      text: Start Reading →
      link: /en/archives
    - theme: alt
      text: Learn More
      link: /en/about
features:
  - icon: ⚡
    title: Tech
    details: Full-stack development, love tinkering with new tools. Rust, Python, TypeScript.
  - icon: ✍️
    title: Writing
    details: Documenting the thinking process, sharing lessons learned. Writing is the best way to learn.
  - icon: 🌱
    title: Life
    details: Coffee enthusiast, indie developer, occasional runner. In Yangzhou, building my own world with code and words.
---

<Stats />
<RecentPosts />

<div class="hero-aside-widget" id="hero-aside">
  <DateTimeWeather />
</div>

<style>
.VPHero .container {
  display: flex;
  align-items: center;
  gap: 40px;
}
.VPHero .main {
  flex: 1;
  min-width: 0;
}
.hero-aside-widget {
  width: 280px;
  flex-shrink: 0;
  margin-top: -20px;
  order: 1;
}
@media (max-width: 768px) {
  .VPHero .container {
    flex-direction: column;
    gap: 16px;
  }
  .hero-aside-widget {
    width: 100%;
  }
}
</style>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const widget = document.getElementById('hero-aside')
  const container = document.querySelector('.VPHero .container')
  if (widget && container) {
    container.appendChild(widget)
  }
})
</script>
