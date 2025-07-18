<script setup lang="ts">
import { ref, computed } from 'vue';
import { useXAgent } from 'ant-design-x-vue';
import { message } from 'ant-design-vue';

// 定义 Props
interface Props {
  onMessage?: (content: string, isComplete: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onComplete?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  onMessage: () => {},
  onError: () => {},
  onStart: () => {},
  onComplete: () => {},
});

// 定义 Emits
const emit = defineEmits<{
  message: [content: string, isComplete: boolean];
  error: [error: string];
  start: [];
  complete: [];
}>();

// 中止控制器
const abortController = ref<AbortController | null>(null);

// 配置 useXAgent
const agent = useXAgent({
  baseURL: 'http://39.96.193.106:3000',
  dangerouslyApiKey: '', // 如果需要的话
});

// 计算属性：是否正在请求
const isRequesting = computed(() => agent.value.isRequesting());

// 请求函数
const sendRequest = async (prompt: string) => {
  console.groupCollapsed('ChatRequest - Send Request');
  console.log('Prompt:', prompt);
  console.log('Is requesting:', isRequesting.value);
  console.groupEnd();

  if (isRequesting.value) {
    message.warning('正在处理请求中，请稍候...');
    return;
  }

  // 构建与原有 AIChat.vue 一致的请求体结构
  const requestData = {
    input: {
      prompt: prompt,
    },
    parameters: {
      incremental_output: 'true',
    },
    debug: {},
  };

  try {
    // 触发开始事件
    props.onStart();
    emit('start');

    // 创建新的中止控制器
    abortController.value = new AbortController();

    // 使用 useXAgent 发送请求
    const response = await agent.value.request(
      {
        url: '/api/dashscope/completion',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'enable',
        },
        body: JSON.stringify(requestData),
        signal: abortController.value.signal,
      },
      {
        // 流式处理回调
        onUpdate: (content: string, isComplete: boolean) => {
          console.log('Stream update:', { content, isComplete });
          props.onMessage(content, isComplete);
          emit('message', content, isComplete);
        },
        onError: (error: Error) => {
          console.error('Request error:', error);
          const errorMessage = error.message || '请求失败，请稍后重试';
          props.onError(errorMessage);
          emit('error', errorMessage);
        },
        onComplete: () => {
          console.log('Request completed');
          props.onComplete();
          emit('complete');
        },
      }
    );

    return response;
  } catch (error: any) {
    console.error('ChatRequest error:', error);
    const errorMessage = error.message || '网络请求失败';
    props.onError(errorMessage);
    emit('error', errorMessage);
    throw error;
  }
};

// 中止请求
const abortRequest = () => {
  if (abortController.value) {
    abortController.value.abort();
    abortController.value = null;
    console.log('Request aborted');
  }
};

// 暴露方法给父组件
defineExpose({
  sendRequest,
  abortRequest,
  isRequesting,
});
</script>

<template>
  <!-- ChatRequest 组件主要用于逻辑处理，不需要 UI 渲染 -->
  <div style="display: none;"></div>
</template>