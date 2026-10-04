<script setup lang="ts">
import friendsData from '../../friends.json'
import activityData from '../../friends-activity.json'
import { onMounted, ref } from 'vue'
import { statsAvailable } from '@/utils/stats'
import { useLocale } from '@/composables/useLocale'
import { formatDate } from '@/utils/format'

/**
 * 友链页主体：卡片墙 + 圈子动态。
 * 卡片数据源 docs/.vitepress/friends.json（申请友链时改这一个文件即可）；
 * 圈子动态数据源双轨：服务端 /api/friends-activity（stats.py 后台线程定时
 * 抓取友链 RSS）优先，拿不到回退构建期种子快照 friends-activity.json（已提交）。
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

const { isEn, t } = useLocale()
const friends = friendsData as Friend[]
const activity = ref<ActivityItem[]>(
  ((activityData as { items?: ActivityItem[] }).items || []) as ActivityItem[]
)

// 服务端数据可用时用实时动态覆盖种子；条目为空则保留种子，页面不至于空着
onMounted(async () => {
  if (!statsAvailable()) return
  try {
    const res = await fetch('/api/friends-activity')
    if (!res.ok) return
    const data = await res.json()
    const items = (data.items || []) as ActivityItem[]
    if (items.length) activity.value = items
  } catch {
    /* 回退种子 */
  }
})
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
    <h3 class="friends-activity-title">{{ t('circleTitle') }}</h3>
    <p class="friends-activity-desc">
      {{ t('circleDesc') }}
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
