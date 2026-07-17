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

<Teleport to=".VPHero .container" defer>
  <DateTimeWeather />
</Teleport>

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
.datetime-weather {
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
  .datetime-weather {
    width: 100%;
  }
}
</style>
