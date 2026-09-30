/// <reference types="vite/client" />
/// <reference types="vitepress/client" />

// 纯 tsc 不认识 .vue（那是 vue-tsc 的工作范围），给 SFC 一个通用声明，
// 让本闸门至少覆盖 config.mts、utils/、composables/ 与 index.ts 里的类型错误。
// 注意：.vue 组件内部的 props / 模板类型不在本闸门覆盖范围内。
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
