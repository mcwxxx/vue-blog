<script setup lang="ts">
import { h, computed } from 'vue';
import { Button, Space, Spin, message } from 'ant-design-vue';
import { Bubble } from 'ant-design-x-vue';
import { ReloadOutlined, CopyOutlined } from '@ant-design/icons-vue';
import { renderMarkdown } from '@/utils/markdown';

// 定义消息类型
export interface BubbleDataType {
  content: string;
  role: 'user' | 'assistant';
  status?: 'loading' | 'success' | 'error';
  relatedQuestions?: string[];
}

export interface MessageInfo<T = BubbleDataType> {
  id: string;
  message: T;
  status: 'loading' | 'success' | 'error';
}

// 定义 Props
interface Props {
  messages: MessageInfo<BubbleDataType>[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

// 定义 Emits
const emit = defineEmits<{
  regenerate: [content: string];
  copy: [content: string];
}>();

// 转换消息数据为 Bubble.List 所需格式
const bubbleItems = computed(() => {
  const items = props.messages
    .filter((msg) => msg && msg.message) // 过滤无效消息
    .map((msg) => {
      // 正确检查 loading 状态：检查 status 字段和 loading 字段
      const isLoading = msg.status === 'loading' || msg.loading === true || msg.message?.loading === true;
      const item = {
        key: msg.id,
        content: msg.message.content || '',
        role: msg.message.role,
        status: msg.status,
        loading: isLoading,
        // typing 效果由 roles 配置控制，这里不需要单独设置
        // 添加原始消息ID用于调试
        messageId: msg.id,
      };
      
      console.log('[ChatBubble] 转换消息项:', {
        messageId: msg.id,
        originalStatus: msg.status,
        originalLoading: msg.loading,
        messageLoading: msg.message?.loading,
        contentLength: msg.message.content?.length || 0,
        computedIsLoading: isLoading,
        hasTyping: !!item.typing,
        transformedItem: item
      });
      
      return item;
    });

  // 如果正在加载且没有加载状态的消息，添加一个
  if (props.loading && !items.some(item => item.loading)) {
    items.push({
      key: `loading-${Date.now()}`,
      content: '正在思考中...',
      role: 'assistant' as const,
      status: 'loading' as const,
      loading: true,
      typing: false, // 加载提示不需要打字机效果
    });
  }

  console.groupCollapsed('ChatBubble - Bubble Items');
  console.log('Original messages:', props.messages);
  console.log('Transformed bubble items:', items);
  console.log('Loading state:', props.loading);
  console.log('Items with loading=true:', items.filter(item => item.loading));
  console.log('Items with typing effect:', items.filter(item => item.typing));
  console.groupEnd();

  return items;
});

// 重新生成处理
function onRegenerate(footerProps: string) {
  console.log('[ChatBubble] 重新生成:', footerProps);
  emit('regenerate', footerProps);
}

// 复制处理
function onCopy(footerProps: string) {
  console.log('[ChatBubble] 复制内容:', footerProps);
  navigator.clipboard
    .writeText(footerProps)
    .then(() => {
      message.success('已复制到剪贴板');
      emit('copy', footerProps);
    })
    .catch((err) => {
      message.error('复制失败');
      console.error('[ChatBubble] 复制失败', err);
    });
}

/**
 * 渲染助手消息内容（使用 Bubble 内置打字机效果）
 * @param content 消息内容
 * @param info 消息信息
 * @returns VNode
 */
const renderAssistantMessage = (content: string, info: any) => {
  console.log('[ChatBubble] 🔍 渲染助手消息:', {
    messageId: info?.messageId || info?.key,
    contentLength: content?.length || 0,
    contentPreview: content?.slice(0, 100) + (content?.length > 100 ? '...' : ''),
    status: info?.status,
    loading: info?.loading,
    typing: info?.typing
  });
  
  // 直接渲染 markdown，打字机效果由 Bubble 组件的 typing 属性处理
  return renderMarkdown(content);
};

// 配置 Bubble.List 的 roles
const roles = {
  assistant: {
    placement: 'start',
    messageRender: renderAssistantMessage,
    typing: { step: 2, interval: 50 },
  },
  user: {
    placement: 'end',
  },
};

// 样式
const styles = computed(() => ({
  chatBubble: {
    height: '100%',
    paddingInline: '16px',
  },
  loadingMessage: {
    backgroundImage:
      'linear-gradient(90deg, #ff6b23 0%, #af3cb8 31%, #53b6ff 89%)',
    backgroundSize: '100% 2px',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'bottom',
  },
}));
</script>

<template>
  <div v-if="bubbleItems?.length">
    <Bubble.List
      :style="styles.chatBubble"
      :items="bubbleItems"
      :roles="roles"
    />
  </div>
</template>