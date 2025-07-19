<template>
  <div class="chat-container">
    <!-- 聊天头部 -->
    <div class="chat-header">
      <h3>AI 助手</h3>
      <div class="header-actions">
        <button @click="clearMessages" class="action-btn">清除对话</button>
        <button
          @click="abortRequest"
          :disabled="!isLoading"
          class="action-btn danger"
        >
          {{ isLoading ? "终止响应" : "未在响应" }}
        </button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="message-list" ref="messageListRef">
      <div v-if="messages.length === 0" class="welcome-message">
        <h4>👋 欢迎使用 AI 助手</h4>
        <p>我是基于拆分组件架构的新版聊天助手，请开始对话吧！</p>

        <!-- 提示词 -->
        <div class="prompt-suggestions">
          <h5>您可能想了解：</h5>
          <div class="prompt-buttons">
            <button
              v-for="prompt in prompts"
              :key="prompt.key"
              @click="sendPrompt(prompt.label)"
              class="prompt-btn"
            >
              {{ prompt.label }}
            </button>
          </div>
        </div>
      </div>

      <div v-else>
        <div
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="{
            'user-message': message.role === 'user',
            'assistant-message': message.role === 'assistant',
          }"
        >
          <div class="message-content">
            <strong>{{ message.role === "user" ? "用户" : "AI助手" }}:</strong>
            <div class="content-text">{{ message.content }}</div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>

          <!-- 相关问题 -->
          <div
            v-if="message.relatedQuestions && message.relatedQuestions.length"
            class="related-questions"
          >
            <h6>🤔 您可能还想问：</h6>
            <div class="question-buttons">
              <button
                v-for="(question, index) in message.relatedQuestions"
                :key="index"
                @click="sendPrompt(question)"
                class="question-btn"
              >
                {{ question }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-container">
        <textarea
          v-model="inputText"
          @keydown.enter.prevent="handleEnterKey"
          placeholder="输入您的问题... (Shift+Enter 换行，Enter 发送)"
          class="chat-input"
          rows="3"
          :disabled="isLoading"
        ></textarea>
        <button
          @click="sendMessage"
          :disabled="!inputText.trim() || isLoading"
          class="send-btn"
        >
          {{ isLoading ? "发送中..." : "发送" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  status?: "loading" | "success" | "error";
  relatedQuestions?: string[];
}

interface PromptItem {
  key: string;
  label: string;
  description?: string;
}

// 状态
const messages = ref<ChatMessage[]>([]);
const inputText = ref("");
const isLoading = ref(false);
const messageListRef = ref<HTMLDivElement>();

// 提示词
const prompts = ref<PromptItem[]>([
  {
    key: "1",
    label: "什么是仁医工程？",
    description: "了解仁医工程的基本概念",
  },
  { key: "2", label: "如何加入仁医工程？", description: "获取加入流程" },
  { key: "3", label: "仁医工程的发展历程", description: "了解发展历程" },
  { key: "4", label: "仁医工程举办过什么活动？", description: "了解相关活动" },
]);

// 生成消息ID
const generateId = () =>
  `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString();
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  });
};

// 处理 Enter 键
const handleEnterKey = (event: KeyboardEvent) => {
  if (event.shiftKey) {
    // Shift+Enter 换行，不做处理
    return;
  } else {
    // Enter 发送消息
    event.preventDefault();
    sendMessage();
  }
};

// 发送消息
const sendMessage = async () => {
  if (!inputText.value.trim() || isLoading.value) return;

  const userMessage: ChatMessage = {
    id: generateId(),
    role: "user",
    content: inputText.value.trim(),
    timestamp: Date.now(),
    status: "success",
  };

  // 添加用户消息
  messages.value.push(userMessage);
  const userInput = inputText.value.trim();
  inputText.value = "";
  scrollToBottom();

  // 添加加载消息
  const loadingMessage: ChatMessage = {
    id: generateId(),
    role: "assistant",
    content: "正在思考中...",
    timestamp: Date.now(),
    status: "loading",
  };
  messages.value.push(loadingMessage);
  isLoading.value = true;
  scrollToBottom();

  try {
    // 调用 API
    const response = await fetch(
      "http://39.96.193.106:3000/api/dashscope/completion",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DashScope-SSE": "enable",
        },
        body: JSON.stringify({
          input: { prompt: userInput },
          parameters: { incremental_output: "true" },
          debug: {},
        }),
      }
    );

    if (!response.body) {
      throw new Error("流式响应不可用");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullContent = "";
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        let lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            let jsonStr = line.trim();
            if (jsonStr.startsWith("data:")) {
              jsonStr = jsonStr.replace(/^data:/, "").trim();
            }
            if (!jsonStr) continue;

            const data = JSON.parse(jsonStr);
            if (data.output && typeof data.output.text === "string") {
              fullContent += data.output.text;

              // 更新加载消息
              const loadingIndex = messages.value.findIndex(
                (m) => m.id === loadingMessage.id
              );
              if (loadingIndex !== -1) {
                messages.value[loadingIndex] = {
                  ...messages.value[loadingIndex],
                  content: fullContent,
                  status: "loading",
                };
                scrollToBottom();
              }
            }
          } catch (e) {
            console.warn("解析流式数据失败:", e);
          }
        }
      }
    }

    // 处理最终结果
    const { main, questions } = extractRelatedQuestions(fullContent);
    const loadingIndex = messages.value.findIndex(
      (m) => m.id === loadingMessage.id
    );
    if (loadingIndex !== -1) {
      messages.value[loadingIndex] = {
        ...messages.value[loadingIndex],
        content: main,
        status: "success",
        relatedQuestions: questions,
      };
      scrollToBottom();
    }
  } catch (error) {
    console.error("发送消息失败:", error);
    const loadingIndex = messages.value.findIndex(
      (m) => m.id === loadingMessage.id
    );
    if (loadingIndex !== -1) {
      messages.value[loadingIndex] = {
        ...messages.value[loadingIndex],
        content: "抱歉，发送消息失败，请稍后重试。",
        status: "error",
      };
    }
  } finally {
    isLoading.value = false;
  }
};

// 发送提示词
const sendPrompt = (promptText: string) => {
  inputText.value = promptText;
  sendMessage();
};

// 清除消息
const clearMessages = () => {
  messages.value = [];
  isLoading.value = false;
};

// 终止请求
const abortRequest = () => {
  isLoading.value = false;
  // 这里可以添加实际的请求终止逻辑
};

// 提取相关问题
const extractRelatedQuestions = (content: string) => {
  const match = content.match(/可能还会提问的问题[：:]([\s\S]*)/);
  if (!match) {
    return { main: content, questions: [] };
  }

  const main = content.slice(0, match.index).trim();
  const questionsStr = match[1].trim();
  const questions: string[] = [];

  const regex = /[0-9]+[.、．]\s*(.+)/g;
  let qMatch;
  while ((qMatch = regex.exec(questionsStr))) {
    questions.push(qMatch[1].trim());
  }

  return { main, questions };
};

onMounted(() => {
  console.log("ChatContainer 组件已挂载");
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.chat-header h3 {
  margin: 0;
  color: #262626;
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
}

.action-btn:hover {
  border-color: #40a9ff;
  color: #40a9ff;
}

.action-btn.danger {
  border-color: #ff4d4f;
  color: #ff4d4f;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.welcome-message {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.welcome-message h4 {
  color: #1890ff;
  margin-bottom: 10px;
}

.prompt-suggestions {
  margin-top: 30px;
}

.prompt-suggestions h5 {
  margin-bottom: 15px;
  color: #262626;
}

.prompt-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.prompt-btn {
  padding: 8px 16px;
  border: 1px solid #1890ff;
  border-radius: 20px;
  background: white;
  color: #1890ff;
  cursor: pointer;
  transition: all 0.3s;
}

.prompt-btn:hover {
  background: #1890ff;
  color: white;
}

.message {
  margin-bottom: 20px;
}

.user-message .message-content {
  background: #e6f7ff;
  margin-left: 20%;
}

.assistant-message .message-content {
  background: #f6f6f6;
  margin-right: 20%;
}

.message-content {
  padding: 12px 16px;
  border-radius: 8px;
  position: relative;
}

.content-text {
  margin: 8px 0;
  line-height: 1.6;
  white-space: pre-wrap;
}

.message-time {
  font-size: 11px;
  color: #999;
  text-align: right;
  margin-top: 5px;
}

.related-questions {
  margin-top: 15px;
  padding: 12px;
  background: #f0f8ff;
  border-radius: 8px;
  border-left: 3px solid #1890ff;
}

.related-questions h6 {
  margin: 0 0 10px 0;
  color: #1890ff;
  font-size: 13px;
}

.question-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.question-btn {
  padding: 6px 12px;
  border: 1px solid #1890ff;
  border-radius: 15px;
  background: white;
  color: #1890ff;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.question-btn:hover {
  background: #1890ff;
  color: white;
}

.input-area {
  border-top: 1px solid #e8e8e8;
  padding: 16px 20px;
  background: #fafafa;
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  resize: vertical;
  min-height: 40px;
  max-height: 120px;
  font-family: inherit;
}

.chat-input:focus {
  outline: none;
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.send-btn {
  padding: 10px 20px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  min-width: 80px;
}

.send-btn:hover:not(:disabled) {
  background: #40a9ff;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 滚动条样式 */
.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.message-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
