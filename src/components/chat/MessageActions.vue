<script setup lang="ts">
import { h } from 'vue';
import { Button, Space, message } from 'ant-design-vue';
import { ReloadOutlined, CopyOutlined } from '@ant-design/icons-vue';

/**
 * 消息操作组件
 * @description 提供消息的复制、重新生成等操作功能
 */

// 定义 Props
interface Props {
  /** 消息内容 */
  content: string;
  /** 消息ID */
  messageId: string;
  /** 消息角色 */
  role: 'user' | 'assistant';
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否显示重新生成按钮 */
  showRegenerate?: boolean;
  /** 是否显示复制按钮 */
  showCopy?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showRegenerate: true,
  showCopy: true,
});

// 定义 Emits
const emit = defineEmits<{
  /** 重新生成消息 */
  regenerate: [messageId: string, content: string];
  /** 复制消息内容 */
  copy: [messageId: string, content: string];
}>();

/**
 * 处理复制操作
 */
const handleCopy = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(props.content);
    message.success('已复制到剪贴板');
    emit('copy', props.messageId, props.content);
  } catch (error) {
    console.error('复制失败:', error);
    message.error('复制失败');
  }
};

/**
 * 处理重新生成操作
 */
const handleRegenerate = (): void => {
  emit('regenerate', props.messageId, props.content);
};

/**
 * 判断是否应该显示操作按钮
 * @returns 是否显示操作按钮
 */
const shouldShowActions = (): boolean => {
  // 只有助手消息且不在加载状态时才显示操作按钮
  return props.role === 'assistant' && !props.loading && props.content.trim().length > 0;
};
</script>

<template>
  <div v-if="shouldShowActions()" class="message-actions">
    <Space :size="8">
      <!-- 复制按钮 -->
      <Button
        v-if="showCopy"
        type="text"
        size="small"
        :icon="h(CopyOutlined)"
        @click="handleCopy"
        class="action-button"
        title="复制内容"
      >
        复制
      </Button>
      
      <!-- 重新生成按钮 -->
      <Button
        v-if="showRegenerate"
        type="text"
        size="small"
        :icon="h(ReloadOutlined)"
        @click="handleRegenerate"
        class="action-button"
        title="重新生成"
      >
        重新生成
      </Button>
    </Space>
  </div>
</template>

<style scoped>
.message-actions {
  margin-top: 8px;
  padding: 4px 0;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.message-actions:hover {
  opacity: 1;
}

.action-button {
  color: #666;
  border: none;
  box-shadow: none;
  font-size: 12px;
  height: 24px;
  padding: 0 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.action-button:hover {
  color: #1890ff;
  background-color: #f0f8ff;
}

.action-button:focus {
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}
</style>