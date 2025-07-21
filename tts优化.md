# TTS 朗读功能优化方案文档

## 📋 项目概述

本文档详细描述了 Vue Blog 应用中 TTS 朗读功能的问题分析、优化方案和实施计划。

## 🔍 问题分析

### 1. 核心问题

#### 问题 1：朗读按钮状态控制逻辑错误

- **现象**：点击朗读按钮时没有暂停，而是重新请求
- **根因**：`handleTTSAction`函数中的状态判断逻辑不准确
- **影响**：用户体验差，无法正常控制播放状态

#### 问题 2：打字机效果期间按钮可点击

- **现象**：消息还在流式渲染时，朗读按钮就可以点击
- **根因**：缺少对消息完成状态的检测
- **影响**：可能朗读不完整的内容

#### 问题 3：消息次序混乱

- **现象**：点击第二条消息，朗读了第一条内容
- **根因**：TTS 服务中音频数据与请求 ID 映射错误
- **影响**：朗读内容与用户期望不符

### 2. 架构问题

#### 问题 4：内存泄漏风险

- 音频 URL 未及时释放
- WebSocket 连接可能重复创建

#### 问题 5：性能问题

- 大量消息时渲染性能差
- 缺少音频缓存机制

#### 问题 6：状态同步问题

- TTS 服务状态与 UI 状态不一致
- 多组件实例可能冲突

## 🔧 解决方案

### 方案 1：立即修复（推荐优先实施）

#### 1.1 修复按钮状态控制

```vue:g:/mmd/mmdai/figmamcp/vue-blog/src/components/chat/ChatBubble.vue
// TTS 朗读处理
async function handleTTSAction(content: string, messageId: string) {
  try {
    // 检查消息是否还在加载中
    if (isMessageLoading(messageId)) {
      message.warning('消息还在生成中，请稍后再试');
      return;
    }

    // 如果当前消息正在播放，则暂停
    if (isPlaying.value && isCurrentMessage(messageId)) {
      pause();
      emit('ttsPause');
      return;
    }

    // 如果当前消息已暂停，则继续播放
    if (currentMessageId.value === messageId && !isPlaying.value && !isSynthesizing.value) {
      await resume();
      emit('ttsResume');
      return;
    }

    // 开始新的朗读（会自动停止其他播放）
    await speak(content, messageId);
    emit('ttsPlay', content, messageId);
  } catch (error) {
    console.error('TTS操作失败:', error);
    message.error(`朗读失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 检查消息是否正在加载
function isMessageLoading(messageId: string): boolean {
  const message = props.messages.find(m => m.id === messageId);
  if (!message) return false;

  // 检查消息状态
  const isLoading = message.status === 'loading' ||
                   message.message?.status === 'loading';

  // 检查是否还在打字机效果中
  const bubbleItem = bubbleItems.value.find(item => item.messageId === messageId);
  const hasTyping = bubbleItem?.typing !== false;

  return isLoading || (hasTyping && message.message.role === 'assistant');
}

