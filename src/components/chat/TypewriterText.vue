<template>
  <div class="typewriter-container">
    <div class="typewriter-text" v-html="displayedHtml" />
    <span
      v-if="isTyping"
      class="typewriter-cursor"
      :class="{ 'cursor-blink': showCursor }"
      >|</span
    >
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { renderMarkdown } from "@/utils/markdown";

/**
 * 打字机效果组件
 * @description 逐字符显示文本内容，支持Markdown渲染
 */

interface Props {
  /** 要显示的文本内容 */
  text: string;
  /** 打字速度（毫秒/字符） */
  speed?: number;
  /** 是否启用打字机效果 */
  enabled?: boolean;
  /** 是否显示光标 */
  showCursor?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  speed: 30,
  enabled: true,
  showCursor: true,
});

const emit = defineEmits<{
  /** 打字完成事件 */
  complete: [];
  /** 打字进度事件 */
  progress: [progress: number];
}>();

// 状态管理
const displayedText = ref("");
const currentIndex = ref(0);
const isTyping = ref(true);
const typewriterTimer = ref<NodeJS.Timeout | null>(null);
const cursorTimer = ref<NodeJS.Timeout | null>(null);
const showCursorState = ref(true);

// 计算属性
const displayedHtml = computed(() => {
  if (!displayedText.value) return "";

  try {
    // 使用markdown渲染器渲染已显示的文本
    const vnode = renderMarkdown(displayedText.value);
    return vnode.props?.innerHTML || displayedText.value;
  } catch (error) {
    console.error("[TypewriterText] Markdown渲染失败:", error);
    return displayedText.value;
  }
});

const showCursor = computed(() => {
  return props.showCursor && (isTyping.value || showCursorState.value);
});

/**
 * 开始打字机效果
 */
const startTyping = (): void => {
  console.log("[TypewriterText] 🎬 开始打字机效果", {
    enabled: props.enabled,
    text: props.text,
    textLength: props.text?.length || 0,
  });

  if (!props.enabled) {
    // 如果未启用打字机效果，直接显示全部内容
    console.log("[TypewriterText] ⚠️ 打字机效果未启用，直接显示全部内容");
    displayedText.value = props.text;
    emit("complete");
    return;
  }

  // 重置状态
  currentIndex.value = 0;
  displayedText.value = "";
  isTyping.value = true;

  console.log("[TypewriterText] ✅ 打字机状态已重置，开始打字");

  // 开始光标闪烁
  startCursorBlink();

  // 开始逐字符显示
  typeNextCharacter();
};

/**
 * 显示下一个字符
 */
const typeNextCharacter = (): void => {
  if (currentIndex.value >= props.text.length) {
    // 打字完成
    console.log("[TypewriterText] 🎉 打字完成");
    isTyping.value = false;
    emit("complete");
    return;
  }

  // 添加下一个字符
  displayedText.value = props.text.slice(0, currentIndex.value + 1);
  currentIndex.value++;

  // 发送进度事件
  const progress = (currentIndex.value / props.text.length) * 100;
  emit("progress", progress);

  // 每10个字符输出一次进度
  if (currentIndex.value % 10 === 0 || currentIndex.value === 1) {
    console.log("[TypewriterText] 📝 打字进度:", {
      currentIndex: currentIndex.value,
      totalLength: props.text.length,
      progress: Math.round(progress) + "%",
      currentChar: props.text[currentIndex.value - 1],
    });
  }

  // 设置下一次打字的定时器
  typewriterTimer.value = setTimeout(typeNextCharacter, props.speed);
};

/**
 * 开始光标闪烁
 */
const startCursorBlink = (): void => {
  if (cursorTimer.value) {
    clearInterval(cursorTimer.value);
  }

  cursorTimer.value = setInterval(() => {
    showCursorState.value = !showCursorState.value;
  }, 500);
};

/**
 * 停止光标闪烁
 */
const stopCursorBlink = (): void => {
  if (cursorTimer.value) {
    clearInterval(cursorTimer.value);
    cursorTimer.value = null;
  }
  showCursorState.value = true;
};

/**
 * 清理定时器
 */
const cleanup = (): void => {
  if (typewriterTimer.value) {
    clearTimeout(typewriterTimer.value);
    typewriterTimer.value = null;
  }
  stopCursorBlink();
};

/**
 * 跳过打字机效果，直接显示全部内容
 */
const skipTyping = (): void => {
  cleanup();
  displayedText.value = props.text;
  currentIndex.value = props.text.length;
  isTyping.value = true;
  emit("complete");
};

// 监听文本变化
watch(
  () => props.text,
  (newText, oldText) => {
    if (newText !== oldText) {
      cleanup();
      if (newText) {
        startTyping();
      } else {
        displayedText.value = "";
        currentIndex.value = 0;
        isTyping.value = true;
      }
    }
  },
  { immediate: true }
);

// 监听启用状态变化
watch(
  () => props.enabled,
  (enabled) => {
    if (!enabled && isTyping.value) {
      skipTyping();
    }
  }
);

// 生命周期
onMounted(() => {
  console.log("[TypewriterText] 🚀 组件挂载", {
    text: props.text,
    speed: props.speed,
    enabled: props.enabled,
    showCursor: props.showCursor,
    textLength: props.text?.length || 0,
  });
});

onUnmounted(() => {
  console.log("[TypewriterText] 组件卸载");
  cleanup();
});

// 暴露方法给父组件
defineExpose({
  skipTyping,
  startTyping,
  isTyping: () => isTyping.value,
  progress: () => (currentIndex.value / props.text.length) * 100,
});
</script>

<style scoped>
.typewriter-container {
  display: inline-block;
  position: relative;
  line-height: 1.6;
  word-break: break-word;
}

.typewriter-text {
  display: inline;
}

.typewriter-cursor {
  display: inline-block;
  color: #1890ff;
  font-weight: bold;
  margin-left: 2px;
  animation: none;
}

.cursor-blink {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

/* 确保markdown内容样式正确 */
.typewriter-text :deep(p) {
  margin: 0;
  display: inline;
}

.typewriter-text :deep(code) {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: "Courier New", monospace;
}

.typewriter-text :deep(pre) {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
  display: block;
}

.typewriter-text :deep(blockquote) {
  border-left: 4px solid #d9d9d9;
  padding-left: 12px;
  margin: 8px 0;
  color: #666;
}

.typewriter-text :deep(ul),
.typewriter-text :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.typewriter-text :deep(h1),
.typewriter-text :deep(h2),
.typewriter-text :deep(h3),
.typewriter-text :deep(h4),
.typewriter-text :deep(h5),
.typewriter-text :deep(h6) {
  margin: 12px 0 8px 0;
  font-weight: 600;
}
</style>
