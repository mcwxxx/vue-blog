<template>
  <div class="ai-chat-container">
    <!-- 聊天头部 -->
    <ChatHeader
      :conversations="sessionsForAntdX"
      :active-conversation-id="activeConversationId"
      @new-conversation="handleNewConversation"
      @switch-conversation="handleSwitchConversation"
      @close-chat="handleCloseChat"
    />

    <!-- 聊天内容区域 -->
    <div class="chat-content">
      <!-- 欢迎界面（无消息时显示） -->
      <ChatWelcome
        v-if="!hasMessages"
        :prompts="welcomePrompts"
        @question-click="handlePromptSelect"
      />

      <!-- 消息列表 -->
      <ChatBubble
        v-if="hasMessages"
        :messages="bubbleMessages"
        :loading="isLoading"
        @regenerate="handleRegenerate"
        @copy="handleCopy"
      />

      <!-- 相关问题提示 -->
      <ChatPrompts
        v-if="relatedQuestions.length > 0 && !isLoading"
        :questions="relatedQuestions"
        @question-click="handleRelatedQuestionClick"
      />
    </div>

    <!-- 聊天输入区域 -->
    <div class="chat-input-container">
      <ChatInput
        :loading="isLoading"
        :disabled="!canSendMessage"
        @submit="handleSubmit"
        @cancel="handleCancel"
        @file-paste="handleFilePaste"
        @suggestion-select="handleSuggestionSelect"
        @action-click="handleActionClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';
import ChatHeader from './ChatHeader.vue';
import ChatWelcome from './ChatWelcome.vue';
import ChatBubble from './ChatBubble.vue';
import ChatPrompts from './ChatPrompts.vue';
import ChatInput from './ChatInput.vue';
import { useChat } from '@/composables/useChat';
import { useConversations } from '@/composables/useConversations';
import type { PromptItem, BubbleDataType, MessageInfo } from '@/types/chat';

// Props
interface Props {
  apiUrl?: string;
  welcomeTitle?: string;
  welcomeDescription?: string;
}

const props = withDefaults(defineProps<Props>(), {
  apiUrl: 'http://39.96.193.106:3000/api/dashscope/completion',
  welcomeTitle: 'AI 助手',
  welcomeDescription: '我是您的智能助手，有什么可以帮助您的吗？',
});

// Emits
interface Emits {
  close: [];
  messageCount: [count: number];
  error: [error: string];
}

const emit = defineEmits<Emits>();

// 使用聊天逻辑
const {
  messages,
  isLoading,
  error,
  messageCount,
  hasMessages,
  canSendMessage,
  canAbort,
  canRegenerate,
  sendMessage,
  abortCurrentRequest,
  regenerateLastMessage,
  handlePromptSelect,
  handleRelatedQuestionClick,
  clearChatContext,
  handleMessageAction,
  cleanupChat,
} = useChat(props.apiUrl);

// 使用会话管理
const {
  conversations,
  activeConversationId,
  activeConversation,
  sessionsForAntdX,
  createConversation,
  switchConversation,
  deleteConversation,
  initializeConversations,
  cleanupConversations,
} = useConversations();

// 欢迎界面提示词
const welcomePrompts = ref<PromptItem[]>([
  {
    key: 'help',
    label: '帮助我解决问题',
    description: '我遇到了一个技术问题，需要您的帮助',
  },
  {
    key: 'explain',
    label: '解释概念',
    description: '请解释一个我不理解的概念',
  },
  {
    key: 'code',
    label: '代码相关',
    description: '帮我写代码或解释代码',
  },
  {
    key: 'creative',
    label: '创意写作',
    description: '帮我进行创意写作或内容创作',
  },
]);

// 转换消息格式为气泡组件需要的格式
const bubbleMessages = computed((): MessageInfo<BubbleDataType>[] => {
  return messages.value.map((msg): MessageInfo<BubbleDataType> => ({
    id: msg.id,
    message: {
      content: msg.content,
      role: msg.role as 'user' | 'assistant',
      status: msg.status,
      loading: msg.loading,
      relatedQuestions: msg.relatedQuestions,
    },
    status: msg.status,
  }));
});

// 获取相关问题
const relatedQuestions = computed((): string[] => {
  const lastMessage = messages.value[messages.value.length - 1];
  if (lastMessage?.role === 'assistant' && lastMessage.relatedQuestions) {
    return lastMessage.relatedQuestions;
  }
  return [];
});

