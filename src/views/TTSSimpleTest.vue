<template>
  <div class="tts-simple-test">
    <h1>TTS 简单测试页面</h1>

    <div class="test-section">
      <h2>测试消息</h2>
      <div class="message-container">
        <div class="message">
          <div class="message-content">
            {{ testMessage }}
          </div>
          <div class="message-actions">
            <button
              class="action-button"
              @click="onListen({ id: 'test-message', content: testMessage })"
              :disabled="isProcessing"
            >
              {{ isPlaying ? "暂停播放" : "朗读消息" }}
            </button>
            <button
              class="action-button stop-button"
              @click="stopPlayback"
              :disabled="!isPlaying && !isPaused"
            >
              停止播放
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="status-section" v-if="ttsStatus.connection !== 'disconnected'">
      <h2>TTS 状态</h2>
      <div class="status-item">
        <span class="status-label">连接状态:</span>
        <span
          class="status-value"
          :class="'connection-' + ttsStatus.connection"
        >
          {{ getConnectionStatusText() }}
        </span>
      </div>
      <div class="status-item">
        <span class="status-label">播放状态:</span>
        <span class="status-value" :class="'playback-' + ttsStatus.playback">
          {{ getPlaybackStatusText() }}
        </span>
      </div>
      <div class="status-item" v-if="ttsStatus.message">
        <span class="status-label">状态消息:</span>
        <span class="status-value">{{ ttsStatus.message }}</span>
      </div>

      <div class="playback-progress" v-if="isPlaying || isPaused">
        <div class="progress-bar">
          <div
            class="progress"
            :style="{ width: playbackProgress + '%' }"
          ></div>
        </div>
        <div class="progress-text">{{ playbackProgress }}%</div>
      </div>
    </div>

    <div class="debug-section">
      <h2>调试信息</h2>
      <div class="debug-item">
        <span class="debug-label">当前播放消息ID:</span>
        <span class="debug-value">{{ currentPlayingMessageId }}</span>
      </div>
      <div class="debug-item">
        <span class="debug-label">提取的纯文本:</span>
        <button class="debug-button" @click="showExtractedText">
          查看提取的纯文本
        </button>
      </div>
      <div class="debug-item" v-if="extractedText">
        <pre class="debug-text">{{ extractedText }}</pre>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import ttsService from "../utils/ttsService";
import fixedOnListen from "../utils/ttsFixedListener";
import { message } from "ant-design-vue";

