/**
 * 聊天核心逻辑 Composable
 * @description 整合消息管理、API调用和终止功能的核心聊天逻辑
 */

import { ref, computed, watch } from 'vue';
import { useMessages } from './useMessages';
import { useAbortController } from './useAbortController';
import { extractRelatedQuestions } from '@/utils/markdown';
import type { ChatMessage, StreamResponse, PromptItem } from '@/types/chat';

/**
 * 聊天核心逻辑 Hook
 * @param apiUrl API地址
 * @returns 聊天相关的状态和方法
 */
export function useChat(apiUrl: string = 'http://39.96.193.106:3000/api/dashscope/completion') {
  // 使用消息管理
  const {
    messages,
    currentStreamingMessageId,
    messageCount,
    hasMessages,
    isStreaming,
    lastMessage,
    addUserMessage,
    addAssistantMessage,
    updateMessageContent,
    completeMessage,
    markMessageError,
    clearContext,
    getMessageHistory,
    handleMessageAction,
  } = useMessages();

  // 使用终止控制
  const {
    abortState,
    createController,
    abortRequest,
    cleanup,
    hasActiveController,
    getSignal,
  } = useAbortController();

  // 加载状态
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * 解析流式响应数据块
   * @param chunk 响应数据块
   * @returns 解析后的文本内容
   */
  const parseStreamChunk = (chunk: string): string => {
    try {
      let jsonStr = chunk.trim();
      if (jsonStr.startsWith('data:')) {
        jsonStr = jsonStr.replace(/^data:/, '').trim();
      }
      if (!jsonStr) return '';
      
      const data = JSON.parse(jsonStr);
      return data.output?.text || '';
    } catch (e) {
      console.warn('[useChat] 流式解析失败:', e);
      return '';
    }
  };

  /**
   * 发送聊天消息
   * @param content 用户输入内容
   */
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim()) {
      console.warn('[useChat] 消息内容为空');
      return;
    }

    // 清除之前的错误
    error.value = null;
    
    // 添加用户消息
    const userMessage = addUserMessage(content.trim());
    
    // 添加助手消息（加载状态）
    const assistantMessage = addAssistantMessage();
    
    // 创建新的终止控制器
    const controller = createController();
    const signal = controller.signal;
    
    // 设置加载状态
    isLoading.value = true;
    
    try {
      console.log('[useChat] 发送消息:', content);
      
      // 构建请求数据（保持现有格式）
      const requestData = {
        input: {
          prompt: content
        },
        parameters: {
          incremental_output: 'true'
        },
        debug: {}
      };
      
      // 发送请求
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'enable'
        },
        body: JSON.stringify(requestData),
        signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('流式响应不可用');
      }
      
      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';
      let buffer = '';
      let done = false;
      
      while (!done && !signal.aborted) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          let lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            console.log('[useChat] 处理流式数据行:', line);
            const text = parseStreamChunk(line);
            if (text) {
              fullContent += text;
              console.log('[useChat] 解析到文本片段:', {
                textLength: text.length,
                textContent: text,
                fullContentLength: fullContent.length,
                messageId: assistantMessage.id
              });
              // 实时更新消息内容
              updateMessageContent(assistantMessage.id, fullContent);
            } else {
              console.log('[useChat] 未解析到文本内容，原始行:', line);
            }
          }
        }
      }
      
      // 检查是否被终止
      if (signal.aborted) {
        markMessageError(assistantMessage.id, '请求已被终止');
        console.log('[useChat] 请求被用户终止');
        return;
      }
      
      // 处理最终结果
      const { main, questions } = extractRelatedQuestions(fullContent);
      completeMessage(assistantMessage.id, main, questions);
      
      console.log('[useChat] 消息发送完成:', {
        contentLength: main.length,
        relatedQuestions: questions.length
      });
      
    } catch (err: any) {
      const errorMessage = err.name === 'AbortError' 
        ? '请求已取消' 
        : `发送失败: ${err.message}`;
      
      markMessageError(assistantMessage.id, errorMessage);
      error.value = errorMessage;
      
      console.error('[useChat] 发送消息失败:', err);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 终止当前请求
   */
  const abortCurrentRequest = (): void => {
    if (isLoading.value && hasActiveController()) {
      abortRequest();
      isLoading.value = false;
      console.log('[useChat] 终止当前请求');
    } else {
      console.warn('[useChat] 没有正在进行的请求可以终止');
    }
  };

  /**
   * 重新生成最后一条助手消息
   */
  const regenerateLastMessage = async (): Promise<void> => {
    const lastUserMessage = messages.value
      .filter(m => m.role === 'user')
      .pop();
    
    if (lastUserMessage) {
      // 删除最后一条助手消息
      const lastAssistantIndex = messages.value.length - 1;
      if (lastAssistantIndex >= 0 && messages.value[lastAssistantIndex].role === 'assistant') {
        messages.value.splice(lastAssistantIndex, 1);
      }
      
      // 重新发送最后一条用户消息
      await sendMessage(lastUserMessage.content);
    }
  };

  /**
   * 处理提示词选择
   * @param prompt 选中的提示词
   */
  const handlePromptSelect = async (prompt: PromptItem): Promise<void> => {
    const content = prompt.description || prompt.label;
    await sendMessage(content);
  };

  /**
   * 处理相关问题点击
   * @param question 问题内容
   */
  const handleRelatedQuestionClick = async (question: string): Promise<void> => {
    await sendMessage(question);
  };

  /**
   * 清除聊天上下文
   */
  const clearChatContext = (): void => {
    // 如果正在请求，先终止
    if (isLoading.value) {
      abortCurrentRequest();
    }
    
    // 清除消息
    clearContext();
    
    // 清除错误状态
    error.value = null;
    
    console.log('[useChat] 清除聊天上下文');
  };

  // 监听终止状态变化
  watch(
    () => abortState.isAborting,
    (isAborting) => {
      if (isAborting && isLoading.value) {
        isLoading.value = false;
      }
    }
  );

  // 计算属性
  const canSendMessage = computed(() => !isLoading.value);
  const canAbort = computed(() => isLoading.value && hasActiveController());
  const canRegenerate = computed(() => {
    return !isLoading.value && 
           hasMessages.value && 
           lastMessage.value?.role === 'assistant';
  });

  // 清理函数
  const cleanupChat = (): void => {
    cleanup();
    isLoading.value = false;
    error.value = null;
  };

  return {
    // 状态
    messages,
    isLoading,
    error,
    messageCount,
    hasMessages,
    isStreaming,
    lastMessage,
    
    // 计算属性
    canSendMessage,
    canAbort,
    canRegenerate,
    
    // 方法
    sendMessage,
    abortCurrentRequest,
    regenerateLastMessage,
    handlePromptSelect,
    handleRelatedQuestionClick,
    clearChatContext,
    handleMessageAction,
    cleanupChat,
  };
}