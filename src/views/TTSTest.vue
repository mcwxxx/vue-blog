<template>
  <div class="tts-test-page">
    <div class="container">
      <h1>TTS 朗读功能测试</h1>
      
      <!-- 连接状态 -->
      <div class="status-section">
        <h2>连接状态</h2>
        <div class="status-indicator" :class="connectionStatus">
          <span class="status-dot"></span>
          <span class="status-text">{{ getStatusText() }}</span>
        </div>
        <div class="status-actions">
          <a-button @click="handleConnect" :loading="isConnecting" :disabled="isConnected">
            连接 TTS 服务
          </a-button>
          <a-button @click="handleDisconnect" :disabled="!isConnected">
            断开连接
          </a-button>
        </div>
      </div>

      <!-- 文本输入 -->
      <div class="input-section">
        <h2>文本输入</h2>
        <a-textarea
          v-model:value="testText"
          placeholder="请输入要朗读的文本..."
          :rows="4"
          :maxlength="1000"
          show-count
        />
        <div class="preset-texts">
          <h3>预设文本</h3>
          <div class="preset-buttons">
            <a-button
              v-for="(preset, index) in presetTexts"
              :key="index"
              size="small"
              @click="testText = preset.text"
            >
              {{ preset.name }}
            </a-button>
          </div>
        </div>
      </div>

      <!-- 语音参数 -->
      <div class="params-section">
        <h2>语音参数</h2>
        <div class="params-grid">
          <div class="param-item">
            <label>语速: {{ speed }}</label>
            <a-slider v-model:value="speed" :min="0.5" :max="2" :step="0.1" />
          </div>
          <div class="param-item">
            <label>音调: {{ pitch }}</label>
            <a-slider v-model:value="pitch" :min="0.5" :max="2" :step="0.1" />
          </div>
          <div class="param-item">
            <label>音量: {{ volume }}</label>
            <a-slider v-model:value="volume" :min="0" :max="1" :step="0.1" />
          </div>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="controls-section">
        <h2>播放控制</h2>
        <div class="control-buttons">
          <a-button
            type="primary"
            :icon="h(SoundOutlined)"
            @click="handleSpeak"
            :disabled="!canSpeak || !testText.trim()"
            :loading="isSynthesizing"
          >
            {{ isSynthesizing ? '合成中...' : '开始朗读' }}
          </a-button>
          
          <a-button
            :icon="h(isPlaying ? PauseCircleOutlined : PlayCircleOutlined)"
            @click="handlePlayPause"
            :disabled="!currentAudioId"
          >
            {{ isPlaying ? '暂停' : '播放' }}
          </a-button>
          
          <a-button
            :icon="h(StopOutlined)"
            @click="handleStop"
            :disabled="!currentAudioId"
          >
            停止
          </a-button>
        </div>
      </div>

      <!-- 播放状态 -->
      <div class="playback-section" v-if="currentAudioId">
        <h2>播放状态</h2>
        <div class="playback-info">
          <div class="info-item">
            <span>当前音频ID:</span>
            <code>{{ currentAudioId }}</code>
          </div>
          <div class="info-item">
            <span>播放状态:</span>
            <a-tag :color="isPlaying ? 'green' : 'orange'">
              {{ isPlaying ? '播放中' : '已暂停' }}
            </a-tag>
          </div>
        </div>
      </div>

      <!-- 错误信息 -->
      <div class="error-section" v-if="error">
        <h2>错误信息</h2>
        <a-alert
          :message="error"
          type="error"
          show-icon
          closable
          @close="clearError"
        />
      </div>

      <!-- 调试信息 -->
      <div class="debug-section">
        <h2>调试信息</h2>
        <a-collapse>
          <a-collapse-panel key="config" header="TTS 配置">
            <pre>{{ JSON.stringify(ttsConfig, null, 2) }}</pre>
          </a-collapse-panel>
          <a-collapse-panel key="state" header="组件状态">
            <pre>{{ JSON.stringify(debugState, null, 2) }}</pre>
          </a-collapse-panel>
        </a-collapse>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue';
import {
  Button as AButton,
  Textarea as ATextarea,
  Slider as ASlider,
  Tag as ATag,
  Alert as AAlert,
  Collapse as ACollapse,
  CollapsePanel as ACollapsePanel,
  message
} from 'ant-design-vue';
import {
  SoundOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined
} from '@ant-design/icons-vue';
import { useTTS } from '@/composables/useTTS';
import { getTTSConfig } from '@/config/tts';

// TTS 配置
const ttsConfig = getTTSConfig();

