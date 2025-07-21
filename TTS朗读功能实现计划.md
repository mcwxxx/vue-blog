# TTS 朗读功能实现计划

## 功能概述

实现 AI 聊天界面中的内容朗读功能，用户可以点击朗读按钮听取 AI 回复的语音版本。该功能采用 WebSocket 连接 TTS 服务器，支持实时语音合成和播放。

## 技术架构

### 1. 模块化设计

```
src/
├── composables/
│   └── useTTS.ts              # TTS功能组合函数
├── services/
│   └── ttsService.ts          # TTS WebSocket服务
├── utils/
│   ├── textExtractor.ts       # 文本提取工具
│   └── audioPlayer.ts         # 音频播放管理
└── components/chat/
    └── ChatBubble.vue         # 聊天气泡组件（添加朗读按钮）
```

### 2. 核心模块设计

#### 2.1 TTS WebSocket 服务 (`src/services/ttsService.ts`)

**功能职责：**

- 管理 WebSocket 连接
- 处理 TTS 请求和响应
- 音频数据接收和缓存
- 连接状态管理

**API 设计：**

```typescript
interface TTSService {
  // 初始化服务
  init(options: TTSOptions): Promise<void>;

  // 连接WebSocket
  connect(): Promise<boolean>;

  // 断开连接
  disconnect(): void;

  // 发送TTS请求
  synthesize(text: string, options?: VoiceOptions): Promise<string>;

  // 获取连接状态
  getStatus(): TTSStatus;

  // 事件监听
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
}

interface VoiceOptions {
  voice_type: string; // 声音类型
  speed_ratio: number; // 语速 (0.5-2.0)
  volume_ratio: number; // 音量 (0.5-2.0)
  pitch_ratio: number; // 音调 (0.5-2.0)
}

type TTSStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "synthesizing"
  | "error";
```

**实现要点：**

- 参考 `client-demo.html` 中的 WebSocket 连接逻辑
- 支持音频数据流式接收
- 实现连接重试机制
- 提供详细的错误处理

#### 2.2 TTS 组合函数 (`src/composables/useTTS.ts`)

**功能职责：**

- 封装 TTS 服务调用
- 管理朗读状态
- 提供 Vue 组件友好的 API
- 处理组件生命周期

**API 设计：**

```typescript
interface UseTTSReturn {
  // 状态
  isConnected: Ref<boolean>;
  isPlaying: Ref<boolean>;
  isSynthesizing: Ref<boolean>;
  currentAudioId: Ref<string | null>;
  error: Ref<string | null>;

  // 方法
  speak(text: string, messageId: string): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;

  // 配置
  setVoiceOptions(options: VoiceOptions): void;
}
```

#### 2.3 文本提取工具 (`src/utils/textExtractor.ts`)

**功能职责：**

- 从 Markdown 文本中提取纯文本
- 清理格式标记
- 处理特殊字符

**API 设计：**

```typescript
interface TextExtractor {
  // 提取纯文本
  extractPlainText(markdown: string): string;

  // 清理文本
  cleanText(text: string): string;

  // 验证文本
  validateText(text: string): boolean;
}
```

**实现要点：**

- 复用 `ttsFixedListener.js` 中的文本提取逻辑
- 支持代码块、链接、列表等 Markdown 元素的处理
- 保留文本的可读性

#### 2.4 音频播放管理 (`src/utils/audioPlayer.ts`)

**功能职责：**

- 管理音频播放实例
- 控制播放状态
- 处理播放事件

**API 设计：**

```typescript
interface AudioPlayer {
  // 加载音频
  load(audioBlob: Blob): Promise<void>;

  // 播放控制
  play(): Promise<void>;
  pause(): void;
  stop(): void;

  // 状态查询
  isPlaying(): boolean;
  getDuration(): number;
  getCurrentTime(): number;

  // 事件监听
  onEnded(callback: Function): void;
  onError(callback: Function): void;
}
```

### 3. UI 集成设计

#### 3.1 ChatBubble 组件修改

**在现有的"重新生成"和"复制"按钮基础上添加朗读按钮：**

```vue
<template>
  <!-- 现有的footer函数中添加朗读按钮 -->
  <div style="display: flex; gap: 8px; margin-top: 8px">
    <!-- 现有按钮 -->
    <Button
      type="text"
      size="small"
      :icon="ReloadOutlined"
      @click="onRegenerate"
    />
    <Button type="text" size="small" :icon="CopyOutlined" @click="onCopy" />

    <!-- 新增朗读按钮 -->
    <Button
      type="text"
      size="small"
      :icon="isPlaying ? PauseCircleOutlined : SoundOutlined"
      :loading="isSynthesizing"
      :disabled="!hasValidText"
      @click="handleTTSAction"
      :title="getButtonTitle()"
    />
  </div>
</template>
```

