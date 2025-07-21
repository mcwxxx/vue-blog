<template>
  <div class="tts-error-boundary">
    <slot v-if="!hasError" />
    <div v-else class="error-fallback">
      <div class="error-icon">
        <ExclamationCircleOutlined />
      </div>
      <div class="error-content">
        <h3>TTS 功能暂时不可用</h3>
        <p class="error-message">{{ errorMessage }}</p>
        <div class="error-actions">
          <Button type="primary" @click="retry">重试</Button>
          <Button @click="reset">重置</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';
import { Button } from 'ant-design-vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';

// Props
interface Props {
  fallbackMessage?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  onReset?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  fallbackMessage: 'TTS 服务遇到了问题，请稍后重试',
  showRetry: true
});

// Emits
interface Emits {
  error: [error: Error];
  retry: [];
  reset: [];
}

const emit = defineEmits<Emits>();

// 状态
const hasError = ref(false);
const errorMessage = ref('');
const errorDetails = ref<Error | null>(null);

// 错误捕获
onErrorCaptured((error: Error) => {
  console.error('[TTSErrorBoundary] 捕获到错误:', error);
  
  // 只处理 TTS 相关的错误
  if (isTTSError(error)) {
    hasError.value = true;
    errorMessage.value = getErrorMessage(error);
    errorDetails.value = error;
    emit('error', error);
    return false; // 阻止错误继续传播
  }
  
  return true; // 让其他错误继续传播
});

// 判断是否是 TTS 相关错误
function isTTSError(error: Error): boolean {
  const ttsKeywords = [
    'tts',
    'websocket',
    'audio',
    'synthesis',
    'voice',
    'speech',
    'sound'
  ];
  
  const errorString = error.message.toLowerCase();
  return ttsKeywords.some(keyword => errorString.includes(keyword));
}

// 获取用户友好的错误信息
function getErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('websocket') || message.includes('connection')) {
    return '无法连接到语音服务，请检查网络连接';
  }
  
  if (message.includes('timeout')) {
    return '语音合成超时，请稍后重试';
  }
  
  if (message.includes('synthesis') || message.includes('audio')) {
    return '语音合成失败，请重试或联系管理员';
  }
  
  if (message.includes('permission') || message.includes('denied')) {
    return '缺少音频播放权限，请检查浏览器设置';
  }
  
  return props.fallbackMessage;
}

// 重试
function retry(): void {
  hasError.value = false;
  errorMessage.value = '';
  errorDetails.value = null;
  
  if (props.onRetry) {
    props.onRetry();
  }
  
  emit('retry');
}

// 重置
function reset(): void {
  hasError.value = false;
  errorMessage.value = '';
  errorDetails.value = null;
  
  if (props.onReset) {
    props.onReset();
  }
  
  emit('reset');
}

// 暴露方法给父组件
defineExpose({
  hasError,
  errorMessage,
  errorDetails,
  retry,
  reset,
  triggerError: (error: Error) => {
    if (isTTSError(error)) {
      hasError.value = true;
      errorMessage.value = getErrorMessage(error);
      errorDetails.value = error;
      emit('error', error);
    }
  }
});
</script>

<style scoped>
.tts-error-boundary {
  width: 100%;
  height: 100%;
}

.error-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  min-height: 200px;
}

.error-icon {
  font-size: 48px;
  color: #ff4d4f;
  margin-bottom: 16px;
}

.error-content h3 {
  margin: 0 0 8px 0;
  color: #262626;
  font-size: 18px;
  font-weight: 600;
}

.error-message {
  margin: 0 0 24px 0;
  color: #8c8c8c;
  font-size: 14px;
  line-height: 1.5;
  max-width: 400px;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.error-actions .ant-btn {
  min-width: 80px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-fallback {
    padding: 24px 16px;
    min-height: 160px;
  }
  
  .error-icon {
    font-size: 36px;
    margin-bottom: 12px;
  }
  
  .error-content h3 {
    font-size: 16px;
  }
  
  .error-message {
    font-size: 13px;
    margin-bottom: 20px;
  }
  
  .error-actions {
    flex-direction: column;
    width: 100%;
    max-width: 200px;
  }
  
  .error-actions .ant-btn {
    width: 100%;
  }
}
</style>