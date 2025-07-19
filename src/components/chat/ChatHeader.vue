<template>
  <div class="chat-header">
    <div class="header-title">
      <h2>{{ title }}</h2>
      <span v-if="subtitle" class="subtitle">{{ subtitle }}</span>
    </div>
    <div class="header-actions">
      <ActionButton
        @click="$emit('clear-context')"
        icon="clear"
        :disabled="isLoading"
      >
        清除上下文
      </ActionButton>
      <ActionButton
        @click="$emit('abort')"
        icon="stop"
        :disabled="!isLoading"
        variant="danger"
      >
        终止响应
      </ActionButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import ActionButton from "../ui/ActionButton.vue";

interface Props {
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
}

withDefaults(defineProps<Props>(), {
  title: "✨ AI Copilot",
  subtitle: "仁医工程智能助手",
  isLoading: false,
});

defineEmits<{
  "clear-context": [];
  abort: [];
}>();
</script>

<style scoped>
.chat-header {
  height: 52px;
  box-sizing: border-box;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #fff;
}

.header-title h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.subtitle {
  font-size: 12px;
  color: #8c8c8c;
  margin-left: 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
}
</style>