**按钮状态设计：**

- 默认状态：显示音频图标，可点击开始朗读
- 合成中：显示加载动画
- 播放中：显示暂停图标，可点击暂停
- 暂停状态：显示播放图标，可点击继续
- 禁用状态：文本为空或无效时禁用

#### 3.2 按钮交互逻辑

```typescript
// 朗读按钮点击处理
const handleTTSAction = async () => {
  if (isPlaying.value) {
    // 当前正在播放，点击暂停
    pause();
  } else if (currentAudioId.value === messageId) {
    // 当前消息已有音频，点击继续播放
    resume();
  } else {
    // 开始新的朗读
    await speak(content, messageId);
  }
};

// 按钮标题动态显示
const getButtonTitle = () => {
  if (isSynthesizing.value) return "正在合成语音...";
  if (isPlaying.value) return "暂停朗读";
  if (currentAudioId.value === messageId) return "继续朗读";
  return "朗读内容";
};
```

## 实现步骤

### 第一阶段：核心服务开发

1. **创建 TTS WebSocket 服务**

   - 实现 `src/services/ttsService.ts`
   - 参考 `client-demo.html` 的 WebSocket 逻辑
   - 添加错误处理和重连机制

2. **创建文本提取工具**

   - 实现 `src/utils/textExtractor.ts`
   - 复用 `ttsFixedListener.js` 的文本处理逻辑
   - 优化 Markdown 解析

3. **创建音频播放管理**
   - 实现 `src/utils/audioPlayer.ts`
   - 支持 Blob 音频数据播放
   - 添加播放状态管理

### 第二阶段：组合函数开发

4. **创建 TTS 组合函数**

   - 实现 `src/composables/useTTS.ts`
   - 整合各个服务模块
   - 提供 Vue 响应式 API

5. **单元测试**
   - 测试各个模块的独立功能
   - 验证错误处理逻辑
   - 测试状态管理

### 第三阶段：UI 集成

6. **修改 ChatBubble 组件**

   - 在 footer 函数中添加朗读按钮
   - 集成 useTTS 组合函数
   - 实现按钮状态管理

7. **样式和交互优化**
   - 添加按钮动画效果
   - 优化加载状态显示
   - 实现音频可视化（可选）

### 第四阶段：测试和优化

8. **集成测试**

   - 测试完整的朗读流程
   - 验证多消息并发处理
   - 测试网络异常处理

9. **性能优化**

   - 音频缓存策略
   - 内存管理优化
   - 网络请求优化

10. **用户体验优化**
    - 添加音频进度显示
    - 支持语音参数配置
    - 添加键盘快捷键支持

## 技术要点

### WebSocket 连接管理

```typescript
// 连接URL构建（参考client-demo.html）
const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
  window.location.host
}/api/tts/ws`;

// 连接状态管理
class TTSWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve(true);
      };

      this.ws.onerror = () => {
        this.handleReconnect();
        reject(new Error("连接失败"));
      };

      this.ws.onmessage = this.handleMessage.bind(this);
    });
  }
}
```

### 音频数据处理

```typescript
// 音频数据收集和播放
class AudioDataManager {
  private audioChunks: Blob[] = [];
  private audioPlayer: HTMLAudioElement | null = null;

  addChunk(chunk: Blob) {
    this.audioChunks.push(chunk);
  }

  createAudioBlob(): Blob {
    return new Blob(this.audioChunks, { type: "audio/mp3" });
  }

  async play(): Promise<void> {
    const audioBlob = this.createAudioBlob();
    const audioUrl = URL.createObjectURL(audioBlob);

    this.audioPlayer = new Audio(audioUrl);
    await this.audioPlayer.play();
  }
}
```

### 状态管理

```typescript
// 全局TTS状态管理
interface TTSState {
  connectionStatus: TTSStatus;
  currentPlayingMessageId: string | null;
  synthesizingMessageIds: Set<string>;
  audioCache: Map<string, Blob>;
  voiceOptions: VoiceOptions;
}