export default {
  name: "TTSSimpleTest",
  setup() {
    // 测试消息
    const testMessage = ref(`# 这是一个测试消息

这是一个用于测试TTS功能的消息。它包含了一些**格式化**的文本，比如*斜体*和**粗体**。

## 代码示例

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

## 列表示例

- 项目1
- 项目2
- 项目3

## 表格示例

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |

> 这是一个引用

这是一个[链接](https://example.com)。

![这是一个图片](https://example.com/image.jpg)

这是一个很长的段落，用于测试TTS服务处理长文本的能力。它包含了很多文字，这样我们就可以测试TTS服务是否能够正确地处理长文本。这是一个很长的段落，用于测试TTS服务处理长文本的能力。它包含了很多文字，这样我们就可以测试TTS服务是否能够正确地处理长文本。`);

    // TTS 相关状态
    const tts = ref(null);
    const ttsStatus = ref({
      connection: "disconnected",
      playback: "idle",
      message: null,
    });
    const currentPlayingMessageId = ref(null);
    const isProcessing = ref(false);
    const playbackProgress = ref(0);
    const progressUpdateTimer = ref(null);
    const extractedText = ref(null);

    // 计算属性
    const isPlaying = computed(() => ttsStatus.value.playback === "playing");
    const isPaused = computed(() => ttsStatus.value.playback === "paused");

    // 初始化TTS服务
    function initTTSService() {
      if (tts.value) {
        return; // 如果已经初始化，则不再重复初始化
      }

      // 初始化 TTS 服务
      tts.value = ttsService.init({
        // 状态变更回调
        onStatusChange: (status) => {
          console.log("TTS 状态变更:", status);
          ttsStatus.value = status;

          // 如果正在播放，更新进度
          if (status.playback === "playing") {
            startProgressUpdates();
          } else if (
            status.playback === "idle" ||
            status.playback === "error"
          ) {
            stopProgressUpdates();
          }
        },
        // 错误回调
        onError: (error) => {
          console.error("TTS 错误:", error);
          message.error(`语音服务错误: ${error.message || "未知错误"}`);
        },
        // 自动重连设置
        autoReconnect: true,
        reconnectAttempts: 3,
        reconnectInterval: 2000,
      });

      // 连接到 TTS 服务器
      tts.value
        .connect()
        .then(() => {
          console.log("TTS 服务连接成功");
        })
        .catch((error) => {
          console.error("TTS 服务连接失败:", error);
        });
    }

    // 开始更新播放进度
    function startProgressUpdates() {
      stopProgressUpdates();

      progressUpdateTimer.value = setInterval(() => {
        if (!tts.value || !currentPlayingMessageId.value) {
          playbackProgress.value = 0;
          return;
        }

        try {
          // 从TTS服务获取播放进度
          const progress = tts.value.getPlaybackProgress();
          playbackProgress.value = progress.progress || 0;
        } catch (error) {
          console.error("获取播放进度失败:", error);
        }
      }, 200);
    }

    // 停止更新播放进度
    function stopProgressUpdates() {
      if (progressUpdateTimer.value) {
        clearInterval(progressUpdateTimer.value);
        progressUpdateTimer.value = null;
      }
    }

    // TTS 相关功能
    function onListen(info) {
      // 使用修复版的onListen函数
      fixedOnListen(
        info,
        tts.value,
        {
          currentPlayingMessageId: currentPlayingMessageId.value,
          ttsStatus: ttsStatus.value,
        },
        message,
        (newState) => {
          // 更新状态
          if (newState.currentPlayingMessageId !== undefined) {
            currentPlayingMessageId.value = newState.currentPlayingMessageId;
          }
        }
      );
    }

    // 停止播放
    function stopPlayback() {
      if (tts.value) {
        tts.value.stop();
        currentPlayingMessageId.value = null;
      }
    }

    // 显示提取的纯文本
    function showExtractedText() {
      const plainText = fixedOnListen.extractPlainText(testMessage.value);
      extractedText.value = plainText;
    }

    // 获取连接状态文本
    function getConnectionStatusText() {
      switch (ttsStatus.value.connection) {
        case "disconnected":
          return "未连接";
        case "connecting":
          return "正在连接";
        case "connected":
          return "已连接";
        case "error":
          return "连接错误";
        case "reconnecting":
          return "重新连接中";
        default:
          return "未知状态";
      }
    }

    // 获取播放状态文本
    function getPlaybackStatusText() {
      switch (ttsStatus.value.playback) {
        case "idle":
          return "空闲";
        case "loading":
          return "加载中";
        case "ready":
          return "准备就绪";
        case "playing":
          return "播放中";
        case "paused":
          return "已暂停";
        case "error":
          return "播放错误";
        default:
          return "未知状态";
      }
    }

    // 组件挂载时
    onMounted(() => {
      console.log("TTS简单测试页面已加载");

      // 初始化TTS服务
      initTTSService();
    });

    // 组件卸载前
    onBeforeUnmount(() => {
      // 清理TTS资源
      stopProgressUpdates();
      if (tts.value) {
        tts.value.cleanup();
        tts.value = null;
      }
    });

    // 监听播放状态变化
    watch(
      () => ttsStatus.value.playback,
      (newStatus) => {
        console.log("TTS播放状态变化:", newStatus);

        if (newStatus === "playing") {
          // 播放开始，关闭加载提示
          message.destroy("tts-loading");
          message.success("语音播放开始");
          // 开始更新进度
          startProgressUpdates();
        } else if (newStatus === "error") {
          // 播放错误
          message.destroy("tts-loading");
          message.error("语音播放失败");
          currentPlayingMessageId.value = null;
          stopProgressUpdates(); // 停止更新进度
        } else if (newStatus === "idle") {
          // 播放结束
          message.info("语音播放完成");
          currentPlayingMessageId.value = null;
          stopProgressUpdates(); // 停止更新进度
        } else if (newStatus === "paused") {
          // 播放暂停，但继续更新进度（显示暂停位置）
          message.info("语音播放已暂停");
        } else if (newStatus === "ready") {
          // 音频准备就绪
          message.destroy("tts-loading");
          message.success("音频准备就绪，可以播放");
        }
      }
    );

    return {
      testMessage,
      ttsStatus,
      currentPlayingMessageId,
      isProcessing,
      playbackProgress,
      extractedText,
      isPlaying,
      isPaused,
      onListen,
      stopPlayback,
      showExtractedText,
      getConnectionStatusText,
      getPlaybackStatusText,
    };
  },
};
</script>

<style scoped>
.tts-simple-test {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1,
h2 {
  color: #333;
}

.test-section,
.status-section,
.debug-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #f9f9f9;
}

.message-container {
  margin-top: 20px;
}

.message {
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #fff;
}

.message-content {
  margin-bottom: 15px;
  white-space: pre-wrap;
}

.message-actions {
  display: flex;
  gap: 10px;
}

.action-button {
  padding: 8px 16px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.action-button:hover {
  background-color: #45a049;
}

.action-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.stop-button {
  background-color: #f44336;
}

.stop-button:hover {
  background-color: #d32f2f;
}

.status-item {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.status-label,
.debug-label {
  font-weight: bold;
  margin-right: 10px;
  min-width: 100px;
}

.status-value {
  padding: 3px 8px;
  border-radius: 3px;
}

.connection-connected {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.connection-connecting,
.connection-reconnecting {
  background-color: #fff8e1;
  color: #ff8f00;
}

.connection-disconnected {
  background-color: #f5f5f5;
  color: #757575;
}

.connection-error {
  background-color: #ffebee;
  color: #c62828;
}

.playback-playing {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.playback-paused {
  background-color: #fff8e1;
  color: #ff8f00;
}

.playback-loading {
  background-color: #e3f2fd;
  color: #1565c0;
}

.playback-ready {
  background-color: #e8eaf6;
  color: #3949ab;
}

.playback-idle {
  background-color: #f5f5f5;
  color: #757575;
}

.playback-error {
  background-color: #ffebee;
  color: #c62828;
}

.playback-progress {
  margin-top: 15px;
}

.progress-bar {
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
  margin-bottom: 5px;
  position: relative;
  overflow: hidden;
}

.progress {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  font-size: 12px;
  color: #666;
}

.debug-item {
  margin-bottom: 10px;
}

.debug-button {
  padding: 5px 10px;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.debug-button:hover {
  background-color: #1976d2;
}

.debug-text {
  margin-top: 10px;
  padding: 10px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}
</style>
