---
layout: home
hero:
  name: Kiran
  text: joss回响
  tagline: 独立开发者 · 写作者 · 梵语「光芒」—— 干净，简洁，不落俗
  actions:
    - theme: brand
      text: 开始阅读 →
      link: /archives
    - theme: alt
      text: 了解更多
      link: /about
features:
  - icon: ⚡
    title: 技术
    details: 全栈开发，喜欢折腾新工具。Rust、Python、TypeScript 都写。
  - icon: ✍️
    title: 写作
    details: 记录思考过程，分享踩过的坑。写作是最好的学习方式。
  - icon: 🌱
    title: 生活
    details: 咖啡爱好者，独立开发者，偶尔跑步。在扬州，用代码和文字构建自己的世界。
---

<Stats />
<RecentPosts />

<Teleport to=".VPFeatures .items" defer>
  <div class="item datetime-weather-item">
    <DateTimeWeather />
  </div>
</Teleport>