const ttsState = reactive<TTSState>({
  connectionStatus: "disconnected",
  currentPlayingMessageId: null,
  synthesizingMessageIds: new Set(),
  audioCache: new Map(),
  voiceOptions: {
    voice_type: "S_Z4CpYSGv1",
    speed_ratio: 1.0,
    volume_ratio: 1.0,
    pitch_ratio: 1.0,
  },
});
```

## 错误处理策略

### 1. 网络错误

- WebSocket 连接失败：显示连接错误，提供重试按钮
- 请求超时：显示超时提示，自动重试
- 网络中断：自动重连，保持用户状态

### 2. 服务错误

- TTS 服务不可用：显示服务错误，禁用朗读功能
- 音频合成失败：显示合成失败提示，允许重试
- 音频格式错误：降级处理，显示错误信息

### 3. 用户操作错误

- 文本为空：禁用朗读按钮，显示提示
- 重复点击：防抖处理，避免重复请求
- 快速切换：取消前一个请求，开始新请求

## 性能优化

### 1. 音频缓存

- 缓存已合成的音频数据
- LRU 策略管理缓存大小
- 支持缓存清理

### 2. 请求优化

- 文本预处理，减少无效请求
- 请求去重，避免重复合成
- 分片处理长文本

### 3. 内存管理

- 及时释放音频资源
- 清理无用的 Blob 对象
- 监控内存使用情况

## 配置选项

### 用户可配置项

```typescript
interface TTSConfig {
  // 语音参数
  voiceType: string; // 声音类型
  speed: number; // 语速
  volume: number; // 音量
  pitch: number; // 音调

  // 功能开关
  autoPlay: boolean; // 自动播放
  cacheEnabled: boolean; // 启用缓存

  // 网络配置
  connectionTimeout: number; // 连接超时
  requestTimeout: number; // 请求超时
  maxRetries: number; // 最大重试次数
}
```

### 默认配置

```typescript
const defaultConfig: TTSConfig = {
  voiceType: "S_Z4CpYSGv1",
  speed: 1.0,
  volume: 1.0,
  pitch: 1.0,
  autoPlay: false,
  cacheEnabled: true,
  connectionTimeout: 5000,
  requestTimeout: 15000,
  maxRetries: 3,
};
```

## 测试计划

### 单元测试

- TTS 服务模块测试
- 文本提取工具测试
- 音频播放管理测试
- 组合函数测试

### 集成测试

- 完整朗读流程测试
- 错误处理测试
- 并发请求测试
- 网络异常测试

### 用户体验测试

- 按钮交互测试
- 音频质量测试
- 性能压力测试
- 兼容性测试

## 部署注意事项

### 1. 服务器配置

- 确保 TTS WebSocket 服务正常运行
- 配置正确的 CORS 策略
- 设置合适的超时参数

### 2. 客户端配置

- 检查浏览器音频支持
- 配置合适的缓存策略
- 添加错误监控

### 3. 网络优化

- 使用 CDN 加速音频传输
- 启用 gzip 压缩
- 配置合适的缓存头

## 后续扩展

### 1. 高级功能

- 支持多语言 TTS
- 添加语音情感控制
- 实现语音克隆

### 2. 用户体验

- 添加音频可视化
- 支持语音速度实时调节
- 实现语音书签功能

### 3. 技术优化

- 使用 Web Audio API 优化播放
- 实现音频流式播放
- 添加离线 TTS 支持

## 安全性考虑

### 1. 数据安全

```typescript
// 敏感信息过滤
class TextSanitizer {
  private sensitivePatterns = [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // 信用卡号
    /\b\d{3}-\d{2}-\d{4}\b/g, // 社会保险号
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // 邮箱
  ];

  sanitize(text: string): string {
    let sanitized = text;
    this.sensitivePatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "[已隐藏]");
    });
    return sanitized;
  }
}
```

### 2. 输入验证

- 文本长度限制（最大 10000 字符）
- 特殊字符过滤
- XSS 攻击防护
- 频率限制（防止滥用）

### 3. 网络安全

- WebSocket 连接使用 WSS 加密
- 实现请求签名验证
- 添加 CSRF 保护
- 设置合理的超时限制

## 可访问性（A11y）支持

### 3. 视觉指示器

```css
/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .tts-button {
    border: 2px solid currentColor;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .tts-button {
    transition: none;
  }
}
```

## 监控和日志

### 1. 性能监控

```typescript
class TTSPerformanceMonitor {
  private metrics = {
    synthesisTime: [],
    audioLoadTime: [],
    connectionTime: [],
    errorCount: 0,
    successCount: 0,
  };

  recordSynthesisTime(duration: number) {
    this.metrics.synthesisTime.push(duration);
    this.reportMetrics();
  }

  recordError(error: Error, context: string) {
    this.metrics.errorCount++;
    console.error(`TTS Error [${context}]:`, error);
    // 发送到监控服务
    this.sendToMonitoring({
      type: "error",
      error: error.message,
      context,
      timestamp: Date.now(),
    });
  }
}
```

````

## 具体实现示例

### 1. 完整的useTTS组合函数
```typescript
// src/composables/useTTS.ts
import { ref, reactive, onUnmounted } from 'vue'
import { TTSService } from '@/services/ttsService'
import { TextExtractor } from '@/utils/textExtractor'
import { AudioPlayer } from '@/utils/audioPlayer'

