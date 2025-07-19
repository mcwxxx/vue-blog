/**
 * 会话管理 Composable
 * @description 管理多个聊天会话的状态和操作
 */

import { ref, computed, watch } from 'vue';
import type { ConversationItem, SessionItem } from '@/types/chat';

/**
 * 会话管理 Hook
 * @returns 会话相关的状态和方法
 */
export function useConversations() {
  // 会话列表
  const conversations = ref<ConversationItem[]>([]);
  
  // 当前活跃会话ID
  const activeConversationId = ref<string | null>(null);
  
  // 会话计数器（用于生成唯一ID）
  const conversationCounter = ref(0);

  /**
   * 生成新的会话ID
   * @returns 唯一的会话ID
   */
  const generateConversationId = (): string => {
    conversationCounter.value++;
    return `conversation_${Date.now()}_${conversationCounter.value}`;
  };

  /**
   * 创建新会话
   * @param title 会话标题（可选）
   * @returns 新创建的会话
   */
  const createConversation = (title?: string): ConversationItem => {
    const newConversation: ConversationItem = {
      key: generateConversationId(),
      label: title || `新对话 ${conversations.value.length + 1}`,
      timestamp: Date.now(),
    };
    
    conversations.value.unshift(newConversation);
    activeConversationId.value = newConversation.key;
    
    return newConversation;
  };

  /**
   * 切换到指定会话
   * @param conversationId 会话ID
   */
  const switchConversation = (conversationId: string): void => {
    const conversation = conversations.value.find(c => c.key === conversationId);
    if (conversation) {
      activeConversationId.value = conversationId;
    }
  };

  /**
   * 删除指定会话
   * @param conversationId 会话ID
   */
  const deleteConversation = (conversationId: string): void => {
    const index = conversations.value.findIndex(c => c.key === conversationId);
    if (index === -1) {
      return;
    }
    
    const deletedConversation = conversations.value[index];
    conversations.value.splice(index, 1);
    
    // 如果删除的是当前活跃会话，需要切换到其他会话
    if (activeConversationId.value === conversationId) {
      if (conversations.value.length > 0) {
        // 切换到下一个会话，如果没有下一个则切换到上一个
        const nextIndex = index < conversations.value.length ? index : index - 1;
        activeConversationId.value = conversations.value[nextIndex].key;
      } else {
        // 没有其他会话了，创建一个新的
        createConversation();
      }
    }
  };

  /**
   * 更新会话标题
   * @param conversationId 会话ID
   * @param newTitle 新标题
   */
  const updateConversationTitle = (conversationId: string, newTitle: string): void => {
    const conversation = conversations.value.find(c => c.key === conversationId);
    if (conversation) {
      conversation.label = newTitle;
    }
  };

  /**
   * 清空所有会话
   */
  const clearAllConversations = (): void => {
    conversations.value = [];
    activeConversationId.value = null;
    conversationCounter.value = 0;
    
    // 创建一个新的默认会话
    createConversation();
  };

  /**
   * 获取当前活跃会话
   */
  const activeConversation = computed((): ConversationItem | null => {
    if (!activeConversationId.value) return null;
    return conversations.value.find(c => c.key === activeConversationId.value) || null;
  });

  /**
   * 获取会话总数
   */
  const conversationCount = computed((): number => conversations.value.length);

  /**
   * 检查是否有会话
   */
  const hasConversations = computed((): boolean => conversations.value.length > 0);

  /**
   * 转换为 SessionItem 格式（用于 Ant Design X 组件）
   */
  const sessionsForAntdX = computed((): SessionItem[] => {
    return conversations.value.map(conv => ({
      key: conv.key,
      label: conv.label,
    }));
  });

  /**
   * 从本地存储加载会话
   */
  const loadConversationsFromStorage = (): void => {
    try {
      const stored = localStorage.getItem('chat_conversations');
      if (stored) {
        const data = JSON.parse(stored);
        conversations.value = data.conversations || [];
        activeConversationId.value = data.activeId || null;
        conversationCounter.value = data.counter || 0;
      }
      
      // 如果没有会话，创建一个默认会话
      if (conversations.value.length === 0) {
        createConversation();
      }
    } catch (error) {
      // 创建默认会话
      createConversation();
    }
  };

  /**
   * 保存会话到本地存储
   */
  const saveConversationsToStorage = (): void => {
    try {
      const data = {
        conversations: conversations.value,
        activeId: activeConversationId.value,
        counter: conversationCounter.value,
      };
      localStorage.setItem('chat_conversations', JSON.stringify(data));
    } catch (error) {
      // 保存失败时静默处理
    }
  };

  // 监听会话变化，自动保存到本地存储
  watch(
    [conversations, activeConversationId, conversationCounter],
    () => {
      saveConversationsToStorage();
    },
    { deep: true }
  );

  /**
   * 初始化会话管理
   */
  const initializeConversations = (): void => {
    loadConversationsFromStorage();
  };

  /**
   * 清理会话管理
   */
  const cleanupConversations = (): void => {
    saveConversationsToStorage();
  };

  return {
    // 状态
    conversations,
    activeConversationId,
    activeConversation,
    conversationCount,
    hasConversations,
    sessionsForAntdX,
    
    // 方法
    createConversation,
    switchConversation,
    deleteConversation,
    updateConversationTitle,
    clearAllConversations,
    initializeConversations,
    cleanupConversations,
  };
}