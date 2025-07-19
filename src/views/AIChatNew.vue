<template>
  <div class="ai-chat-page">
    <div class="test-container">
      <h1>AI Chat 拆分组件测试</h1>
      <div class="debug-info">
        <p>当前时间: {{ currentTime }}</p>
        <p>页面状态: 已加载</p>
      </div>
    </div>

    <!-- 简单聊天测试组件 -->
    <SimpleChatTest />

    <!-- 分隔线 -->
    <div class="divider">
      <h3>完整聊天组件测试</h3>
    </div>

    <!-- 完整聊天组件 -->
    <div class="full-chat-container">
      <ChatContainer />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import SimpleChatTest from "../components/chat/SimpleChatTest.vue";
import ChatContainer from "../components/chat/ChatContainer.vue";

const currentTime = ref(new Date().toLocaleString());

onMounted(() => {
  console.log("AIChatNew 页面已挂载");
  setInterval(() => {
    currentTime.value = new Date().toLocaleString();
  }, 1000);
});
</script>

<style scoped>
.ai-chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  padding: 20px;
}

.test-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.debug-info {
  margin-top: 20px;
  padding: 10px;
  background: #f0f0f0;
  border-radius: 4px;
}

.divider {
  margin: 30px 0;
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.divider h3 {
  margin: 0;
  color: #1890ff;
  font-size: 18px;
}

.full-chat-container {
  flex: 1;
  min-height: 600px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
</style>
