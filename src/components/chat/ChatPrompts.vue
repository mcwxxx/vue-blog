<template>
  <div class="chat-prompts">
    <Prompts
      :items="promptItems"
      :vertical="vertical"
      :wrap="wrap"
      :block="block"
      @item-click="handlePromptClick"
    />
  </div>
</template>

<script setup lang="ts">
import { Prompts } from "ant-design-x-vue";
import type { PromptsProps } from "ant-design-x-vue";

interface Props {
  items?: PromptsProps["items"];
  vertical?: boolean;
  wrap?: boolean;
  block?: boolean;
}

withDefaults(defineProps<Props>(), {
  vertical: false,
  wrap: true,
  block: false,
});

const emit = defineEmits<{
  promptSelect: [item: any];
}>();

const handlePromptClick = (info: any) => {
  emit("promptSelect", info.data);
};

// 默认提示词数据
const promptItems: PromptsProps["items"] = [
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
  {
    key: "4",
    label: "仁医工程举办过什么活动？",
    description: "了解仁医工程举办的各种活动和成果",
  },
];
</script>

<style scoped>
.chat-prompts {
  margin: 16px;
}
</style>
