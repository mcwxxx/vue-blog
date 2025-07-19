<script setup lang="ts">
import { computed } from 'vue';
import { Welcome, Prompts } from 'ant-design-x-vue';
import { theme } from 'ant-design-vue';

// 定义 Props
interface Props {
  title?: string;
  description?: string;
  questions?: string[];
  variant?: 'borderless' | 'outlined';
}

const props = withDefaults(defineProps<Props>(), {
  title: '👋 Hello, 我是一位专业的宣传专家，专注于',
  description: '陕西仁医云科技服务公司及其仁医工程和母公司往年活动的推广我的任务是通过生动的语言和丰富的信息，将这些内容清晰、准确地传达给受众。如果您有任何关于仁医工程或母公司活动的问题，欢迎随时向我提问!',
  questions: () => [
    '仁医工程的核心理念是什么？',
    '公司有哪些主要的技术优势？',
    '如何参与仁医工程项目？',
    '公司的发展历程如何？',
    '有哪些成功案例可以分享？',
    '未来的发展规划是什么？',
  ],
  variant: 'borderless',
});

// 定义 Emits
interface Emits {
  questionClick: [question: string];
}

const emit = defineEmits<Emits>();

// 处理问题点击
const handleQuestionClick = (info: any) => {
  const question = String(info?.data?.description || '');
  console.log('[ChatWelcome] 点击问题:', question);
  emit('questionClick', question);
};

// 转换问题为 Prompts 所需格式
const promptItems = computed(() => 
  props.questions.map((question) => ({
    key: question,
    description: question,
  }))
);

// 样式
const { token } = theme.useToken();
const styles = computed(() => ({
  chatWelcome: {
    marginInline: '16px',
    padding: '12px 16px',
    borderRadius: '2px 12px 12px 12px',
    background: 'linear-gradient(97deg, #f2f9fe 0%, #f7f3ff 100%)',
    marginBottom: '16px',
  },
  prompts: {
    marginInline: '16px',
  },
  promptsTitle: {
    fontSize: 14,
  },
}));
</script>

<template>
  <div>
    <!-- 欢迎信息 -->
    <Welcome
      :variant="variant"
      :title="title"
      :description="description"
      :style="styles.chatWelcome"
    />
    
    <!-- 建议问题 -->
    <Prompts
      v-if="questions.length"
      vertical
      title="您可能想了解："
      :items="promptItems"
      :style="styles.prompts"
      :styles="{
        title: styles.promptsTitle,
      }"
      @item-click="handleQuestionClick"
    />
  </div>
</template>