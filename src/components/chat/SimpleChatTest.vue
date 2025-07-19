<template>
  <div class="simple-chat-test">
    <h2>简单聊天测试组件</h2>
    <div class="chat-area">
      <div class="messages">
        <div v-for="msg in messages" :key="msg.id" class="message">
          <strong>{{ msg.role }}:</strong> {{ msg.content }}
        </div>
      </div>
      <div class="input-area">
        <input
          v-model="inputText"
          @keyup.enter="sendMessage"
          placeholder="输入消息..."
          class="chat-input"
        />
        <button @click="sendMessage" class="send-btn">发送</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

interface SimpleMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const messages = ref<SimpleMessage[]>([
  {
    id: "1",
    role: "assistant",
    content: "你好！我是AI助手，有什么可以帮助您的吗？",
  },
]);

const inputText = ref("");

const sendMessage = () => {
  if (!inputText.value.trim()) return;

  // 保存用户输入的内容
  const userMessage = inputText.value;

  // 添加用户消息
  messages.value.push({
    id: Date.now().toString(),
    role: "user",
    content: userMessage,
  });

  // 清空输入框
  inputText.value = "";

  // 模拟AI回复
  setTimeout(() => {
    messages.value.push({
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `我收到了您的消息："${userMessage}"，这是一个测试回复。`,
    });
  }, 1000);
};
</script>

<style scoped>
.simple-chat-test {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chat-area {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.messages {
  height: 300px;
  overflow-y: auto;
  padding: 16px;
  background: #f9f9f9;
}

.message {
  margin-bottom: 12px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.input-area {
  display: flex;
  padding: 16px;
  background: white;
  border-top: 1px solid #e0e0e0;
}

.chat-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  margin-right: 8px;
}

.send-btn {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.send-btn:hover {
  background: #40a9ff;
}
</style>
