---
title: 在 VitePress 博客集成 Live2D 看板娘
date: 2026-08-18
tags: [VitePress, Live2D, 前端]
description: 给博客加只小宠物，记录从选型到上线的几个坑，包括 webpack 拆包加载顺序、tap_body 键名、VitePress Layout slot 限制。
---

# 在 VitePress 博客集成 Live2D 看板娘

博客写久了有点空，左下角放个能动的角色比静态装饰有意思。本文记录怎么在 VitePress 集成 Live2D 模型，以及过程中踩的几个坑。

<!-- more -->

## 选型

四个候选方案：

| 方案 | 优点 | 缺点 |
|------|------|------|
| **CSS / SVG 自绘** | 轻量、可控 | 画工差，长得丑 |
| **Lottie 动画** | 设计师友好 | 需要别人出图 |
| **live2d-widget** | 现成模型多、CDN 接入 | webpack 拆包诡异 |
| **Cubism 自建模** | 完全自定义 | 工作量 5-7 天 |

考虑到只是想加点动态装饰，**live2d-widget 是性价比最高的** —— npm 上有 30+ 现成模型（猫、狗、二次元人形），开箱即用。

## 实现

### 1. CDN 注入脚本

不走 npm 打包（会多 250KB 到 bundle），用动态注入：

```ts
function loadLive2d() {
  if (l2dLoaded) return
  const main = document.createElement('script')
  main.src = 'https://unpkg.com/live2d-widget@3.1.4/lib/L2Dwidget.min.js'
  main.async = false
  document.body.appendChild(main)
}
```

在 `Layout.vue` 的 `onMounted` 里调用即可。

### 2. 初始化模型

```ts
L2Dwidget.init({
  model: { jsonPath: 'https://unpkg.com/live2d-widget-model-tororo@1.0.5/assets/tororo.model.json' },
  display: { position: 'left', width: 150, height: 200, vOffset: -20 },
  mobile: { show: false },
  react: { opacityDefault: 1, opacityOnhover: 0.3 }
})
```

`display.position` 是 `left` 或 `right`，不能自定义坐标。要更精细定位靠 `hOffset` / `vOffset`。

## 五个坑

### 坑 1：webpack 拆包加载顺序

`live2d-widget@3.x` 把代码拆成两个文件：
- `L2Dwidget.min.js` —— 含 webpack runtime
- `L2Dwidget.0.min.js` —— 异步 chunk manifest

`webpackJsonp` 全局变量由前者建立，后者依赖前者才能执行。

**错误做法**：先 `0.min.js` 再 `min.js` —— 报 `webpackJsonp is not defined`。
**正确顺序**：先 `min.js`，再 `0.min.js`。

网上很多教程（包括 CSDN、博客园）写的顺序是反的，按它们配会死。

### 坑 2：dialog.script 键名是 snake_case

L2Dwidget@3.x 源码里 dialog 键是 **`tap_body`**，不是文档/教程里写的 `'tap body'`（带空格）。

按空格键名配根本不会触发。我之前调试时一度以为是模型问题。

### 坑 3：模型 hit_areas 限制

不是所有部位都能点。看模型 `model.json` 的 `hit_areas` 字段：

```json
"hit_areas": [
  { "name": "body", "id": "D_REF.PT_SOBA_01" }
]
```

`wanko` 模型只有一个 body hit area —— 配 `tap_face`、`tap_head` 都不会触发，因为模型根本没画那些区域。

要在交互文案里配合模型实际结构写。

### 坑 4：VitePress Layout 不渲染非 slot 子组件

想把组件作为 `<Layout>` 的子节点挂载，结果 setup 不会被调用：

```vue
<template>
  <Layout>
    <template #doc-before>...</template>
    <!-- 这里挂 <MyComponent /> 不渲染 -->
  </Layout>
</template>
```

VitePress 的 `<Layout>` 只识别 `<template #slot>` 形式的子节点。其他写法直接被忽略。

**解决方案**：在 Layout.vue 的 `onMounted` 里手动 `createElement` + `appendChild`，绕过 Vue 组件实例化机制。

### 坑 5：`<Teleport>` 在 SFC 模板里不被识别

想用 Teleport 把组件强制挂到 body：

```vue
<Teleport to="body">
  <div>...</div>
</Teleport>
```

Vue 编译器报 `Element is missing end tag`。即使 Vue 3.5+ 应该支持驼峰，但项目里的 vue compiler 配置似乎没开这个选项。

**临时方案**：放弃 Teleport，回到坑 4 的手动 `appendChild`。

## 模型选择

npm 上 `live2d-widget-model-*` 有 30+ 个，分类简表：

| 类型 | 推荐 |
|------|------|
| 真猫 | `hijiki`（黑猫黄眼）、`tororo`（白猫蓝眼） |
| 真动物 | `wanko`（柴犬） |
| 二次元人形 | haru、chitose、koharu 等 30+ 个 |

注意：**避开有 IP 风险的模型** —— `miku`（初音未来）、`rem`（Re:Zero）、`luoxiaohei`（罗小黑战记）都是同人作品，商用或个人博客长期使用都有风险。

## 性能

- 模型资源 1-5MB（首次加载慢，浏览器缓存后秒开）
- CPU 占用约 2-5%（空闲时）
- 移动端建议关闭（`mobile: { show: false }`）

就这些。左下角现在趴着一只白猫，蓝眼睛，会眨眼，偶尔被我点一下抬个头。