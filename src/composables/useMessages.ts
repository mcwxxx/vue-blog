/**
 * 消息管理逻辑 Composable
 * @description 管理聊天消息的状态和操作
 */

import { ref, computed, nextTick } from 'vue';
import type { ChatMessage, MessageAction } from '@/types/chat';

/**
 * 生成唯一的消息ID
 * @returns 唯一ID字符串
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 消息管理 Hook
 * @returns 消息管理相关的状态和方法
 */
export function useMessages() {
  // 消息列表
  const messages = ref<ChatMessage[]>([]);
  
  // 当前流式消息ID
  const currentStreamingMessageId = ref<string | null>(null);

  /**
   * 添加用户消息
   * @param content 消息内容
   * @returns 新添加的消息
   */
  const addUserMessage = (content: string): ChatMessage => {
    const message: ChatMessage = {
      id: generateMessageId(),
      content,
      role: 'user',
      timestamp: Date.now(),
      status: 'sent',
    };
    
    messages.value.push(message);
    console.log('[useMessages] 添加用户消息:', message);
    return message;
  };

  /**
   * 添加助手消息（初始为加载状态）
   * @param content 初始内容（可选）
   * @returns 新添加的消息
   */
  const addAssistantMessage = (content: string = ''): ChatMessage => {
    const message: ChatMessage = {
      id: generateMessageId(),
      content,
      role: 'assistant',
      timestamp: Date.now(),
      status: 'loading',
      loading: true,
    };
    
    messages.value.push(message);
    currentStreamingMessageId.value = message.id;
    console.log('[useMessages] 添加助手消息:', message);
    return message;
  };

  /**
   * 更新消息内容（用于流式更新）
   * @param messageId 消息ID
   * @param content 新内容
   */
  const updateMessageContent = (messageId: string, content: string): void => {
    const message = messages.value.find(m => m.id === messageId);
    if (message) {
      const oldContent = message.content;
      message.content = content;
      console.log('[useMessages] 更新消息内容详情:', {
        messageId,
        oldContentLength: oldContent.length,
        newContentLength: content.length,
        contentDiff: content.length - oldContent.length,
        messageStatus: message.status,
        messageLoading: message.loading,
        newContentPreview: content.slice(-100) // 显示最新的100个字符
      });
    } else {
      console.warn('[useMessages] 未找到要更新的消息:', messageId);
    }
  };

  /**
   * 完成消息（结束流式更新）
   * @param messageId 消息ID
   * @param finalContent 最终内容
   * @param relatedQuestions 相关问题（可选）
   */
  const completeMessage = (
    messageId: string, 
    finalContent: string, 
    relatedQuestions?: string[]
  ): void => {
    const message = messages.value.find(m => m.id === messageId);
    if (message) {
      message.content = finalContent;
      message.status = 'success';
      message.loading = false;
      message.relatedQuestions = relatedQuestions;
      
      if (currentStreamingMessageId.value === messageId) {
        currentStreamingMessageId.value = null;
      }
      
      console.log('[useMessages] 完成消息:', messageId, {
        contentLength: finalContent.length,
        relatedQuestions: relatedQuestions?.length || 0
      });
    }
  };

  /**
   * 标记消息为错误状态
   * @param messageId 消息ID
   * @param errorMessage 错误信息
   */
  const markMessageError = (messageId: string, errorMessage: string): void => {
    const message = messages.value.find(m => m.id === messageId);
    if (message) {
      message.status = 'error';
      message.loading = false;
      message.content = errorMessage;
      
      if (currentStreamingMessageId.value === messageId) {
        currentStreamingMessageId.value = null;
      }
      
      console.log('[useMessages] 标记消息错误:', messageId, errorMessage);
    }
  };

  /**
   * 删除消息
   * @param messageId 消息ID
   */
  const deleteMessage = (messageId: string): void => {
    const index = messages.value.findIndex(m => m.id === messageId);
    if (index > -1) {
      messages.value.splice(index, 1);
      console.log('[useMessages] 删除消息:', messageId);
    }
  };

  /**
   * 清除上下文（替代关闭会话功能）
   */
  const clearContext = (): void => {
    messages.value = [];
    currentStreamingMessageId.value = null;
    console.log('[useMessages] 清除上下文');
  };

  /**
   * 获取最后一条用户消息
   * @returns 最后一条用户消息或 undefined
   */
  const getLastUserMessage = (): ChatMessage | undefined => {
    return messages.value
      .filter(m => m.role === 'user')
      .pop();
  };

  /**
   * 获取消息历史（用于API请求）
   * @param limit 限制消息数量（可选）
   * @returns 消息历史数组
   */
  const getMessageHistory = (limit?: number): ChatMessage[] => {
    const history = messages.value.filter(m => m.status === 'sent' || m.status === 'success');
    return limit ? history.slice(-limit) : history;
  };

  /**
   * 处理消息操作
   * @param action 操作类型
   * @param message 目标消息
   */
  const handleMessageAction = (action: MessageAction, message: ChatMessage): void => {
    console.log('[useMessages] 处理消息操作:', action, message.id);
    
    switch (action) {
      case 'copy':
        // 复制消息内容到剪贴板
        if (navigator.clipboard) {
          navigator.clipboard.writeText(message.content);
        }
        break;
      case 'delete':
        deleteMessage(message.id);
        break;
      case 'regenerate':
        // 重新生成逻辑需要在父组件中处理
        break;
      default:
        console.warn('[useMessages] 未知的消息操作:', action);
    }
  };

  // 计算属性
  const messageCount = computed(() => messages.value.length);
  const hasMessages = computed(() => messages.value.length > 0);
  const isStreaming = computed(() => currentStreamingMessageId.value !== null);
  const lastMessage = computed(() => messages.value[messages.value.length - 1]);

  return {
    // 状态
    messages: messages,
    currentStreamingMessageId,
    
    // 计算属性
    messageCount,
    hasMessages,
    isStreaming,
    lastMessage,
    
    // 方法
    addUserMessage,
    addAssistantMessage,
    updateMessageContent,
    completeMessage,
    markMessageError,
    deleteMessage,
    clearContext,
    getLastUserMessage,
    getMessageHistory,
    handleMessageAction,
  };
}