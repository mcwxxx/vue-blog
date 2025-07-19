import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { ChatMessage, ConversationItem, PromptItem } from "@/types/chat";

export const useChatStore = defineStore("chat", () => {
  // 状态
  const messages = ref<ChatMessage[]>([]);
  const conversations = ref<ConversationItem[]>([]);
  const prompts = ref<PromptItem[]>([]);
  const isLoading = ref(false);
  const currentStreamingMessageId = ref<string | null>(null);

  // 计算属性
  const currentConversation = computed(() =>
    conversations.value.find((c) => c.isActive)
  );

  // 生成唯一ID
  const generateId = () =>
    `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 操作方法
  const addUserMessage = (content: string) => {
    const userMessage: ChatMessage = {
      id: generateId(),
      content,
      role: "user",
      timestamp: Date.now(),
      status: "success",
    };
    messages.value.push(userMessage);
  };

  const addLoadingMessage = () => {
    const loadingMessage: ChatMessage = {
      id: generateId(),
      content: "正在思考中...",
      role: "assistant",
      timestamp: Date.now(),
      status: "loading",
    };
    messages.value.push(loadingMessage);
    currentStreamingMessageId.value = loadingMessage.id;
  };

  const updateStreamingMessage = (content: string) => {
    if (currentStreamingMessageId.value) {
      const messageIndex = messages.value.findIndex(
        (msg) => msg.id === currentStreamingMessageId.value
      );
      if (messageIndex !== -1) {
        messages.value[messageIndex] = {
          ...messages.value[messageIndex],
          content,
          status: "loading",
        };
      }
    }
  };

  const completeMessage = (content: string, relatedQuestions?: string[]) => {
    if (currentStreamingMessageId.value) {
      const messageIndex = messages.value.findIndex(
        (msg) => msg.id === currentStreamingMessageId.value
      );
      if (messageIndex !== -1) {
        messages.value[messageIndex] = {
          ...messages.value[messageIndex],
          content,
          status: "success",
          relatedQuestions,
        };
      }
      currentStreamingMessageId.value = null;
    }
  };

  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  const abortRequest = () => {
    // 清理流式消息状态
    if (currentStreamingMessageId.value) {
      const messageIndex = messages.value.findIndex(
        (msg) => msg.id === currentStreamingMessageId.value
      );
      if (messageIndex !== -1) {
        messages.value[messageIndex] = {
          ...messages.value[messageIndex],
          content: "请求已取消",
          status: "error",
        };
      }
      currentStreamingMessageId.value = null;
    }
    isLoading.value = false;
  };

  const clearMessages = () => {
    messages.value = [];
    currentStreamingMessageId.value = null;
    isLoading.value = false;
  };

  const handleError = (errorMessage: string) => {
    if (currentStreamingMessageId.value) {
      // 更新当前流式消息为错误状态
      const messageIndex = messages.value.findIndex(
        (msg) => msg.id === currentStreamingMessageId.value
      );
      if (messageIndex !== -1) {
        messages.value[messageIndex] = {
          ...messages.value[messageIndex],
          content: errorMessage,
          status: "error",
        };
      }
      currentStreamingMessageId.value = null;
    } else {
      // 添加新的错误消息
      const errorMsg: ChatMessage = {
        id: generateId(),
        content: errorMessage,
        role: "assistant",
        timestamp: Date.now(),
        status: "error",
      };
      messages.value.push(errorMsg);
    }
    isLoading.value = false;
  };

  // 初始化提示词
  const initializePrompts = () => {
    prompts.value = [
      {
        key: "1",
        label: "什么是仁医工程？",
        description: "了解仁医工程的基本概念和目标",
      },
      {
        key: "2",
        label: "如何加入仁医工程？",
        description: "获取加入仁医工程的详细流程",
      },
      {
        key: "3",
        label: "仁医工程的发展历程",
        description: "了解仁医工程至今的发展历程和重要活动",
      },
    ];
  };

  return {
    // 状态
    messages,
    conversations,
    prompts,
    isLoading,

    // 计算属性
    currentConversation,

    // 方法
    addUserMessage,
    addLoadingMessage,
    updateStreamingMessage,
    completeMessage,
    setLoading,
    abortRequest,
    clearMessages,
    handleError,
    initializePrompts,
  };
});
