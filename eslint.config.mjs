// ESLint flat config. Vue 3 + TypeScript 项目最简配置。
// 文件用 .mjs 后缀避免 package.json 缺 "type":"module" 的 warning，
// 也跟 scripts/build-rss.js（CJS run by node）分开语义。

import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  // 全局忽略
  {
    ignores: [
      'node_modules/**',
      'docs/.vitepress/dist/**',
      'docs/.vitepress/cache/**',
      'public/**',
      'scripts/**/*.js',         // CJS run by node，自带 lint
      '.agents/**',
      '.claude/**'
    ]
  },

  // 基础 JS 规则
  js.configs.recommended,

  // TypeScript 规则
  ...tseslint.configs.recommended,

  // Vue 3 规则（SFC + 内嵌 TS 需要显式 parser）
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module',
        extraFileExtensions: ['.vue']
      }
    }
  },

  // 业务源码统一应用
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      // 项目偏好：warn 而非 error，避免 lint 阻塞 build
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      // Vue 项目特例
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html-raw': 'off',
      'vue/component-tags-order': 'off',
      'vue/attributes-order': 'off',
      'vue/html-self-closing': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/html-closing-bracket-spacing': 'off',
      // 业务灵活
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off'
    }
  },

  // .d.ts 文件宽松
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },

  // 插件与 prettier 协调，必须最后
  prettier
]
