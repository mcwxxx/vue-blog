<script setup lang="ts">
import { h, computed, onMounted, onUnmounted } from "vue";
import { Button, Space, Spin, message } from "ant-design-vue";
import { Bubble } from "ant-design-x-vue";
import {
  ReloadOutlined,
  CopyOutlined,
  SoundOutlined,
  PauseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons-vue";
import { renderMarkdown } from "@/utils/markdown";
import { useTTS } from "@/composables/useTTS";

// 定义消息类型
export interface BubbleDataType {
  content: string;
  role: "user" | "assistant";
  status?: "loading" | "success" | "error";
  relatedQuestions?: string[];
}

export interface MessageInfo<T = BubbleDataType> {
  id: string;
  message: T;
  status: "loading" | "success" | "error";
}

// 定义 Props
interface Props {
  messages: MessageInfo<BubbleDataType>[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

// 定义 Emits
const emit = defineEmits<{
  regenerate: [content: string];
  copy: [content: string];
  ttsPlay: [content: string, messageId: string];
  ttsPause: [];
  ttsResume: [];
  ttsStop: [];
}>();

// 初始化 TTS 功能
const {
  isPlaying,
  isPaused, // 添加这行
  isSynthesizing,
  currentMessageId,
  error: ttsError,
  canSpeakText,
  isCurrentMessage,
  speak,
  pause,
  resume,
  stop,
  connect,
} = useTTS();

// 转换消息数据为 Bubble.List 所需格式
const bubbleItems = computed(() => {
  const items = props.messages
    .filter((msg) => msg && msg.message) // 过滤无效消息
    .map((msg) => {
      // 正确检查 loading 状态：检查 status 字段和 loading 字段
      const isLoading =
        msg.status === "loading" ||
        msg.loading === true ||
        msg.message?.loading === true;
      const content = msg.message.content || "";

      const item = {
        // 使用消息ID作为key，确保稳定性
        key: msg.id,
        content: content,
        role: msg.message.role,
        status: msg.status,
        loading: isLoading,
        // 对于助手消息，在有内容时启用打字机效果（包括流式更新过程中）
        // 只有在完全没有内容或者是纯加载状态时才不启用
        typing:
          msg.message.role === "assistant" && content && content.length > 0
            ? {
                step: 2, // 每次显示2个字符
                interval: 20, // 20ms间隔，平衡流畅度和性能
              }
            : false,
        // 添加原始消息ID用于调试
        messageId: msg.id,
      };

      return item;
    });

  // 如果正在加载且没有加载状态的消息，添加一个
  if (props.loading && !items.some((item) => item.loading)) {
    items.push({
      key: `loading-${Date.now()}`,
      content: "正在思考中...",
      role: "assistant" as const,
      status: "loading" as const,
      loading: true,
      typing: false, // 加载提示不需要打字机效果
    });
  }

  return items;
});

// 重新生成处理
function onRegenerate(footerProps: string) {
  emit("regenerate", footerProps);
}

// 复制处理
function onCopy(footerProps: string) {
  navigator.clipboard
    .writeText(footerProps)
    .then(() => {
      message.success("已复制到剪贴板");
      emit("copy", footerProps);
    })
    .catch((err) => {
      message.error("复制失败");
    });
}

// 检查消息是否正在加载
function isMessageLoading(messageId: string): boolean {
  const message = props.messages.find((m) => m.id === messageId);
  if (!message) return false;

  // 检查消息状态
  const isLoading =
    message.status === "loading" || message.message?.status === "loading";

  // 检查是否还在打字机效果中
  const bubbleItem = bubbleItems.value.find(
    (item) => item.messageId === messageId
  );
  const hasTyping = bubbleItem?.typing !== false;

  return isLoading || (hasTyping && message.message.role === "assistant");
}

// TTS 朗读处理 - 支持真正暂停的版本
// 此函数处理 TTS 动作，包括播放、暂停和恢复
// 忽略 isCurrentMessage 检查以确保同一个消息的暂停/恢复可靠
async function handleTTSAction(content: string, messageId: string) {
  console.log("=== TTS Action Debug ===");
  console.log("消息ID:", messageId);
  console.log("当前TTS状态:", {
    isPlaying: isPlaying.value,
    isPaused: isPaused.value,
    isSynthesizing: isSynthesizing.value,
    currentMessageId: currentMessageId.value,
    isCurrentMessage: isCurrentMessage(messageId)
  });

  try {
    // 检查消息是否还在加载中
    if (isMessageLoading(messageId)) {
      console.log("消息正在加载中，跳过TTS操作");
      message.warning("消息还在生成中，请稍后再试");
      return;
    }

    // 如果正在播放，则暂停（忽略 messageId 检查）
    if (isPlaying.value) {
      console.log("执行暂停操作");
      pause();
      emit("ttsPause");
      console.log("暂停后状态:", {
        isPlaying: isPlaying.value,
        isPaused: isPaused.value
      });
      return;
    }

    // 如果已暂停，则直接恢复（忽略 messageId 检查）
    if (isPaused.value) {
      console.log("执行恢复播放操作");
      await resume();
      emit("ttsResume");
      console.log("恢复后状态:", {
        isPlaying: isPlaying.value,
        isPaused: isPaused.value
      });
      return;
    }

    // 开始新的朗读（会自动停止其他播放）
    console.log("开始新的朗读");
    await speak(content, messageId);
    emit("ttsPlay", content, messageId);
    console.log("朗读开始后状态:", {
      isPlaying: isPlaying.value,
      isPaused: isPaused.value,
      currentMessageId: currentMessageId.value
    });
  } catch (error) {
    console.error("TTS操作失败:", error);
    message.error(
      `朗读失败: ${error instanceof Error ? error.message : "未知错误"}`
    );
  }
}

// 同时修复 getTTSButtonTitle 函数 - 添加调试
function getTTSButtonTitle(messageId: string): string {
  const title = (() => {
    if (isSynthesizing.value && isCurrentMessage(messageId)) {
      return "正在合成语音...";
    }
    if (isPlaying.value && isCurrentMessage(messageId)) {
      return "暂停朗读";
    }
    if (isPaused.value && isCurrentMessage(messageId)) {
      return "继续朗读";
    }
    return "朗读内容";
  })();
  
  console.log(`按钮标题 [${messageId}]:`, title, {
    isSynthesizing: isSynthesizing.value,
    isPlaying: isPlaying.value,
    isPaused: isPaused.value,
    isCurrentMessage: isCurrentMessage(messageId)
  });
  
  return title;
}

// 修复 getTTSButtonIcon 函数 - 添加调试
function getTTSButtonIcon(messageId: string) {
  const icon = (() => {
    if (isSynthesizing.value && isCurrentMessage(messageId)) {
      return h(LoadingOutlined, { spin: true });
    }
    if (isPlaying.value && isCurrentMessage(messageId)) {
      return h(PauseCircleOutlined);
    }
    return h(SoundOutlined);
  })();
  
  console.log(`按钮图标 [${messageId}]:`, {
    iconType: isSynthesizing.value && isCurrentMessage(messageId) ? 'loading' : 
              isPlaying.value && isCurrentMessage(messageId) ? 'pause' : 'sound',
    states: {
      isSynthesizing: isSynthesizing.value,
      isPlaying: isPlaying.value,
      isPaused: isPaused.value,
      isCurrentMessage: isCurrentMessage(messageId)
    }
  });
  
  return icon;
}

// 获取TTS按钮图标
// function getTTSButtonIcon(messageId: string) {
//   if (isSynthesizing.value && isCurrentMessage(messageId)) {
//     return h(LoadingOutlined, { spin: true });
//   }
//   if (isPlaying.value && isCurrentMessage(messageId)) {
//     return h(PauseCircleOutlined);
//   }
//   return h(SoundOutlined);
// }

// 检查是否有有效文本可朗读
function hasValidTextForTTS(content: string): boolean {
  if (!content || typeof content !== "string") return false;
  // 简单检查：移除空白字符后是否还有内容
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= 10000;
}

// 生命周期钩子
onMounted(async () => {
  try {
    await connect();
    console.log("[ChatBubble] TTS服务连接成功");
  } catch (error) {
    console.warn("[ChatBubble] TTS服务连接失败:", error);
    // 不显示错误消息，因为TTS是可选功能
  }
});

onUnmounted(() => {
  // 停止当前播放并清理资源
  stop();
  console.log("[ChatBubble] TTS资源已清理");
});

/**
 * 渲染助手消息内容（使用 Bubble 内置打字机效果）
 * @param content 消息内容
 * @param info 消息信息
 * @returns VNode
 */
const renderAssistantMessage = (content: string, info: any) => {
  // 确保每次内容更新时都重新渲染 markdown
  // 这样在流式更新过程中也能正确解析 Markdown 格式
  try {
    return renderMarkdown(content);
  } catch (error) {
    console.error("Markdown渲染失败:", error);
    // 如果渲染失败，返回纯文本
    return h("div", { style: { whiteSpace: "pre-wrap" } }, content);
  }
};

// 配置 Bubble.List 的 roles
const roles = {
  assistant: {
    placement: "start",
    messageRender: renderAssistantMessage,
    footer: (content: string, info: any) => {
      if (info?.loading || info?.status === "loading") {
        return null;
      }

      const messageId = info?.messageId || info?.key || `msg-${Date.now()}`;
      const hasValidText = hasValidTextForTTS(content);
      const isLoading = isMessageLoading(messageId);

      return h(
        "div",
        { style: { display: "flex", gap: "8px", marginTop: "8px" } },
        [
          h(Button, {
            type: "text",
            size: "small",
            icon: h(ReloadOutlined),
            title: "重新生成",
            onClick: () => onRegenerate(content),
          }),
          h(Button, {
            type: "text",
            size: "small",
            icon: h(CopyOutlined),
            title: "复制内容",
            onClick: () => onCopy(content),
          }),
          h(Button, {
            type: "text",
            size: "small",
            icon: getTTSButtonIcon(messageId),
            title: getTTSButtonTitle(messageId),
            disabled:
              !hasValidText ||
              isLoading ||
              (!canSpeakText(content) && !isCurrentMessage(messageId)),
            loading: isSynthesizing.value && isCurrentMessage(messageId),
            onClick: () => handleTTSAction(content, messageId),
          }),
        ]
      );
    },
  },
  user: {
    placement: "end",
  },
};

// 样式
const styles = computed(() => ({
  chatBubble: {
    height: "100%",
    paddingInline: "16px",
  },
  loadingMessage: {
    backgroundImage:
      "linear-gradient(90deg, #ff6b23 0%, #af3cb8 31%, #53b6ff 89%)",
    backgroundSize: "100% 2px",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "bottom",
  },
}));
</script>

<template>
  <div v-if="bubbleItems?.length">
    <Bubble.List
      :style="styles.chatBubble"
      :items="bubbleItems"
      :roles="roles"
    />
  </div>
</template>