export function useTTS() {
  const ttsService = new TTSService()
  const textExtractor = new TextExtractor()
  const audioPlayer = new AudioPlayer()

  // 响应式状态
  const state = reactive({
    isConnected: false,
    isPlaying: false,
    isSynthesizing: false,
    currentAudioId: null as string | null,
    error: null as string | null,
    progress: 0
  })

  // 语音配置
  const voiceOptions = ref({
    voice_type: 'S_Z4CpYSGv1',
    speed_ratio: 1.0,
    volume_ratio: 1.0,
    pitch_ratio: 1.0
  })

  // 初始化连接
  const initConnection = async () => {
    try {
      await ttsService.connect()
      state.isConnected = true
      state.error = null
    } catch (error) {
      state.error = '连接TTS服务失败'
      console.error('TTS connection failed:', error)
    }
  }

  // 朗读文本
  const speak = async (text: string, messageId: string) => {
    if (!state.isConnected) {
      await initConnection()
    }

    try {
      state.isSynthesizing = true
      state.error = null

      // 提取纯文本
      const plainText = textExtractor.extractPlainText(text)
      if (!plainText.trim()) {
        throw new Error('没有可朗读的文本内容')
      }

      // 发送TTS请求
      const audioBlob = await ttsService.synthesize(plainText, voiceOptions.value)

      // 播放音频
      await audioPlayer.load(audioBlob)
      await audioPlayer.play()

      state.currentAudioId = messageId
      state.isPlaying = true

      // 监听播放结束
      audioPlayer.onEnded(() => {
        state.isPlaying = false
        state.currentAudioId = null
      })

    } catch (error) {
      state.error = error.message
      console.error('TTS speak failed:', error)
    } finally {
      state.isSynthesizing = false
    }
  }

  // 暂停播放
  const pause = () => {
    audioPlayer.pause()
    state.isPlaying = false
  }

  // 继续播放
  const resume = () => {
    audioPlayer.play()
    state.isPlaying = true
  }

  // 停止播放
  const stop = () => {
    audioPlayer.stop()
    state.isPlaying = false
    state.currentAudioId = null
  }

  // 清理资源
  onUnmounted(() => {
    stop()
    ttsService.disconnect()
  })

  return {
    // 状态
    ...toRefs(state),
    voiceOptions,

    // 方法
    speak,
    pause,
    resume,
    stop,
    initConnection,

    // 配置
    setVoiceOptions: (options: Partial<VoiceOptions>) => {
      voiceOptions.value = { ...voiceOptions.value, ...options }
    }
  }
}
````

### 2. 错误边界组件

```vue
<!-- src/components/TTSErrorBoundary.vue -->
<template>
  <div class="tts-error-boundary">
    <slot v-if="!hasError" />
    <div v-else class="tts-error-fallback">
      <Icon type="warning" />
      <span>朗读功能暂时不可用</span>
      <Button size="small" @click="retry">重试</Button>
    </div>
  </div>
</template>

<script setup>
import { ref, provide } from "vue";

const hasError = ref(false);
const errorInfo = ref(null);

const handleError = (error, info) => {
  hasError.value = true;
  errorInfo.value = { error, info };
  console.error("TTS Error Boundary:", error, info);
};

const retry = () => {
  hasError.value = false;
  errorInfo.value = null;
};

// 提供错误处理函数给子组件
provide("ttsErrorHandler", handleError);
</script>
```

## 部署清单

### 1. 环境变量配置

```bash
# .env.production
VITE_TTS_WS_URL=wss://your-domain.com/api/tts/ws
VITE_TTS_TIMEOUT=15000
VITE_TTS_MAX_RETRIES=3
VITE_TTS_CACHE_SIZE=50
```

### 2. 构建优化

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "tts-vendor": ["@/services/ttsService", "@/utils/audioPlayer"],
        },
      },
    },
  },
});
```

### 3. 服务器配置检查

- [ ] TTS WebSocket 服务运行正常
- [ ] CORS 策略配置正确
- [ ] SSL 证书配置（WSS 支持）
- [ ] 负载均衡配置
- [ ] 监控和日志系统

---

**总结：**

本计划采用模块化设计，将 TTS 功能分解为独立的服务模块，确保代码的可维护性和可扩展性。通过参考现有的 client-demo.html 实现和 ChatBubble 组件的按钮结构，可以快速集成朗读功能，为用户提供良好的语音交互体验。

实现过程中重点关注错误处理、性能优化、安全性、可访问性和用户体验，确保功能的稳定性和易用性。通过分阶段实施，可以逐步完善功能，降低开发风险。
