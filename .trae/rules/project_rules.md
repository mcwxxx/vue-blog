<!------------------------------------------------------------------------------------
   Add Rules to this file or a short description and have Kiro refine them for you:   
-------------------------------------------------------------------------------------> <!--

- @Author: masi 2454023350@qq.com
- @Date: 2025-07-17 14:16:22
- @LastEditors: masi 2454023350@qq.com
- @LastEditTime: 2025-07-17 14:17:54
- @FilePath: \blog-backend\.kiro\steering\rules.md
- @Description: 这是默认设置,请设置`customMade`, 打开 koroFileHeader 查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE

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

# 设计文档：TTS 集成

## 概述

此设计概述了 Vue Blog 应用程序的文本转语音 （TTS） 服务的实现，特别是 AIChat 组件。TTS 服务将允许用户通过使用基于 WebSocket 的 TTS 服务将文本转换为语音来收听 AI 响应。该实施将遵循模块化方法，将 TTS 功能分离到一个可重用的服务模块中。

## 架构

TTS 集成将包括两个主要组件：

1. **TTS 服务模块**：一个独立的 JavaScript 模块，封装了所有与 TTS 相关的功能，包括 WebSocket 连接管理、文本转语音请求和音频播放控制。

2. **AIChat 组件集成**：对现有的 AIChat.vue 组件进行修改，为 AI 响应添加“Listen”按钮并与 TTS 服务集成。

''美人鱼
图表 TD
A[AIChat 组件] -->|用途 |B[TTS 服务]
B -->|连接到 |C[WebSocket TTS 服务器]
C -->|返回|D[音频数据]
B -->|控件|E[音频播放]

```

## 组件和接口

### TTS 服务模块 （'src/utils/ttsService.js'）

TTS 服务模块将为文本到语音转换和播放控制提供一个干净的 API。

#### 公共 API

'''JavaScript
初始化 TTS 服务
const tts = ttsService.init（{
onStatusChange： （status） => {}， // 状态变更回调
onError： （error） => {}， // 错误回调
});

连接到 TTS WebSocket 服务器
tts.connect（）;

将文本转换为语音并播放
tts.speak（文本，选项）;

停止播放
tts.stop（）;

检查是否已连接
const connected = tts.isConnected（）;

断开与服务器的连接
tts.disconnect（）;
```

#### 内部结构

TTS 服务将维护以下项的内部状态：

- WebSocket 连接
- 音频数据块
- 音频播放器实例
- 连接状态
- 当前播放状态

### AIChat 组件集成

AIChat.vue 组件将被修改为：

1. 导入并初始化 TTS 服务
2. 在 AI 消息页脚中添加“Listen”按钮
3. 为 TTS 作（speak、stop）实施处理程序
4. 销毁组件时清理资源

## 数据模型

### TTS 选项

'''JavaScript
{
voice_type： String， // 语音标识符（例如，'S_Z4CpYSGv1'）
speed_ratio： 数字， // 速度比 （0.5-2.0）
volume_ratio： 数字， // 成交量比 （0.5-2.0）
pitch_ratio：数字 // 节距比 （0.5-2.0）
}

```

### TTS 状态

TTS 服务将具有以下状态：

- 'disconnected'：未连接到 WebSocket 服务器
- 'connecting'：连接到 WebSocket 服务器
- 'connected'：已连接到 WebSocket 服务器
- 'speaking'：将文本转换为语音和/或播放音频
- 'error'：发生错误

## 错误处理

TTS 服务将处理以下错误场景：

1. **连接错误**：无法连接到 WebSocket 服务器

- 显示错误消息
- 提供重试功能

2. **TTS 转换错误**：无法将文本转换为语音

- 显示错误消息
- 记录详细的错误信息

3. **播放错误**：播放音频失败
- 显示错误消息
- 尝试恢复或提供替代播放选项

## 测试策略

1. **单元测试**：

- 隔离测试 TTS 服务模块
- 模拟 WebSocket 连接和响应
- 验证正确的状态管理

2. **集成测试**：

- 测试 AIChat 组件与 TTS 服务的集成
- 验证正确的事件处理和 UI 更新

3. **手动测试**：
- 使用各种文本输入进行测试
- 测试连接处理和错误场景
- 测试播放控件
```
