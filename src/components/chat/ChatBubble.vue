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
  const items = props.messages.map((msg) => ({
    key: msg.id,
    content: msg.message.content,
    role: msg.message.role,
    status: msg.status,
    loading: msg.status === 'loading',
  }));

  // 如果正在加载且没有加载状态的消息，添加一个
  if (props.loading && !items.some(item => item.loading)) {
    items.push({
      key: `loading-${Date.now()}`,
      content: '正在思考中...',
      role: 'assistant' as const,
      status: 'loading' as const,
      loading: true,
    });
  }

  console.groupCollapsed('ChatBubble - Bubble Items');
  console.log('Original messages:', props.messages);
  console.log('Transformed bubble items:', items);
  console.log('Loading state:', props.loading);
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

// 配置 Bubble.List 的 roles
const roles: (typeof Bubble.List)['roles'] = {
  assistant: {
    placement: 'start',
    messageRender: renderMarkdown,
    loadingRender: () =>
      h(Space, null, [h(Spin, { size: 'small' }), '正在思考中']),
    footer: (info: any) =>
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h(Button, {
          type: 'text',
          size: 'small',
          icon: h(ReloadOutlined),
          title: '重新生成',
          onClick: () => onRegenerate(info),
        }),
        h(Button, {
          type: 'text',
          size: 'small',
          icon: h(CopyOutlined),
          title: '复制内容',
          onClick: () => onCopy(info),
        }),
      ]),
  },
  user: { placement: 'end' },
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