// 修改按钮禁用逻辑
const roles = {
  assistant: {
    placement: 'start',
    messageRender: renderAssistantMessage,
    footer: (content: string, info: any) => {
      if (info?.loading || info?.status === 'loading') {
        return null;
      }

      const messageId = info?.messageId || info?.key || `msg-${Date.now()}`;
      const hasValidText = hasValidTextForTTS(content);
      const isLoading = isMessageLoading(messageId);

      return h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } }, [
        h(Button, {
          type: 'text',
          size: 'small',
          icon: h(ReloadOutlined),
          title: '重新生成',
          onClick: () => onRegenerate(content),
        }),
        h(Button, {
          type: 'text',
          size: 'small',
          icon: h(CopyOutlined),
          title: '复制内容',
          onClick: () => onCopy(content),
        }),
        h(Button, {
          type: 'text',
          size: 'small',
          icon: getTTSButtonIcon(messageId),
          title: getTTSButtonTitle(messageId),
          disabled: !hasValidText || isLoading || (!canSpeakText(content) && !isCurrentMessage(messageId)),
          loading: isSynthesizing.value && isCurrentMessage(messageId),
          onClick: () => handleTTSAction(content, messageId),
        }),
      ]);
    },
  },
  user: {
    placement: 'end',
  },
};
```

#### 1.2 修复 TTS 服务请求映射

```typescript:g:/mmd/mmdai/figmamcp/vue-blog/src/services/ttsService.ts
// 修改音频数据处理逻辑
private handleAudioData(blob: Blob): void {
  // 改进：使用请求头信息或者时间戳来匹配正确的请求
  const requests = Array.from(this.pendingRequests.entries());
  if (requests.length === 0) {
    console.warn('收到音频数据但没有待处理的请求');
    return;
  }

  // 优先匹配最近的请求，但要确保是正确的请求
  let targetRequest: [string, any] | null = null;

  // 如果只有一个请求，直接使用
  if (requests.length === 1) {
    targetRequest = requests[0];
  } else {
    // 多个请求时，使用最新的正在处理的请求
    targetRequest = requests.find(([id, req]) => req.chunks.length === 0) || requests[requests.length - 1];
  }

  if (targetRequest) {
    const [requestId, request] = targetRequest;
    request.chunks.push(blob);

    console.log(`收到音频数据: ${blob.size} 字节，请求ID: ${requestId}，当前总块数: ${request.chunks.length}`);

    // 设置完成定时器
    if ((request as any).completionTimer) {
      clearTimeout((request as any).completionTimer);
    }

    (request as any).completionTimer = setTimeout(() => {
      if (this.pendingRequests.has(requestId) && request.chunks.length > 0) {
        console.log(`音频数据接收完成，请求ID: ${requestId}`);
        clearTimeout(request.timeout);
        const audioBlob = new Blob(request.chunks, { type: "audio/mp3" });
        request.resolve(audioBlob);
        this.pendingRequests.delete(requestId);

        this.status = "connected";
        this.emit("statusChange", this.status);
        this.emit("synthesisCompleted", requestId);
      }
    }, 1000);
  }
}

// 改进请求ID生成，包含更多上下文信息
private generateRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `tts_${timestamp}_${random}`;
}

// 发送请求时添加更多日志
async synthesize(text: string, options: VoiceOptions = {
  voice_type: "S_Z4CpYSGv1",
  speed_ratio: 1.0,
  volume_ratio: 1.0,
  pitch_ratio: 1.0
}): Promise<Blob> {
  if (this.status !== "connected") {
    throw new Error(TTSErrorMessages[TTSErrorType.SERVICE_UNAVAILABLE]);
  }

  if (!text.trim()) {
    throw new Error("文本内容不能为空");
  }

  return new Promise((resolve, reject) => {
    const requestId = this.generateRequestId();
    console.log(`开始TTS请求，ID: ${requestId}，文本长度: ${text.length}`);

    // ... 其余代码保持不变

    // 在发送请求时添加请求ID到消息中
    const request = {
      id: requestId, // 添加请求ID
      text: text,
      options: {
        voice_type: options.voice_type || this.config.synthesis.voice,
        speed_ratio: options.speed_ratio || this.config.synthesis.speed,
        volume_ratio: options.volume_ratio || this.config.synthesis.volume,
        pitch_ratio: options.pitch_ratio || this.config.synthesis.pitch
      }
    };

    // ... 其余代码
  });
}
```

#### 1.3 添加音频缓存机制

```typescript:g:/mmd/mmdai/figmamcp/vue-blog/src/composables/useTTS.ts
// 添加音频缓存
const audioCache = new Map<string, Blob>();
const maxCacheSize = 10; // 最大缓存数量

// 生成缓存键
function generateCacheKey(text: string, options: VoiceOptions): string {
  const optionsStr = JSON.stringify(options);
  return `${text.substring(0, 100)}_${btoa(optionsStr).substring(0, 20)}`;
}

