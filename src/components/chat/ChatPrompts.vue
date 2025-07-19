<script setup lang="ts">
import { computed } from 'vue';
import { Prompts } from 'ant-design-x-vue';

// 定义 Props
interface Props {
  questions: string[];
  title?: string;
  vertical?: boolean;
  style?: Record<string, any>;
}

const props = withDefaults(defineProps<Props>(), {
  title: '🤔 你可能还想问：',
  vertical: true,
  style: () => ({}),
});

// 定义 Emits
interface Emits {
  questionClick: [question: string];
}

const emit = defineEmits<Emits>();

// 处理问题点击
const handleQuestionClick = (info: any) => {
  const question = String(info?.data?.description || '');
  console.log('[ChatPrompts] 点击问题:', question);
  emit('questionClick', question);
};

// 转换问题为 Prompts 所需格式
const promptItems = computed(() => 
  props.questions.map((question, index) => ({
    key: String(index),
    description: question,
  }))
);

// 默认样式
const defaultStyles = computed(() => ({
  margin: '8px 0 0 32px',
  ...props.style,
}));
</script>

<template>
  <div v-if="questions.length" :style="defaultStyles">
    <Prompts
      :title="title"
      :items="promptItems"
      :vertical="vertical"
      @item-click="handleQuestionClick"
    />
  </div>
</template>