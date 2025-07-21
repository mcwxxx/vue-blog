<template>
  <div class="tts-websocket-demo">
    <div class="container">
      <h1>TTS WebSocket 客户端演示</h1>

      <!-- 文本输入区域 -->
      <div class="text-input-section">
        <label for="text-input">输入要转换为语音的文本:</label>
        <textarea
          id="text-input"
          v-model="inputText"
          placeholder="请输入文本..."
          rows="6"
        >
欢迎使用火山引擎语音合成服务，这是一个WebSocket演示。
        </textarea>
      </div>

      <!-- 语音参数配置 -->
      <div class="options-section">
        <div class="option-group">
          <label for="voice-type">声音类型:</label>
          <select id="voice-type" v-model="voiceOptions.voice_type">
            <option value="S_Z4CpYSGv1">标准女声</option>
            <option value="S_MiYu">米语</option>
          </select>
        </div>

        <div class="option-group">
          <label for="speed-ratio">语速 (0.5-2.0):</label>
          <input
            type="number"
            id="speed-ratio"
            v-model.number="voiceOptions.speed_ratio"
            min="0.5"
            max="2.0"
            step="0.1"
          />
        </div>

        <div class="option-group">
          <label for="volume-ratio">音量 (0.5-2.0):</label>
          <input
            type="number"
            id="volume-ratio"
            v-model.number="voiceOptions.volume_ratio"
            min="0.5"
            max="2.0"
            step="0.1"
          />
        </div>

        <div class="option-group">
          <label for="pitch-ratio">音调 (0.5-2.0):</label>
          <input
            type="number"
            id="pitch-ratio"
            v-model.number="voiceOptions.pitch_ratio"
            min="0.5"
            max="2.0"
            step="0.1"
          />
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="controls-section">
        <button
          @click="connectToServer"
          :disabled="isConnected || isConnecting"
          class="btn btn-primary"
        >
          {{ isConnecting ? '连接中...' : '连接服务器' }}
        </button>
        
        <button
          @click="convertToSpeech"
          :disabled="!isConnected || isSynthesizing"
          class="btn btn-primary"
        >
          {{ isSynthesizing ? '转换中...' : '转换为语音' }}
        </button>
        
        <button
          @click="playAudio"
          :disabled="!audioBlob"
          class="btn btn-success"
        >
          播放
        </button>
        
        <button
          @click="stopAudio"
          :disabled="!audioBlob"
          class="btn btn-warning"
        >
          停止
        </button>
        
        <button
          @click="disconnectFromServer"
          :disabled="!isConnected"
          class="btn btn-secondary"
        >
          断开连接
        </button>
      </div>

      <!-- 状态显示 -->
      <div class="status-section">
        <div class="status-indicator" :class="statusClass">
          状态: {{ statusText }}
        </div>
      </div>

      <!-- 音频播放器 -->
      <audio
        ref="audioPlayer"
        controls
        v-show="audioBlob"
        class="audio-player"
      ></audio>

      <!-- 日志显示 -->
      <div class="log-section">
        <h3>日志:</h3>
        <div class="log-container" ref="logContainer">
          <div
            v-for="(log, index) in logs"
            :key="index"
            class="log-entry"
          >
            [{{ log.time }}] {{ log.message }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue';

// 接口定义
interface VoiceOptions {
  voice_type: string;
  speed_ratio: number;
  volume_ratio: number;
  pitch_ratio: number;
}

interface LogEntry {
  time: string;
  message: string;
}

// 响应式数据
const inputText = ref('欢迎使用火山引擎语音合成服务，这是一个WebSocket演示。');
const voiceOptions = ref<VoiceOptions>({
  voice_type: 'S_Z4CpYSGv1',
  speed_ratio: 1.0,
  volume_ratio: 1.0,
  pitch_ratio: 1.0
});

const isConnected = ref(false);
const isConnecting = ref(false);
const isSynthesizing = ref(false);
const logs = ref<LogEntry[]>([]);
const audioBlob = ref<Blob | null>(null);
const audioPlayer = ref<HTMLAudioElement | null>(null);
const logContainer = ref<HTMLDivElement | null>(null);

// WebSocket 相关
let ws: WebSocket | null = null;
let audioChunks: Blob[] = [];

// WebSocket URL - 使用指定的地址
const WS_URL = 'ws://39.96.193.106:3000/api/tts/ws';

// 计算属性
const statusClass = computed(() => {
  if (isConnecting.value) return 'connecting';
  if (isConnected.value) return 'connected';
  return 'disconnected';
});

const statusText = computed(() => {
  if (isConnecting.value) return '正在连接...';
  if (isConnected.value) return '已连接';
  return '未连接';
});

// 工具函数
/**
 * 添加日志条目
 * @param message - 日志消息
 */
function addLog(message: string): void {
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  
  logs.value.push({
    time: timeString,
    message
  });
  
  // 自动滚动到底部
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
}

/**
 * 更新状态显示
 * @param message - 状态消息
 */
function updateStatus(message: string): void {
  addLog(`状态更新: ${message}`);
}

// WebSocket 连接管理
/**
 * 连接到WebSocket服务器
 */
async function connectToServer(): Promise<void> {
  if (isConnected.value || isConnecting.value) {
    return;
  }

  isConnecting.value = true;
  addLog(`正在连接到: ${WS_URL}`);
  updateStatus('正在连接...');

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      isConnecting.value = false;
      isConnected.value = true;
      addLog('已连接到服务器');
      updateStatus('已连接');
    };

    ws.onmessage = handleWebSocketMessage;

    ws.onclose = () => {
      isConnecting.value = false;
      isConnected.value = false;
      addLog('与服务器断开连接');
      updateStatus('已断开连接');
      ws = null;
    };

    ws.onerror = (error) => {
      isConnecting.value = false;
      isConnected.value = false;
      addLog(`WebSocket错误: ${error}`);
      updateStatus('连接错误');
      ws = null;
    };

  } catch (error) {
    isConnecting.value = false;
    addLog(`连接错误: ${error instanceof Error ? error.message : '未知错误'}`);
    updateStatus('连接失败');
  }
}

