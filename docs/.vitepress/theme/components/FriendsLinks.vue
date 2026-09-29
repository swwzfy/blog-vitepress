<script setup lang="ts">
import friendsData from '../../friends.json'
import activityData from '../../friends-activity.json'
import { useLocale } from '@/composables/useLocale'
import { formatDate } from '@/utils/format'

/**
 * 友链页主体：卡片墙 + 圈子动态。
 * 卡片数据源 docs/.vitepress/friends.json（申请友链时改这一个文件即可）；
 * 圈子动态是构建期 scripts/build-friends-activity.js 聚合的友链 RSS 快照。
 */
interface Friend {
  name: string
  url: string
  desc: string
  descEn: string
  avatar: string
  feed?: string
}

interface ActivityItem {
  title: string
  link: string
  date: string
  friend: string
  avatar: string
}

const { isEn } = useLocale()
const friends = friendsData as Friend[]
const activity = ((activityData as { items?: ActivityItem[] }).items || []) as ActivityItem[]
</script>

<template>
  <div class="friend-cards">
    <a v-for="f in friends" :key="f.url" class="friend-card" :href="f.url" target="_blank" rel="noopener">
      <img class="friend-avatar" :src="f.avatar" :alt="`${f.name} 头像`" loading="lazy" />
      <span class="friend-info">
        <span class="friend-name">{{ f.name }}</span>
        <span class="friend-desc">{{ isEn ? f.descEn : f.desc }}</span>
      </span>
      <span class="friend-arrow">→</span>
    </a>
  </div>

  <div v-if="activity.length" class="friends-activity">
    <h3 class="friends-activity-title">{{ isEn ? 'Latest from the Circle' : '圈子动态' }}</h3>
    <p class="friends-activity-desc">
      {{
        isEn
          ? 'Recent posts from friend blogs, aggregated at build time.'
          : '构建时聚合的朋友博客最新文章，去他们那里看看。'
      }}
    </p>
    <a v-for="it in activity" :key="it.link" class="activity-row" :href="it.link" target="_blank" rel="noopener">
      <img v-if="it.avatar" class="activity-avatar" :src="it.avatar" alt="" loading="lazy" />
      <span class="activity-main">
        <span class="activity-title">{{ it.title }}</span>
        <span class="activity-meta">{{ it.friend }} · {{ formatDate(it.date) }}</span>
      </span>
      <span class="friend-arrow">→</span>
    </a>
  </div>
</template>
