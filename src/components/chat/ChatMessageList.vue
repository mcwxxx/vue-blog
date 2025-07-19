<template>
  <div class="chat-message-list" ref="messageListRef">
    <BubbleList :items="messageItems" :roles="roles">
      <template #item="{ item }">
        <MessageBubble
          :content="item.content"
          :avatar="item.avatar"
          :placement="item.placement"
          :loading="item.loading"
          :typing="item.typing"
          :timestamp="item.timestamp"
          @copy="handleCopy(item)"
          @regenerate="handleRegenerate(item)"
        />
      </template>
    </BubbleList>

    <!-- 相关问题显示 -->
    <template v-for="message in messages" :key="`questions-${message.id}`">
      <div
        v-if="message.relatedQuestions && message.relatedQuestions.length"
        class="related-questions"
      >
        <ChatPrompts
          :items="
            message.relatedQuestions.map((q, idx) => ({
              key: String(idx),
              label: q,
              description: q,
            }))
          "
          :vertical="true"
          @prompt-select="handleRelatedQuestion"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from "vue";
import { BubbleList } from "ant-design-x-vue";
import type { BubbleListProps } from "ant-design-x-vue";
import MessageBubble from "./MessageBubble.vue";
import ChatPrompts from "./ChatPrompts.vue";
import type { ChatMessage, MessageAction } from "@/types/chat";

interface Props {
  messages: ChatMessage[];
  loading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "message-action": [action: MessageAction, message: ChatMessage];
  "related-question": [question: string];
}>();

const messageListRef = ref<HTMLDivElement>();

// 转换消息格式为 BubbleList 需要的格式
const messageItems = computed(() => {
  return props.messages.map((message) => ({
    id: message.id,
    content: message.content,
    role: message.role,
    placement: message.role === "user" ? "end" : "start",
    loading: message.loading || message.status === "loading",
    typing: message.typing,
    timestamp: message.timestamp,
    avatar: message.avatar,
  }));
});

// 配置 BubbleList 的角色样式
const roles: BubbleListProps["roles"] = {
  assistant: {
    placement: "start",
    typing: true,
    avatar: {
      icon: "RobotOutlined",
      style: { background: "#fde3cf" },
    },
  },
  user: {
    placement: "end",
    avatar: {
      icon: "UserOutlined",
      style: { background: "#87d068" },
    },
  },
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  });
};

// 监听消息变化，自动滚动到底部
watch(
  () => props.messages.length,
  () => {
    scrollToBottom();
  },
  { flush: "post" }
);

// 处理消息操作
const handleCopy = (item: any) => {
  const message = props.messages.find((m) => m.id === item.id);
  if (message) {
    emit("message-action", "copy", message);
  }
};

const handleRegenerate = (item: any) => {
  const message = props.messages.find((m) => m.id === item.id);
  if (message) {
    emit("message-action", "regenerate", message);
  }
};

const handleRelatedQuestion = (item: any) => {
  emit("related-question", item.label);
};
</script>

<style scoped>
.chat-message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 0;
}

.related-questions {
  margin: 16px 0 0 48px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #1890ff;
}

.related-questions :deep(.chat-prompts) {
  margin: 0;
}
</style>