// 初始化 TTS
const {
  isConnected,
  isPlaying,
  isSynthesizing,
  currentAudioId,
  error,
  canSpeak,
  speak,
  pause,
  resume,
  stop,
  connect,
  disconnect
} = useTTS({
  autoPlay: true,
  cacheEnabled: true
});

// 本地状态
const isConnecting = ref(false);
const testText = ref('你好，这是一个TTS语音合成测试。欢迎使用我们的语音朗读功能！');
const speed = ref(1.0);
const pitch = ref(1.0);
const volume = ref(0.8);

// 预设文本
const presetTexts = [
  {
    name: '简单测试',
    text: '你好，这是一个简单的测试。'
  },
  {
    name: '长文本',
    text: '这是一个较长的文本测试，用于验证TTS服务对长文本的处理能力。我们将测试语音合成的质量、流畅度以及播放控制功能。'
  },
  {
    name: 'Markdown',
    text: '# 标题\n\n这是一个**粗体**文本和*斜体*文本的示例。\n\n- 列表项1\n- 列表项2\n\n```javascript\nconsole.log("Hello World");\n```'
  },
  {
    name: '数字和符号',
    text: '今天是2024年1月1日，温度是25.5°C，湿度60%。联系电话：138-0000-0000。'
  }
];

// 计算属性
const connectionStatus = computed(() => {
  if (isConnecting.value) return 'connecting';
  if (isConnected.value) return 'connected';
  return 'disconnected';
});

const debugState = computed(() => ({
  isConnected: isConnected.value,
  isPlaying: isPlaying.value,
  isSynthesizing: isSynthesizing.value,
  currentAudioId: currentAudioId.value,
  canSpeak: canSpeak.value,
  hasError: !!error.value,
  textLength: testText.value.length
}));

// 方法
function getStatusText(): string {
  if (isConnecting.value) return '连接中...';
  if (isConnected.value) return '已连接';
  return '未连接';
}

async function handleConnect() {
  isConnecting.value = true;
  try {
    await connect();
    message.success('TTS服务连接成功');
  } catch (err) {
    message.error(`连接失败: ${err instanceof Error ? err.message : '未知错误'}`);
  } finally {
    isConnecting.value = false;
  }
}

async function handleDisconnect() {
  try {
    await disconnect();
    message.success('已断开TTS服务连接');
  } catch (err) {
    message.error(`断开连接失败: ${err instanceof Error ? err.message : '未知错误'}`);
  }
}

async function handleSpeak() {
  if (!testText.value.trim()) {
    message.warning('请输入要朗读的文本');
    return;
  }

  try {
    const audioId = `test-${Date.now()}`;
    await speak(testText.value, audioId);
    message.success('开始朗读');
  } catch (err) {
    message.error(`朗读失败: ${err instanceof Error ? err.message : '未知错误'}`);
  }
}

async function handlePlayPause() {
  try {
    if (isPlaying.value) {
      pause();
      message.info('已暂停播放');
    } else {
      await resume();
      message.info('继续播放');
    }
  } catch (err) {
    message.error(`操作失败: ${err instanceof Error ? err.message : '未知错误'}`);
  }
}

function handleStop() {
  stop();
  message.info('已停止播放');
}

function clearError() {
  // 错误会自动清除，这里只是为了用户体验
}

// 生命周期
onMounted(() => {
  // 自动连接
  handleConnect();
});
</script>

<style scoped>
.tts-test-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  color: #1890ff;
  margin-bottom: 32px;
}

h2 {
  color: #333;
  margin: 24px 0 16px 0;
  font-size: 18px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 8px;
}

h3 {
  color: #666;
  margin: 16px 0 8px 0;
  font-size: 14px;
}

.status-section {
  margin-bottom: 24px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.status-indicator.connected .status-dot {
  background-color: #52c41a;
}

.status-indicator.connecting .status-dot {
  background-color: #faad14;
  animation: pulse 1.5s infinite;
}

.status-indicator.disconnected .status-dot {
  background-color: #ff4d4f;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-actions {
  display: flex;
  gap: 12px;
}

.input-section {
  margin-bottom: 24px;
}

.preset-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.params-section {
  margin-bottom: 24px;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.param-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.controls-section {
  margin-bottom: 24px;
}

.control-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.playback-section {
  margin-bottom: 24px;
}

.playback-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-item span {
  font-weight: 500;
  min-width: 100px;
}

.error-section {
  margin-bottom: 24px;
}

.debug-section {
  margin-top: 32px;
}

pre {
  background: #f6f8fa;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.4;
}

code {
  background: #f6f8fa;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
}
</style>