// 修改speak函数，添加缓存逻辑
const speak = async (text: string, messageId?: string): Promise<void> => {
  try {
    // 验证输入
    if (!text || typeof text !== 'string') {
      throw new Error('无效的文本内容');
    }

    // 确保已连接
    if (!state.isConnected) {
      await connect();
    }

    // 停止当前播放
    if (state.isPlaying || state.isPaused) {
      stop();
    }

    // 提取纯文本
    const plainText = textExtractor.extractPlainText(text);
    if (!textExtractor.validateText(plainText)) {
      throw new Error('没有可朗读的有效文本内容');
    }

    // 过滤敏感信息
    const sanitizedText = textExtractor.sanitize(plainText);

    // 检查缓存
    const cacheKey = generateCacheKey(sanitizedText, voiceOptions.value);
    let audioBlob = audioCache.get(cacheKey);

    if (!audioBlob) {
      // 缓存未命中，请求TTS服务
      state.isSynthesizing = true;
      state.currentMessageId = messageId || null;
      state.currentText = sanitizedText;
      state.error = null;

      console.log('开始 TTS 合成:', { messageId, textLength: sanitizedText.length, cached: false });

      audioBlob = await ttsService.synthesize(sanitizedText, voiceOptions.value);

      // 添加到缓存
      if (audioCache.size >= maxCacheSize) {
        // 删除最旧的缓存项
        const firstKey = audioCache.keys().next().value;
        audioCache.delete(firstKey);
      }
      audioCache.set(cacheKey, audioBlob);
    } else {
      console.log('使用缓存的音频:', { messageId, textLength: sanitizedText.length, cached: true });
      state.currentMessageId = messageId || null;
      state.currentText = sanitizedText;
    }

    // 检查是否被中断
    if (state.currentMessageId !== messageId) {
      console.log('TTS 播放被中断');
      return;
    }

    state.isSynthesizing = false;

    // 加载并播放音频
    await audioPlayer.load(audioBlob);
    await audioPlayer.play();

    state.isPlaying = true;
    state.isPaused = false;

    console.log('TTS 播放开始');

  } catch (error) {
    state.isSynthesizing = false;
    state.isPlaying = false;
    state.isPaused = false;

    const errorMessage = error instanceof Error ? error.message : 'TTS 朗读失败';
    state.error = errorMessage;
    state.lastError = error instanceof Error ? error : new Error(errorMessage);

    console.error('TTS 朗读失败:', error);
    throw error;
  }
};
```

### 方案 2：中期优化

#### 2.1 实现虚拟滚动

```vue:g:/mmd/mmdai/figmamcp/vue-blog/src/components/chat/VirtualChatList.vue
<template>
  <div ref="containerRef" class="virtual-chat-container" @scroll="handleScroll">
    <div class="virtual-spacer" :style="{ height: `${totalHeight}px` }">
      <div class="virtual-content" :style="{ transform: `translateY(${offsetY}px)` }">
        <ChatBubble
          v-for="item in visibleItems"
          :key="item.id"
          :messages="[item]"
          @regenerate="$emit('regenerate', $event)"
          @copy="$emit('copy', $event)"
          @ttsPlay="$emit('ttsPlay', $event)"
          @ttsPause="$emit('ttsPause')"
          @ttsResume="$emit('ttsResume')"
          @ttsStop="$emit('ttsStop')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import ChatBubble from './ChatBubble.vue';
import type { MessageInfo, BubbleDataType } from './ChatBubble.vue';

interface Props {
  messages: MessageInfo<BubbleDataType>[];
  itemHeight?: number;
  bufferSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  itemHeight: 120,
  bufferSize: 5
});

const emit = defineEmits<{
  regenerate: [content: string];
  copy: [content: string];
  ttsPlay: [content: string, messageId: string];
  ttsPause: [];
  ttsResume: [];
  ttsStop: [];
}>();

const containerRef = ref<HTMLElement>();
const scrollTop = ref(0);
const containerHeight = ref(0);

// 计算可见范围
const visibleRange = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight);
  const visibleCount = Math.ceil(containerHeight.value / props.itemHeight);
  const end = start + visibleCount;

  return {
    start: Math.max(0, start - props.bufferSize),
    end: Math.min(props.messages.length, end + props.bufferSize)
  };
});

// 可见项目
const visibleItems = computed(() => {
  const { start, end } = visibleRange.value;
  return props.messages.slice(start, end);
});

// 总高度
const totalHeight = computed(() => {
  return props.messages.length * props.itemHeight;
});

// 偏移量
const offsetY = computed(() => {
  return visibleRange.value.start * props.itemHeight;
});

