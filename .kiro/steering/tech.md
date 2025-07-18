# 技术栈 & 构建系统

## 核心技术

- **前端框架**：Vue 3
- **构建工具**： Vite 7
- **CSS 框架**： Tailwind CSS 3.3
- **UI 组件库**：Ant Design Vue 4.2
- **AI 组件**： Ant Design X Vue 1.2
- **路由器**： Vue Router 4.5
- **HTTP 客户端**：Axios 1.10
- **富文本编辑器**：TipTap 2.22
- **Markdown 解析器**：标记为 15.0

## 开发环境

- **Node.js**：推荐最新的 LTS
- **包管理器**：npm
- **开发服务器端口**：9938

## 构建系统

该项目使用 Vite 作为其构建工具，具有自定义配置，用于资源处理和组件自动导入。

### 主要构建功能

- 自动导入 Ant Design Vue 组件
- 为生产版本配置资产文件路径
- 使用 PostCSS 和 Autoprefixer 进行 CSS 处理

## 常用命令

### 发展

'''猛击

# 启动开发服务器

npm run dev

```

### 建筑

'''猛击
# 为生产环境构建
npm run build

# 预览生产版本
npm run 预览
```

### 部署

'''猛击

# 部署到生产服务器

npm run deploy

# 在一个命令中构建和部署

npm run build：部署

```

## API 配置

应用程序配置为代理 API 请求：

- 开发：将 '/api' 请求代理到 'http://39.96.193.106:3000'
- 生产：相同的代理配置适用

## 部署过程

该项目包括一个自动部署脚本 （'deploy.js'），该脚本：

1. 通过 SSH 连接到生产服务器
2. 将构建的文件上传到服务器的 Web 目录
3. 重启 Nginx 以应用更改

## 环境配置

该项目使用单独的环境文件：

- “.env.development”用于开发设置
- '.env.production' 用于生产设置
```
