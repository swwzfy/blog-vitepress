<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLocale } from '@/composables/useLocale'

const { isEn } = useLocale()

interface Memo {
  id: number
  content: string
  created_at: string
}

const memos = ref<Memo[]>([])
const loading = ref(true)
const error = ref('')

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(async () => {
  try {
    const res = await fetch('/api/memos')
    if (!res.ok) throw new Error(String(res.status))
    memos.value = (await res.json()) as Memo[]
  } catch {
    error.value = isEn.value
      ? 'The memos service is not reachable. Start the backend to see this feed.'
      : '动态服务暂不可用（后端服务未启动？）。'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="memos-page">
    <p v-if="loading" class="memo-hint">{{ isEn ? 'Loading…' : '加载中…' }}</p>
    <p v-else-if="error" class="memo-hint">{{ error }}</p>
    <ul v-else-if="memos.length" class="memo-list">
      <li v-for="m in memos" :key="m.id" class="memo-item">
        <p class="memo-text">{{ m.content }}</p>
        <time class="memo-time">{{ formatTime(m.created_at) }}</time>
      </li>
    </ul>
    <p v-else class="memo-hint">{{ isEn ? 'No memos yet.' : '还没有动态，敬请期待。' }}</p>
  </div>
</template>

<style scoped>
.memos-page {
  margin-top: 16px;
}

.memo-hint {
  color: var(--vp-c-text-3);
  font-size: 15px;
  padding: 16px 0;
}

.memo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.memo-item {
  padding: 14px 0;
  border-bottom: 1px dashed var(--vp-c-divider);
}

.memo-item:last-child {
  border-bottom: none;
}

.memo-text {
  margin: 0 0 8px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-word;
}

.memo-time {
  font-size: 13px;
  color: var(--vp-c-text-3);
}
</style>
