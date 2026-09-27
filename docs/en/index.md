---
layout: home
hero:
  name: Kiran
  text: joss echo
  tagline: Indie Developer · Writer · Sanskrit for "light" — clean, simple, unconventional
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

<Teleport to=".VPFeatures .items" defer>
  <div class="item datetime-weather-item">
    <DateTimeWeather />
  </div>
  <div class="item bento-subscribe-item">
    <div class="bento-card">
      <div class="bento-icon">📮</div>
      <h3 class="bento-title">Subscribe</h3>
      <p class="bento-desc">Full-text RSS feed, or find me on GitHub and by email.</p>
      <div class="bento-links">
        <a href="/en/feed.rss" target="_blank" rel="noopener">RSS</a>
        <span class="bento-dot">·</span>
        <a href="https://github.com/swwzfy" target="_blank" rel="noopener">GitHub</a>
        <span class="bento-dot">·</span>
        <a href="mailto:swwzfy@163.com">Email</a>
      </div>
    </div>
  </div>
</Teleport>