/**
 * 断开WebSocket连接
 */
function disconnectFromServer(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
  isConnected.value = false;
  isConnecting.value = false;
}

/**
 * 处理WebSocket消息
 * @param event - WebSocket消息事件
 */
function handleWebSocketMessage(event: MessageEvent): void {
  try {
    if (event.data instanceof Blob) {
      // 音频数据
      handleAudioData(event.data);
    } else {
      // JSON消息
      const message = JSON.parse(event.data);
      handleJsonMessage(message);
    }
  } catch (error) {
    addLog(`处理消息错误: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 处理音频数据
 * @param blob - 音频数据Blob
 */
function handleAudioData(blob: Blob): void {
  addLog(`收到音频数据: ${blob.size} 字节`);
  audioChunks.push(blob);
  
  // 创建音频Blob并设置到播放器
  audioBlob.value = new Blob(audioChunks, { type: 'audio/mp3' });
  const audioUrl = URL.createObjectURL(audioBlob.value);
  
  if (audioPlayer.value) {
    audioPlayer.value.src = audioUrl;
  }
  
  addLog('音频数据准备完成，可以播放');
  isSynthesizing.value = false;
}

/**
 * 处理JSON消息
 * @param message - JSON消息对象
 */
function handleJsonMessage(message: any): void {
  addLog(`收到消息: ${JSON.stringify(message)}`);
  
  if (message.type === 'error') {
    updateStatus(`错误: ${message.message}`);
    isSynthesizing.value = false;
  } else if (message.type === 'header') {
    addLog('开始接收音频数据...');
    // 清空之前的音频数据
    audioChunks = [];
    audioBlob.value = null;
  }
}

// TTS 功能
/**
 * 转换文本为语音
 */
async function convertToSpeech(): Promise<void> {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addLog('未连接到服务器');
    return;
  }

  const text = inputText.value.trim();
  if (!text) {
    addLog('请输入文本');
    return;
  }

  isSynthesizing.value = true;
  
  // 构建请求对象
  const request = {
    text: text,
    options: {
      voice_type: voiceOptions.value.voice_type,
      speed_ratio: voiceOptions.value.speed_ratio,
      volume_ratio: voiceOptions.value.volume_ratio,
      pitch_ratio: voiceOptions.value.pitch_ratio
    }
  };

  addLog(`发送请求: ${JSON.stringify(request)}`);
  ws.send(JSON.stringify(request));
  updateStatus('处理中...');
  
  // 清空之前的音频数据
  audioChunks = [];
  audioBlob.value = null;
}

// 音频播放控制
/**
 * 播放音频
 */
function playAudio(): void {
  if (audioPlayer.value && audioBlob.value) {
    audioPlayer.value.play();
    addLog('开始播放音频');
  }
}

/**
 * 停止音频播放
 */
function stopAudio(): void {
  if (audioPlayer.value) {
    audioPlayer.value.pause();
    audioPlayer.value.currentTime = 0;
    addLog('停止播放音频');
  }
}

// 生命周期钩子
onUnmounted(() => {
  // 组件销毁时断开连接
  disconnectFromServer();
  
  // 清理音频URL
  if (audioBlob.value && audioPlayer.value?.src) {
    URL.revokeObjectURL(audioPlayer.value.src);
  }
});
</script>

<style scoped>
.tts-websocket-demo {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

h3 {
  color: #555;
  margin-bottom: 10px;
}

/* 文本输入区域 */
.text-input-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.text-input-section label {
  font-weight: bold;
  color: #333;
}

textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
}

/* 选项配置区域 */
.options-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.option-group label {
  font-weight: bold;
  color: #333;
  font-size: 14px;
}

input,
select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

/* 控制按钮区域 */
.controls-section {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s;
}

.btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  color: #666;
}

.btn-primary {
  background-color: #4caf50;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #45a049;
}

.btn-success {
  background-color: #2196f3;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #1976d2;
}

.btn-warning {
  background-color: #ff9800;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background-color: #f57c00;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
}

/* 状态显示区域 */
.status-section {
  padding: 10px;
  border-radius: 4px;
  background-color: #f0f0f0;
}

.status-indicator {
  font-weight: bold;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.3s;
}

.status-indicator.connected {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-indicator.connecting {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
  animation: pulse 1.5s infinite;
}

.status-indicator.disconnected {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 音频播放器 */
.audio-player {
  width: 100%;
  margin: 10px 0;
}

/* 日志区域 */
.log-section {
  margin-top: 20px;
}

.log-container {
  height: 200px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f9f9f9;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
}

.log-entry {
  margin-bottom: 4px;
  color: #333;
}

.log-entry:last-child {
  margin-bottom: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .options-section {
    grid-template-columns: 1fr;
  }
  
  .controls-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn {
    width: 100%;
  }
}
</style>