<template>
  <div class="tts-test-page">
    <h1>TTS 服务测试页面</h1>

    <div class="basic-test-controls">
      <div class="input-group">
        <label for="test-text">输入要转换为语音的文本:</label>
        <textarea
          id="test-text"
          v-model="testText"
          rows="5"
          placeholder="请输入要转换为语音的文本..."
        ></textarea>
      </div>

      <div class="button-group">
        <button
          class="test-button"
          @click="speakText"
          :disabled="isProcessing || !testText.trim()"
        >
          {{ isPlaying ? "暂停播放" : "播放文本" }}
        </button>
        <button
          class="test-button"
          @click="stopPlayback"
          :disabled="!isPlaying && !isPaused"
        >
          停止播放
        </button>
      </div>

      <div class="status-panel" v-if="ttsStatus.connection !== 'disconnected'">
        <h3>TTS状态</h3>
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
          <div class="progress-text">
            {{ currentTime }} / {{ totalDuration }} ({{ playbackProgress }}%)
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import ttsService from "../utils/ttsService";

export default {
  name: "TTSTestPage",
  setup() {
    // 基础测试状态
    const testText = ref("这是一个测试文本，用于测试TTS服务的基本功能。");
    const tts = ref(null);
    const ttsStatus = ref({
      connection: "disconnected",
      playback: "idle",
      message: null,
    });
    const isProcessing = ref(false);
    const playbackProgress = ref(0);
    const currentTime = ref("00:00");
    const totalDuration = ref("00:00");
    const progressUpdateTimer = ref(null);

    // 计算属性
    const isPlaying = computed(() => ttsStatus.value.playback === "playing");
    const isPaused = computed(() => ttsStatus.value.playback === "paused");

    // 初始化TTS服务
    function initTTS() {
      if (tts.value) {
        tts.value.cleanup();
      }

      tts.value = ttsService.init({
        onStatusChange: (status) => {
          console.log("TTS状态变更:", status);
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
        onError: (error) => {
          console.error("TTS错误:", error);
        },
      });
    }

    // 开始更新播放进度
    function startProgressUpdates() {
      stopProgressUpdates();

      progressUpdateTimer.value = setInterval(() => {
        if (!tts.value) return;

        try {
          const progress = tts.value.getPlaybackProgress();
          playbackProgress.value = progress.progress || 0;
          currentTime.value = progress.formattedTime || "00:00";
          totalDuration.value = progress.formattedDuration || "00:00";
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

    // 播放文本
    async function speakText() {
      if (isPlaying.value) {
        // 如果正在播放，则暂停
        tts.value.pause();
        return;
      }

      if (isPaused.value) {
        // 如果已暂停，则继续播放
        tts.value.play();
        return;
      }

      if (!testText.value.trim()) {
        console.error("文本不能为空");
        return;
      }

      isProcessing.value = true;

      try {
        // 确保已连接
        if (!tts.value.isConnected()) {
          console.log("正在连接到TTS服务...");
          await tts.value.connect();
        }

        // 发送文本
        console.log(
          `正在将文本转换为语音: "${testText.value.substring(0, 30)}${
            testText.value.length > 30 ? "..." : ""
          }"`
        );
        await tts.value.speak(testText.value);

        // 播放音频
        await tts.value.play();
      } catch (error) {
        console.error(`TTS处理失败: ${error.message || "未知错误"}`);
      } finally {
        isProcessing.value = false;
      }
    }

    // 停止播放
    function stopPlayback() {
      if (tts.value) {
        tts.value.stop();
        console.log("播放已停止");
      }
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
      console.log("TTS测试页面已加载");

      // 初始化TTS服务
      initTTS();
    });

    // 组件卸载前
    onBeforeUnmount(() => {
      // 清理TTS资源
      if (tts.value) {
        tts.value.cleanup();
        tts.value = null;
      }

      // 停止进度更新
      stopProgressUpdates();
    });

    return {
      // 状态
      testText,
      ttsStatus,
      isProcessing,
      playbackProgress,
      currentTime,
      totalDuration,

      // 计算属性
      isPlaying,
      isPaused,

      // 方法
      speakText,
      stopPlayback,
      getConnectionStatusText,
      getPlaybackStatusText,
    };
  },
};
</script>

<style scoped>
.tts-test-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1,
h2,
h3 {
  color: #333;
}

.basic-test-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-group label {
  font-weight: bold;
}

.input-group textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: Arial, sans-serif;
  resize: vertical;
}

.button-group {
  display: flex;
  gap: 10px;
}

.status-panel {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
}

.status-item {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.status-label {
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

.test-button {
  padding: 8px 16px;
  margin-right: 10px;
  margin-bottom: 10px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.test-button:hover {
  background-color: #45a049;
}

.test-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>
