<!--
 * @Author: masi 2454023350@qq.com
 * @Date: 2025-06-25 15:21:09
 * @LastEditors: masi 2454023350@qq.com
 * @LastEditTime: 2025-06-26 15:41:31
 * @FilePath: \vue-blog\README.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->

# Vue 博客系统 + AI 组件集成

## 项目概述

这是一个基于 Vue3 + Vite 构建的博客系统，集成了 ant-design-x-vue 的 AI 交互组件。

## 技术栈

- Vue 3 + Vite
- Tailwind CSS
- Ant Design Vue
- Ant Design X Vue (AI 组件)

## 功能特性

- 博客文章展示
- 文章创建与管理
- AI 对话交互 (/ai 路由)
- 响应式设计

## 项目结构

```
src/
├── views/         # 页面组件
│   ├── Home.vue    # 首页
│   ├── Post.vue    # 文章详情
│   ├── CreatePost.vue # 创建文章
│   └── AI.vue      # AI交互页面
├── router/        # 路由配置
└── components/    # 公共组件
```

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 开发模式

```bash
npm run dev
```

3. 构建生产版本

```bash
npm run build
```

## AI 组件使用

访问 `/ai` 路由体验 AI 对话功能，基于 ant-design-x-vue 的 Bubble 组件实现。

## 许可证

MIT

## 下一阶段开发计划

### 页面结构重构

1. 采用左右布局结构：

   - 左侧：选项卡导航区域
   - 右侧：页面主要内容区域

2. 选项卡设计：
   - 主页：项目介绍
   - AI：
     - 对话区域
     - 问诊区域
   - 文章：
     - 文章列表（二级 tab）
     - 添加文章（二级 tab）

### 技术实现

- 使用 ant-design-vue 的 Layout 组件实现整体布局
- 使用 Tabs 组件实现选项卡功能
- 保持响应式设计，适配不同屏幕尺寸

### 预期效果

- 提升用户体验，导航更清晰
- 统一 UI 风格，使用 ant-design-vue 组件
- 便于后续功能扩展
