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
