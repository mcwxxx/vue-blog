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
        // 使用内容长度作为key的一部分，确保内容更新时重新渲染
        key: `${msg.id}-${msg.message.content?.length || 0}`,
        content: msg.message.content || '',
        role: msg.message.role,
        status: msg.status,
        loading: isLoading,
        // 对于助手消息，在有内容时启用打字机效果（包括流式更新过程中）
        typing: msg.message.role === 'assistant' && msg.message.content && msg.message.content.length > 0,
        // 添加原始消息ID用于调试
        messageId: msg.id,
      };
      
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



  return items;
});

// 重新生成处理
function onRegenerate(footerProps: string) {
  emit('regenerate', footerProps);
}

// 复制处理
function onCopy(footerProps: string) {
  navigator.clipboard
    .writeText(footerProps)
    .then(() => {
      message.success('已复制到剪贴板');
      emit('copy', footerProps);
    })
    .catch((err) => {
      message.error('复制失败');
    });
}

/**
 * 渲染助手消息内容（使用 Bubble 内置打字机效果）
 * @param content 消息内容
 * @param info 消息信息
 * @returns VNode
 */
const renderAssistantMessage = (content: string, info: any) => {
  // 确保每次内容更新时都重新渲染 markdown
  // 这样在流式更新过程中也能正确解析 Markdown 格式
  try {
    return renderMarkdown(content);
  } catch (error) {
    console.error('Markdown渲染失败:', error);
    // 如果渲染失败，返回纯文本
    return h('div', { style: { whiteSpace: 'pre-wrap' } }, content);
  }
};

// 配置 Bubble.List 的 roles
const roles = {
  assistant: {
    placement: 'start',
    messageRender: renderAssistantMessage,
    typing: { step: 1, interval: 30 }, // 调整打字机速度，更快更流畅
    footer: (content: string, info: any) => {
      console.log('[ChatBubble] Footer 渲染 - content:', content, 'info:', info);
      // 只为非加载状态的 assistant 消息显示按钮
      if (info?.loading || info?.status === 'loading') {
        return null;
      }
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
      ]);
    },
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