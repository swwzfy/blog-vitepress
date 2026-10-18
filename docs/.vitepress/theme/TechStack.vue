<script setup lang="ts">
import { useLocale } from '@/composables/useLocale'

const { t } = useLocale()

const stack = [
  { name: 'Rust', icon: '🦀' },
  { name: 'Python', icon: '🐍' },
  { name: 'TypeScript', icon: '🔷' },
  { name: 'Vue', icon: '💚' },
  { name: 'AI Agent', icon: '🤖' },
  { name: 'VitePress', icon: '⚡' },
  { name: 'Linux', icon: '🐧' },
  { name: 'Docker', icon: '🐳' }
]
</script>

<template>
  <div class="tech-stack">
    <p class="tech-stack-label">{{ t('techStackLabel') }}</p>
    <div class="tech-stack-badges">
      <span v-for="item in stack" :key="item.name" class="tech-badge">
        <span class="tech-badge-icon">{{ item.icon }}</span>
        <span class="tech-badge-name">{{ item.name }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.tech-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 0 24px 8px;
}

.tech-stack-label {
  font-size: 13px;
  color: var(--vp-c-text-3);
  margin: 0;
  letter-spacing: 0.5px;
}

.tech-stack-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.tech-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 20px;
  transition: border-color 0.2s, color 0.2s;
}

.tech-badge:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.tech-badge-icon {
  font-size: 14px;
  line-height: 1;
}

.tech-badge-name {
  line-height: 1;
}
</style>
