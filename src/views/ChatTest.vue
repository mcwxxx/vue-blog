<template>
  <div class="chat-test-page">
    <!-- 去掉header部分 -->

    <div class="chat-container">
      <AIChatRefactored
        :api-url="apiUrl"
        :welcome-title="welcomeTitle"
        :welcome-description="welcomeDescription"
        @close="handleChatClose"
        @message-count="handleMessageCount"
        @error="handleChatError"
      />
    </div>

    <div class="debug-panel" v-if="showDebug">
      <h3>调试信息</h3>
      <div class="debug-item">
        <strong>消息数量:</strong> {{ messageCount }}
      </div>
      <div class="debug-item" v-if="lastError">
        <strong>最后错误:</strong> {{ lastError }}
      </div>
      <div class="debug-actions">
        <button @click="toggleDebug">隐藏调试面板</button>
      </div>
    </div>

    <div class="control-panel">
      <button @click="toggleDebug" class="debug-btn">
        {{ showDebug ? "隐藏" : "显示" }}调试面板
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AIChatRefactored from "@/components/chat/AIChatRefactored.vue";

// 页面状态
const showDebug = ref(false);
const messageCount = ref(0);
const lastError = ref<string | null>(null);

// 聊天配置
const apiUrl = ref("http://39.96.193.106:3000/api/dashscope/completion");
const welcomeTitle = ref("AI 助手测试");
const welcomeDescription = ref(
  "这是重构后的 AI 聊天组件测试页面，您可以在这里测试各种功能。"
);

// 事件处理函数
const handleChatClose = (): void => {
  console.log("[ChatTest] 聊天关闭");
  // 可以添加关闭聊天的逻辑，比如导航到其他页面
};

const handleMessageCount = (count: number): void => {
  messageCount.value = count;
  console.log("[ChatTest] 消息数量更新:", count);
};

const handleChatError = (error: string): void => {
  lastError.value = error;
  console.error("[ChatTest] 聊天错误:", error);
};

const toggleDebug = (): void => {
  showDebug.value = !showDebug.value;
};
</script>

<style scoped>
.chat-test-page {
  height: calc(100vh - 164px);
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.chat-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: stretch;
  min-height: 0;
  height: 100%;
}

.chat-container > * {
  width: 100%;
  max-width: 1200px;
  height: 100%;
}

.debug-panel {
  background: #fff;
  border-top: 1px solid #e8e8e8;
  padding: 16px 20px;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
}

.debug-panel h3 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
}

.debug-item {
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
}

.debug-item strong {
  color: #333;
  margin-right: 8px;
}

.debug-actions {
  margin-top: 12px;
}

.control-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.debug-btn {
  background: #1890ff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
  transition: all 0.3s ease;
}

.debug-btn:hover {
  background: #40a9ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
}

.debug-btn:active {
  transform: translateY(0);
}

button {
  background: #f0f0f0;
  border: 1px solid #d9d9d9;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

button:hover {
  background: #e6f7ff;
  border-color: #1890ff;
  color: #1890ff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    padding: 16px;
  }

  .page-header h1 {
    font-size: 20px;
  }

  .chat-container {
    padding: 12px;
  }

  .debug-panel {
    padding: 12px 16px;
  }

  .control-panel {
    bottom: 12px;
    right: 12px;
  }
}
</style>
