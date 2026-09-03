<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLocale } from '@/composables/useLocale'

const { isEn } = useLocale()

interface Friend {
  id: number
  name: string
  url: string
  desc: string
}

const copy = computed(() =>
  isEn.value
    ? {
        loading: 'Loading…',
        loadError: 'The friends service is not reachable. Start the backend to see the list.',
        empty: 'No friends yet.',
        applyTitle: 'Apply for a friend link',
        applyHint: 'Add my link on your site first, then submit — I will review it as soon as possible.',
        nameLabel: 'Site name',
        namePh: 'Your site name',
        urlLabel: 'URL',
        urlPh: 'https://example.com',
        descLabel: 'Description (optional)',
        descPh: 'One short line about your site',
        submit: 'Submit',
        submitting: 'Submitting…',
        success: 'Submitted! It will appear here once approved.',
        errName: 'Site name is required.',
        errUrl: 'URL must start with http(s)://',
        submitFail: 'Submission failed, please try again later.'
      }
    : {
        loading: '加载中…',
        loadError: '友链服务暂不可用（后端服务未启动？）。',
        empty: '暂无友链。',
        applyTitle: '申请友链',
        applyHint: '请先在自己的站点添加本站链接，再提交申请，我会尽快审核。',
        nameLabel: '站点名',
        namePh: '你的站点名称',
        urlLabel: '网址',
        urlPh: 'https://example.com',
        descLabel: '简介（选填）',
        descPh: '一句话介绍你的站点',
        submit: '提交申请',
        submitting: '提交中…',
        success: '已提交，审核通过后即展示。',
        errName: '请填写站点名',
        errUrl: '网址需以 http(s):// 开头',
        submitFail: '提交失败，请稍后再试。'
      }
)

const friends = ref<Friend[]>([])
const loading = ref(true)
const loadError = ref('')

const name = ref('')
const url = ref('')
const desc = ref('')
const submitting = ref(false)
const formMsg = ref('')
const formError = ref('')

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await fetch('/api/friends')
    if (!res.ok) throw new Error(String(res.status))
    friends.value = (await res.json()) as Friend[]
  } catch {
    loadError.value = copy.value.loadError
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function submit() {
  formMsg.value = ''
  formError.value = ''
  const n = name.value.trim()
  const u = url.value.trim()
  if (!n) {
    formError.value = copy.value.errName
    return
  }
  if (!/^https?:\/\/.+\..+/.test(u)) {
    formError.value = copy.value.errUrl
    return
  }
  submitting.value = true
  try {
    const res = await fetch('/api/friends/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: n, url: u, desc: desc.value.trim() })
    })
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    name.value = ''
    url.value = ''
    desc.value = ''
    formMsg.value = copy.value.success
  } catch (e) {
    formError.value =
      e instanceof Error && e.message ? e.message : copy.value.submitFail
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="friends-app">
    <div class="friends-list">
      <p v-if="loading" class="friend-hint">{{ copy.loading }}</p>
      <p v-else-if="loadError" class="friend-hint">{{ loadError }}</p>
      <ul v-else-if="friends.length" class="friend-list">
        <li v-for="f in friends" :key="f.id" class="friend-item">
          <a :href="f.url" target="_blank" rel="noopener" class="friend-main">
            <span class="friend-name">{{ f.name }}</span>
            <span class="friend-host">{{ hostOf(f.url) }}</span>
          </a>
          <p v-if="f.desc" class="friend-desc">{{ f.desc }}</p>
        </li>
      </ul>
      <p v-else class="friend-hint">{{ copy.empty }}</p>
    </div>

    <div class="apply-card">
      <h3 class="apply-title">{{ copy.applyTitle }}</h3>
      <p class="apply-hint">{{ copy.applyHint }}</p>
      <div class="apply-form">
        <label class="apply-field">
          <span class="apply-label">{{ copy.nameLabel }}</span>
          <input v-model="name" type="text" :placeholder="copy.namePh" maxlength="50" />
        </label>
        <label class="apply-field">
          <span class="apply-label">{{ copy.urlLabel }}</span>
          <input v-model="url" type="url" :placeholder="copy.urlPh" maxlength="200" />
        </label>
        <label class="apply-field">
          <span class="apply-label">{{ copy.descLabel }}</span>
          <textarea v-model="desc" :placeholder="copy.descPh" rows="2" maxlength="200"></textarea>
        </label>
        <div class="apply-actions">
          <button class="apply-btn" :disabled="submitting" @click="submit">
            {{ submitting ? copy.submitting : copy.submit }}
          </button>
        </div>
        <p v-if="formMsg" class="form-msg ok">{{ formMsg }}</p>
        <p v-if="formError" class="form-msg err">{{ formError }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.friends-app {
  margin-top: 16px;
}

.friend-hint {
  color: var(--vp-c-text-3);
  font-size: 15px;
  padding: 12px 0;
}

.friend-list {
  list-style: none;
  padding: 0;
  margin: 0 0 8px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.friend-item {
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  transition: border-color 0.2s, transform 0.2s;
}

.friend-item:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.friend-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  text-decoration: none;
}

.friend-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.friend-item:hover .friend-name {
  color: var(--vp-c-brand-1);
}

.friend-host {
  font-size: 13px;
  color: var(--vp-c-text-3);
  word-break: break-all;
}

.friend-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.apply-card {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--vp-c-divider);
}

.apply-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 6px;
  color: var(--vp-c-text-1);
}

.apply-hint {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.apply-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 460px;
}

.apply-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.apply-label {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.apply-form input,
.apply-form textarea {
  font-family: inherit;
  font-size: 14px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 8px 12px;
  transition: border-color 0.2s;
}

.apply-form input:focus,
.apply-form textarea:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.apply-form textarea {
  resize: vertical;
}

.apply-actions {
  display: flex;
}

.apply-btn {
  font-family: inherit;
  font-size: 14px;
  color: #fff;
  background: var(--vp-c-brand-1);
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.apply-btn:hover {
  opacity: 0.9;
}

.apply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-msg {
  margin: 2px 0 0;
  font-size: 13px;
}

.form-msg.ok {
  color: var(--vp-c-brand-2, #0f6e56);
}

.form-msg.err {
  color: #e24b4a;
}
</style>