// 事件处理函数

/**
 * 处理消息提交
 */
const handleSubmit = async (content: string): Promise<void> => {
  if (!content.trim()) return;
  
  try {
    await sendMessage(content);
  } catch (err) {
    console.error('[AIChatRefactored] 发送消息失败:', err);
  }
};

/**
 * 处理取消请求
 */
const handleCancel = (): void => {
  if (canAbort.value) {
    abortCurrentRequest();
    message.info('已取消当前请求');
  }
};

/**
 * 处理文件粘贴
 */
const handleFilePaste = (files: File[]): void => {
  console.log('[AIChatRefactored] 文件粘贴:', files);
  message.info(`收到 ${files.length} 个文件，文件上传功能待实现`);
};

/**
 * 处理建议选择
 */
const handleSuggestionSelect = (suggestion: string): void => {
  console.log('[AIChatRefactored] 建议选择:', suggestion);
  handleSubmit(suggestion);
};

/**
 * 处理快捷操作点击
 */
const handleActionClick = (action: string): void => {
  console.log('[AIChatRefactored] 快捷操作:', action);
  
  switch (action) {
    case 'clear':
      handleClearContext();
      break;
    case 'export':
      handleExportChat();
      break;
    default:
      message.info(`快捷操作: ${action}`);
  }
};

/**
 * 处理重新生成
 */
const handleRegenerate = async (): Promise<void> => {
  if (canRegenerate.value) {
    try {
      await regenerateLastMessage();
    } catch (err) {
      console.error('[AIChatRefactored] 重新生成失败:', err);
    }
  }
};

/**
 * 处理复制消息
 */
const handleCopy = async (messageId: string): Promise<void> => {
  const targetMessage = messages.value.find(m => m.id === messageId);
  if (targetMessage) {
    try {
      await navigator.clipboard.writeText(targetMessage.content);
      message.success('已复制到剪贴板');
    } catch (err) {
      console.error('[AIChatRefactored] 复制失败:', err);
      message.error('复制失败');
    }
  }
};

/**
 * 处理新建会话
 */
const handleNewConversation = (): void => {
  // 清除当前聊天上下文
  clearChatContext();
  
  // 创建新会话
  createConversation();
  
  message.success('已创建新对话');
};

/**
 * 处理切换会话
 */
const handleSwitchConversation = (conversationId: string): void => {
  // 清除当前聊天上下文
  clearChatContext();
  
  // 切换会话
  switchConversation(conversationId);
  
  const conversation = conversations.value.find(c => c.key === conversationId);
  if (conversation) {
    message.success(`已切换到: ${conversation.label}`);
  }
};

/**
 * 处理关闭聊天
 */
const handleCloseChat = (): void => {
  emit('close');
};

/**
 * 处理清除上下文
 */
const handleClearContext = (): void => {
  clearChatContext();
  message.success('已清除对话内容');
};

/**
 * 处理导出聊天记录
 */
const handleExportChat = (): void => {
  if (!hasMessages.value) {
    message.warning('没有可导出的对话内容');
    return;
  }
  
  try {
    const chatData = {
      conversation: activeConversation.value?.label || '未命名对话',
      timestamp: new Date().toISOString(),
      messages: messages.value.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp).toISOString(),
      })),
    };
    
    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat_export_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    message.success('聊天记录已导出');
  } catch (err) {
    console.error('[AIChatRefactored] 导出失败:', err);
    message.error('导出失败');
  }
};

// 监听消息数量变化
const unwatchMessageCount = computed(() => {
  emit('messageCount', messageCount.value);
  return messageCount.value;
});

// 监听错误状态
const unwatchError = computed(() => {
  if (error.value) {
    emit('error', error.value);
  }
  return error.value;
});

// 生命周期
onMounted(() => {
  console.log('[AIChatRefactored] 组件挂载');
  
  // 初始化会话管理
  initializeConversations();
});

onUnmounted(() => {
  console.log('[AIChatRefactored] 组件卸载');
  
  // 清理资源
  cleanupChat();
  cleanupConversations();
});
</script>

<style scoped>
.ai-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
  gap: 16px;
}

.chat-input-container {
  border-top: 1px solid #f0f0f0;
  padding: 16px;
  background: #fafafa;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-content {
    padding: 12px;
    gap: 12px;
  }
  
  .chat-input-container {
    padding: 12px;
  }
}
</style>