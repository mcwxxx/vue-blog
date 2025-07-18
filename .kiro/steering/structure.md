# 项目结构

## 目录组织

```
vue-blog/
├── .env.development # 开发环境变量
├── .env.production # 生产环境变量
├── .kiro/ # Kiro AI 助手配置
├── .vscode/ # VS Code 编辑器设置
├── dist/ # 生产构建输出
├── public/ # 静态资产按原样提供
│ ├── vite.svg # Vite 标志
│ └── _headers # Netlify headers 配置
├── src/ # 源码
│ ├── assets/ # 项目资源（图片、字体等）
│ ├── components/ # 可重用的 Vue 组件
│ ├── router/ # Vue 路由器配置
│ ├── types/ # TypeScript 类型定义
│ ├── utils/ # 实用函数
│ ├── 浏览量/ # 页面组件
│ ├── App.vue # 根 Vue 组件
│ ├── main.js # 应用入口
│ └── style.css # 全局样式
├── deploy.js # 部署脚本
├── index.html # HTML 入口点
├── package.json # 项目依赖项和脚本
├── postcss.config.js # PostCSS 配置
├── tailwind.config.js # 顺风 CSS 配置
├── upload.js # 文件上传工具
└── vite.config.js # Vite 配置
```

_＊必须做的事＊_:
必须中文回复！

## 关键文件及其用途

- **App.vue**：定义带有标题和内容区域的主布局的根组件
- **main.js**：初始化 Vue 并挂载应用的应用程序入口点
- **vite.config.js**：配置构建过程、开发服务器和插件
- **deploy.js**：处理到生产服务器的自动部署
- **tailwind.config.js**：配置 Tailwind CSS 以进行样式设置

## 代码组织模式

### 组件结构

- 组件应按功能或页面进行组织
- 每个组件都应该有一个明确的单一责任
- 使用 Vue 3 的 Composition API 和 '<script setup> 语法

### 命名约定

- **组件**： PascalCase（例如，'PostList.vue'， 'CreatePost.vue'）
- **文件**：kebab-case（例如，'post-service.js'）
- **函数**：驼峰式命名法（例如，'fetchPosts（）'）
- **CSS 类**：直接在模板中使用 Tailwind 实用程序类

### 文件头注释

## 路由结构

- 路由在 'src/router/index.js' 中定义
- 主要路线包括：
- '/'：包含博客文章的主页
- '/about'：关于页面
- '/create'： 文章创建页面
- '/ai'：AI 交互页面

## 样式方法

- 通过 Tailwind CSS 工具类进行主要样式设置
- 组件范围的样式，用于特定于组件的样式
- 在 'src/style.css' 中定义的全局样式