// 滚动处理
function handleScroll(event: Event) {
  const target = event.target as HTMLElement;
  scrollTop.value = target.scrollTop;
}

// 更新容器高度
function updateContainerHeight() {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight;
  }
}

onMounted(() => {
  updateContainerHeight();
  window.addEventListener('resize', updateContainerHeight);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight);
});
</script>

<style scoped>
.virtual-chat-container {
  height: 100%;
  overflow-y: auto;
}

.virtual-spacer {
  position: relative;
}

.virtual-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
</style>
```

## 🔄 后台配合需求

### 1. WebSocket 协议优化

#### 1.1 请求响应格式标准化

**当前问题**：音频数据与请求 ID 映射不明确

**建议后台修改**：

```json
// 请求格式（前端发送）
{
  "id": "tts_1703123456789_abc123def",
  "text": "要朗读的文本内容",
  "options": {
    "voice_type": "S_Z4CpYSGv1",
    "speed_ratio": 1.0,
    "volume_ratio": 1.0,
    "pitch_ratio": 1.0
  }
}

// 响应格式（后台发送）
// 1. 开始处理响应
{
  "type": "tts_start",
  "id": "tts_1703123456789_abc123def",
  "status": "processing"
}

// 2. 音频数据头（在发送音频数据前）
{
  "type": "audio_header",
  "id": "tts_1703123456789_abc123def",
  "content_type": "audio/mp3",
  "estimated_size": 12345
}

// 3. 音频数据（二进制，需要在消息中包含请求ID）
// 建议：在WebSocket消息中添加自定义头部或使用分帧协议

// 4. 完成响应
{
  "type": "tts_complete",
  "id": "tts_1703123456789_abc123def",
  "status": "completed",
  "audio_size": 12345
}

// 5. 错误响应
{
  "type": "tts_error",
  "id": "tts_1703123456789_abc123def",
  "status": "error",
  "error_code": "SYNTHESIS_FAILED",
  "error_message": "语音合成失败"
}
```

#### 1.2 连接管理优化

**建议后台添加**：

```json
// 心跳检测
{
  "type": "ping",
  "timestamp": 1703123456789
}

// 心跳响应
{
  "type": "pong",
  "timestamp": 1703123456789
}

// 连接状态
{
  "type": "connection_status",
  "status": "connected",
  "server_info": {
    "version": "1.0.0",
    "max_text_length": 10000,
    "supported_voices": ["S_Z4CpYSGv1", "voice2"]
  }
}
```

## 📅 实施计划

### 阶段 1：紧急修复（1-2 天）

- [ ] 修复按钮状态控制逻辑
- [ ] 添加消息加载状态检测
- [ ] 修复 TTS 服务请求映射
- [ ] 后台：标准化 WebSocket 协议

### 阶段 2：功能优化（1 周）

- [ ] 实现音频缓存机制
- [ ] 添加错误重试逻辑
- [ ] 优化内存管理
- [ ] 后台：添加心跳检测和连接管理

### 阶段 3：性能优化（2-3 周）

- [ ] 实现虚拟滚动
- [ ] 重构 TTS 服务架构
- [ ] 添加性能监控
- [ ] 后台：实现音频缓存和统计功能

## 🎯 验收标准

### 功能验收

- [ ] 朗读按钮状态正确切换（播放/暂停/继续）
- [ ] 消息加载期间按钮正确禁用
- [ ] 点击特定消息朗读对应内容
- [ ] 音频缓存正常工作
- [ ] 错误处理和用户反馈完善

### 性能验收

- [ ] 100 条消息时页面渲染流畅
- [ ] 音频合成响应时间<3 秒
- [ ] 内存使用稳定，无明显泄漏
- [ ] WebSocket 连接稳定，自动重连正常

### 用户体验验收

- [ ] 操作响应及时，状态指示清晰
- [ ] 错误提示友好，恢复机制完善
- [ ] 多消息场景下交互逻辑正确

---

**总结**：本优化方案采用分阶段实施策略，优先解决核心问题，然后逐步完善功能和性能。后台主要需要配合标准化 WebSocket 协议和添加必要的监控功能，整体改动量适中，风险可控。
