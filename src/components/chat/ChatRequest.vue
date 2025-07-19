<template>
  <div class="chat-request" v-show="false">
    <!-- 隐藏组件，仅用于逻辑处理 -->
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useXAgent } from "ant-design-x-vue";
import type { ChatMessage, RequestFnInfo, RequestFn } from "@/types/chat";

interface Props {
  apiUrl?: string;
  headers?: Record<string, string>;
}

interface Emits {
  (e: "update", data: { content: string; isStreaming: boolean }): void;
  (e: "success", data: { content: string; relatedQuestions?: string[] }): void;
  (e: "error", error: Error): void;
  (e: "start"): void;
  (e: "end"): void;
}

const props = withDefaults(defineProps<Props>(), {
  apiUrl: "http://39.96.193.106:3000/api/dashscope/completion",
  headers: () => ({
    "Content-Type": "application/json",
    "X-DashScope-SSE": "enable",
  }),
});

const emit = defineEmits<Emits>();

/**
 * 解析流式响应数据
 * @param chunk - 响应数据块
 * @returns 解析后的文本内容
 */
const parseStreamChunk = (chunk: string): string => {
  try {
    let jsonStr = chunk.trim();
    if (jsonStr.startsWith("data:")) {
      jsonStr = jsonStr.replace(/^data:/, "").trim();
    }
    if (!jsonStr) return "";

    const data = JSON.parse(jsonStr);
    return data.output?.text || "";
  } catch (e) {
    console.warn("流式解析失败:", e);
    return "";
  }
};

/**
 * 提取相关问题
 * @param content - 完整内容
 * @returns 主内容和相关问题
 */
const extractRelatedQuestions = (content: string) => {
  const match = content.match(/可能还会提问的问题[：:]([\s\S]*)/);
  if (!match) {
    return { main: content, questions: [] };
  }

  const main = content.slice(0, match.index).trim();
  const questionsStr = match[1].trim();
  const questions: string[] = [];

  const regex = /[0-9]+[.、．]\s*(.+)/g;
  let qMatch;
  while ((qMatch = regex.exec(questionsStr))) {
    questions.push(qMatch[1].trim());
  }

  return { main, questions };
};

/**
 * 自定义请求函数，保持现有请求体结构
 * @param info - 请求信息
 * @param callbacks - 回调函数
 */
const customRequest: RequestFn = async (info, callbacks) => {
  emit("start");

  try {
    // 保持现有的请求体结构
    const requestData = {
      input: {
        prompt:
          info.prompt ||
          (info.messages && info.messages[info.messages.length - 1]?.content) ||
          "",
      },
      parameters: {
        incremental_output: "true",
      },
      debug: {},
    };

    const response = await fetch(props.apiUrl, {
      method: "POST",
      headers: props.headers,
      body: JSON.stringify(requestData),
    });

    if (!response.body) {
      throw new Error("流式响应不可用");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullContent = "";
    let buffer = "";
    let done = false;

    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        let lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const text = parseStreamChunk(line);
          if (text) {
            fullContent += text;
            // 调用 useXAgent 的回调
            callbacks.onUpdate?.(fullContent);
            // 同时触发组件事件
            emit("update", {
              content: fullContent,
              isStreaming: true,
            });
          }
        }
      }
    }

    // 处理最终结果
    const { main, questions } = extractRelatedQuestions(fullContent);
    callbacks.onSuccess?.(main);
    emit("success", {
      content: main,
      relatedQuestions: questions,
    });
  } catch (error) {
    const errorMsg =
      error.name === "AbortError" ? "请求已取消" : (error as Error).message;
    callbacks.onError?.(new Error(errorMsg));
    emit("error", new Error(errorMsg));
  } finally {
    emit("end");
  }
};

// 使用 useXAgent Hook
const { request, abort, isRequesting } = useXAgent({
  request: customRequest,
});

/**
 * 发送消息
 * @param content - 用户输入内容或消息列表
 */
const sendMessage = async (content: string | { messages: ChatMessage[] }) => {
  if (typeof content === "string") {
    await request({ prompt: content });
  } else {
    await request({ messages: content.messages });
  }
};

/**
 * 取消当前请求
 */
const abortRequest = () => {
  abort();
};

/**
 * 检查是否正在请求
 */
const getRequestingStatus = () => isRequesting.value;

// 暴露方法给父组件
defineExpose({
  sendMessage,
  abortRequest,
  isRequesting: getRequestingStatus,
});
</script>
