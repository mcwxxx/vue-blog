<template>
  <Bubble
    :content="content"
    :avatar="avatar"
    :placement="placement"
    :loading="loading"
    :typing="typing"
    :shape="shape"
    :variant="variant"
  >
    <template #header>
      <div class="message-timestamp">{{ formatTimestamp(timestamp) }}</div>
    </template>
    <template #footer>
      <div class="message-actions">
        <ActionButton @click="copyMessage" icon="copy" size="small" />
        <ActionButton @click="regenerateMessage" icon="refresh" size="small" />
      </div>
    </template>
  </Bubble>
</template>

<script setup lang="ts">
import { Bubble } from "ant-design-x-vue";
import type { BubbleProps } from "ant-design-x-vue";
import ActionButton from "../ui/ActionButton.vue";

interface Props {
  content: string;
  avatar?: BubbleProps["avatar"];
  placement?: "start" | "end";
  loading?: boolean;
  typing?: boolean;
  timestamp?: number;
  shape?: "default" | "round";
  variant?: "filled" | "borderless" | "shadow";
}

const props = withDefaults(defineProps<Props>(), {
  placement: "start",
  loading: false,
  typing: false,
  shape: "default",
  variant: "filled",
});

const emit = defineEmits<{
  copy: [];
  regenerate: [];
}>();

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString();
};

const copyMessage = () => {
  navigator.clipboard.writeText(props.content);
  emit("copy");
};

const regenerateMessage = () => {
  emit("regenerate");
};
</script>
