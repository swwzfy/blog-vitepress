<script setup lang="ts">
import { useLocale } from '@/composables/useLocale'

const { isEn } = useLocale()
</script>

<template>
  <!-- 首页 Bento 网格：静态渲染，不走 Teleport 注入。
       SSG 输出与水合 DOM 天然一致 —— Teleport 注入在 SSG+hydration 下会把
       虚拟 DOM（3 张静态卡）和真实 DOM（5 张卡）错位，刷新后技术卡被时钟内容顶掉。
       DOM 序即显示序，无需 order / :has 接管。 -->
  <div class="home-bento">
    <div class="container">
      <div class="items">
        <div class="item bento-item-wide bento-clock-item">
          <DateTimeWeather />
        </div>
        <div class="item">
          <div class="bento-card">
            <div class="bento-icon">⚡</div>
            <h3 class="bento-title">{{ isEn ? 'Tech' : '技术' }}</h3>
            <p class="bento-desc">{{ isEn
              ? 'Full-stack development, love tinkering with new tools. Rust, Python, TypeScript.'
              : '全栈开发，喜欢折腾新工具。Rust、Python、TypeScript 都写。' }}</p>
          </div>
        </div>
        <div class="item">
          <div class="bento-card">
            <div class="bento-icon">✍️</div>
            <h3 class="bento-title">{{ isEn ? 'Writing' : '写作' }}</h3>
            <p class="bento-desc">{{ isEn
              ? 'Documenting the thinking process, sharing lessons learned. Writing is the best way to learn.'
              : '记录思考过程，分享踩过的坑。写作是最好的学习方式。' }}</p>
          </div>
        </div>
        <div class="item bento-item-wide">
          <div class="bento-card">
            <div class="bento-icon">🌱</div>
            <h3 class="bento-title">{{ isEn ? 'Life' : '生活' }}</h3>
            <p class="bento-desc">{{ isEn
              ? 'Coffee enthusiast, indie developer, occasional runner. In Yangzhou, building my own world with code and words.'
              : '咖啡爱好者，独立开发者，偶尔跑步。在扬州，用代码和文字构建自己的世界。' }}</p>
          </div>
        </div>
        <div class="item bento-item-wide">
          <div class="bento-card">
            <div class="bento-icon">📮</div>
            <h3 class="bento-title">{{ isEn ? 'Subscribe' : '订阅本站' }}</h3>
            <p class="bento-desc">{{ isEn
              ? 'Full-text RSS feed, or find me on GitHub and by email.'
              : 'RSS 全文输出，也欢迎在 GitHub、邮箱找到我。' }}</p>
            <div class="bento-links">
              <a :href="isEn ? '/en/feed.rss' : '/feed.rss'" target="_blank" rel="noopener">RSS</a>
              <span class="bento-dot">·</span>
              <a href="https://github.com/swwzfy" target="_blank" rel="noopener">GitHub</a>
              <span class="bento-dot">·</span>
              <a href="mailto:swwzfy@163.com">Email</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
