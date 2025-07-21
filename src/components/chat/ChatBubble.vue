<script setup lang="ts">
import { h, computed, onMounted, onUnmounted } from 'vue';
import { Button, Space, Spin, message } from 'ant-design-vue';
import { Bubble } from 'ant-design-x-vue';
import { ReloadOutlined, CopyOutlined, SoundOutlined, PauseCircleOutlined, LoadingOutlined } from '@ant-design/icons-vue';
import { renderMarkdown } from '@/utils/markdown';
import { useTTS } from '@/composables/useTTS';

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
  ttsPlay: [content: string, messageId: string];
  ttsPause: [];
  ttsResume: [];
  ttsStop: [];
}>();

// 初始化 TTS 功能
const {
  isPlaying,
  isSynthesizing,
  currentMessageId,
  error: ttsError,
  canSpeakText,
  isCurrentMessage,
  speak,
  pause,
  resume,
  stop,
  connect
} = useTTS();

// 转换消息数据为 Bubble.List 所需格式
const bubbleItems = computed(() => {
  const items = props.messages
    .filter((msg) => msg && msg.message) // 过滤无效消息
    .map((msg) => {
      // 正确检查 loading 状态：检查 status 字段和 loading 字段
      const isLoading = msg.status === 'loading' || msg.loading === true || msg.message?.loading === true;
      const content = msg.message.content || '';
      
      const item = {
        // 使用消息ID作为key，确保稳定性
        key: msg.id,
        content: content,
        role: msg.message.role,
        status: msg.status,
        loading: isLoading,
        // 对于助手消息，在有内容时启用打字机效果（包括流式更新过程中）
        // 只有在完全没有内容或者是纯加载状态时才不启用
        typing: msg.message.role === 'assistant' && content && content.length > 0 ? {
          step: 2, // 每次显示2个字符
          interval: 20, // 20ms间隔，平衡流畅度和性能
        } : false,
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

// TTS 朗读处理
async function handleTTSAction(content: string, messageId: string) {
  try {
    if (isPlaying.value && isCurrentMessage(messageId)) {
      // 当前正在播放，点击暂停
      pause();
      emit('ttsPause');
    } else if (currentMessageId.value === messageId && !isPlaying.value) {
      // 当前消息已有音频，点击继续播放
      await resume();
      emit('ttsResume');
    } else {
      // 开始新的朗读
      await speak(content, messageId);
      emit('ttsPlay', content, messageId);
    }
  } catch (error) {
    console.error('TTS操作失败:', error);
    message.error(`朗读失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 获取TTS按钮标题
function getTTSButtonTitle(messageId: string): string {
  if (isSynthesizing.value && isCurrentMessage(messageId)) {
    return '正在合成语音...';
  }
  if (isPlaying.value && isCurrentMessage(messageId)) {
    return '暂停朗读';
  }
  if (currentMessageId.value === messageId && !isPlaying.value) {
    return '继续朗读';
  }
  return '朗读内容';
}

// 获取TTS按钮图标
function getTTSButtonIcon(messageId: string) {
  if (isSynthesizing.value && isCurrentMessage(messageId)) {
    return h(LoadingOutlined, { spin: true });
  }
  if (isPlaying.value && isCurrentMessage(messageId)) {
    return h(PauseCircleOutlined);
  }
  return h(SoundOutlined);
}

// 检查是否有有效文本可朗读
function hasValidTextForTTS(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  // 简单检查：移除空白字符后是否还有内容
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= 10000;
}

// 生命周期钩子
onMounted(async () => {
  try {
    await connect();
    console.log('[ChatBubble] TTS服务连接成功');
  } catch (error) {
    console.warn('[ChatBubble] TTS服务连接失败:', error);
    // 不显示错误消息，因为TTS是可选功能
  }
});

onUnmounted(() => {
  // 停止当前播放并清理资源
  stop();
  console.log('[ChatBubble] TTS资源已清理');
});

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
    // 移除这里的全局typing配置，使用bubbleItems中的单独配置
    footer: (content: string, info: any) => {
      console.log('[ChatBubble] Footer 渲染 - content:', content, 'info:', info);
      // 只为非加载状态的 assistant 消息显示按钮
      if (info?.loading || info?.status === 'loading') {
        return null;
      }
      
      const messageId = info?.messageId || info?.key || `msg-${Date.now()}`;
      const hasValidText = hasValidTextForTTS(content);
      
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
          disabled: !hasValidText || (!canSpeakText(content) && !isCurrentMessage(messageId)),
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