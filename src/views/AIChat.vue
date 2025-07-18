<script setup lang="ts">
import {
  AppstoreAddOutlined,
  CloseOutlined,
  CloudUploadOutlined,
  CommentOutlined,
  CopyOutlined,
  DislikeOutlined,
  LikeOutlined,
  PaperClipOutlined,
  PlusOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  SoundOutlined,
  PauseOutlined,
  LoadingOutlined,
} from "@ant-design/icons-vue";
import {
  Attachments,
  type Attachment,
  Bubble,
  Conversations,
  type Conversation,
  Prompts,
  Sender,
  Suggestion,
  Welcome,
  useXAgent,
  useXChat,
  theme,
  type MessageStatus as XMessageStatus,
} from "ant-design-x-vue";
import { marked } from "marked";
import { Button, Image, Popover, Space, Spin, message } from "ant-design-vue";
import {
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  computed,
  h,
  type ComputedRef,
  nextTick,
} from "vue";
import markdownit from "markdown-it";
import { Typography } from "ant-design-vue";
import ttsService from "../utils/ttsService";
const md = markdownit({ html: true, breaks: true });

const renderMarkdown = (content) => {
  return h(Typography, null, {
    default: () =>
      h("div", {
        innerHTML: md.render(content || ""),
      }),
  });
};

defineOptions({ name: "PlaygroundCopilotSetup" });

type MessageStatus = XMessageStatus;

type BubbleDataType = {
  role: string;
  content: string;
  status?: MessageStatus;
  association?: Array<{
    key: string;
    description: string;
  }>;
  debugLoading?: boolean;
  debugRole?: string;
  debugStatus?: string;
  debugStreaming?: boolean;
  variant?: "filled" | "outlined" | undefined;
  typing?: boolean;
  loading?: boolean;
  loadingRender?: () => any;
  styles?: {
    content?: {
      [key: string]: string | undefined;
      "background-image"?: string;
      "background-size"?: string;
      "background-repeat"?: string;
      "background-position"?: string;
    };
  };
  output?: {
    text?: string;
  };
  relatedQuestions?: string[];
};

interface MessageInfo<T> {
  id: string;
  message: T;
  status: MessageStatus;
}

const MOCK_SESSION_LIST = [
  {
    key: "5",
    label: "New session",
    group: "Today",
  },
  {
    key: "4",
    label: "What has Ant Design X upgraded?",
    group: "Today",
  },
  {
    key: "3",
    label: "New AGI Hybrid Interface",
    group: "Today",
  },
  {
    key: "2",
    label: "How to quickly install and import components?",
    group: "Yesterday",
  },
  {
    key: "1",
    label: "What is Ant Design X?",
    group: "Yesterday",
  },
];
const MOCK_SUGGESTIONS = [
  { label: "Write a report", value: "report" },
  { label: "Draw a picture", value: "draw" },
  {
    label: "Check some knowledge",
    value: "knowledge",
    children: [
      { label: "About React", value: "react" },
      { label: "About Ant Design", value: "antd" },
    ],
  },
];
const MOCK_QUESTIONS = [
  "什么是仁医工程？",
  "如何加入仁医工程？",
  "仁医工程至今发展了几年，举办过什么活动?",
];
const AGENT_PLACEHOLDER = "Generating content, please wait...";

const attachmentsRef = ref<InstanceType<typeof Attachments>>();
const abortController = ref<AbortController>();

// ==================== State ====================

const messageHistory = ref<Record<string, any>>({});

const sessionList = ref<Conversation[]>(MOCK_SESSION_LIST);
const curSession = ref(sessionList.value[0].key);

const attachmentsOpen = ref(false);
const files = ref<Attachment[]>([]);

const inputValue = ref("");

// TTS 相关状态
const tts = ref<any>(null);
const ttsStatus = ref({
  connection: "disconnected",
  playback: "idle",
  message: null,
});
const currentPlayingMessageId = ref<string | null>(null);
const isConnectingTTS = ref(false);
const playbackProgress = ref(0);
const progressUpdateTimer = ref<number | null>(null);

// 获取播放按钮的标题
function getPlaybackButtonTitle(messageId: string): string {
  if (currentPlayingMessageId.value !== messageId) {
    return "收听内容";
  }

  // 根据播放状态返回不同的标题
  switch (ttsStatus.value.playback) {
    case "playing":
      return "暂停播放";
    case "paused":
      return "继续播放";
    case "loading":
      return "正在加载音频...";
    case "error":
      return "播放出错，点击重试";
    default:
      return "收听内容";
  }
}

// 获取当前播放进度百分比
function getPlaybackProgress(): number {
  if (!tts.value || currentPlayingMessageId.value === null) {
    return 0;
  }

  try {
    // 从TTS服务获取播放进度
    const progress = tts.value.getPlaybackProgress();
    return progress.progress || 0;
  } catch (error) {
    console.error("获取播放进度失败:", error);
    return 0;
  }
}

// 初始化 TTS 服务
function initTTSService() {
  if (tts.value) {
    return; // 如果已经初始化，则不再重复初始化
  }

  isConnectingTTS.value = true;

  // 初始化 TTS 服务
  tts.value = ttsService.init({
    // 状态变更回调
    onStatusChange: (status) => {
      console.log("TTS 状态变更:", status);
      ttsStatus.value = status;
    },
    // 错误回调
    onError: (error) => {
      console.error("TTS 错误:", error);
      message.error(`语音服务错误: ${error.message || "未知错误"}`);
    },
    // 自动重连设置
    autoReconnect: true,
    reconnectAttempts: 3,
    reconnectInterval: 2000,
  });

  // 连接到 TTS 服务器
  tts.value
    .connect()
    .then(() => {
      console.log("TTS 服务连接成功");
      isConnectingTTS.value = false;
    })
    .catch((error) => {
      console.error("TTS 服务连接失败:", error);
      isConnectingTTS.value = false;
    });
}

// 新增：消息列表ref
const messageListRef = ref<HTMLDivElement | null>(null);

// 新增：滚动到底部方法
function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  });
}

// 在组件挂载时初始化 TTS 服务
onMounted(() => {
  console.log("AIChat 组件挂载，初始化 TTS 服务");
  initTTSService();
});

// 在组件卸载前清理 TTS 资源
onBeforeUnmount(() => {
  console.log("AIChat 组件卸载，清理 TTS 资源");
  stopProgressUpdates(); // 确保停止进度更新
  if (tts.value) {
    tts.value.cleanup();
    tts.value = null;
  }
});

// ==================== Runtime ====================

/**
 * 🔔 Please replace the BASE_URL, PATH, MODEL, API_KEY with your own values.
 */
const [agent] = useXAgent<BubbleDataType>({
  baseURL: "http://39.96.193.106:3000/api/dashscope/completion",
});

const isLoading = ref(false);

const bubbleItems = computed(() => {
  return messages.value?.map((i) => ({
    id: i.id,
    role: i.message.role,
    content: i.message.content,
    showFooter: i.message.role === "assistant", // 只为AI消息显示footer
    association: i.message.association,
    status: i.status,
    styles: {
      content:
        i.message.role === "assistant" && i.status !== "success"
          ? styles.value.loadingMessage
          : {},
    },
    loading:
      i.message.role === "assistant" &&
      i.status === "loading" &&
      isLoading.value,
    debugLoading: true,
    debugRole: i.message.role,
    debugStatus: i.status,
    debugStreaming: isLoading.value,
    debugInfo: {
      role: i.message.role,
      status: i.status,
      isLoading: isLoading.value,
      content: i.message.content,
      timestamp: new Date().toISOString(),
    },
    variant: (i.message.role === "assistant" &&
    i.status === "loading" &&
    isLoading.value
      ? "filled"
      : undefined) as "filled" | "outlined" | undefined,
    loadingRender:
      i.message.role === "assistant" &&
      i.status === "loading" &&
      isLoading.value
        ? () => {
            console.log(
              "显示加载状态，当前消息状态:",
              i.status,
              "全局loading:",
              isLoading.value
            );
            return h(Space, null, [
              h(Spin, { size: "small" }),
              "正在思考中...",
            ]);
          }
        : undefined,
  })) satisfies BubbleDataType[];
}) as ComputedRef<BubbleDataType[]>;

watch(
  () => agent.value.isRequesting(),
  (requesting) => {
    console.groupCollapsed("Agent Request State Change");
    console.log("New requesting state:", requesting);
    console.log("Previous isLoading state:", isLoading.value);
    console.log("Messages:", JSON.parse(JSON.stringify(messages.value)));
    console.log("Bubble Items:", JSON.parse(JSON.stringify(bubbleItems.value)));
    console.groupEnd();

    isLoading.value = requesting;

    console.groupCollapsed("After State Update");
    console.log("Current messages:", messages.value);
    console.log("Current bubbleItems:", bubbleItems.value);
    console.log(
      "Messages with loading states:",
      messages.value?.filter((m) => m.status === "loading")
    );
    console.groupEnd();
  }
);

const { messages, onRequest, setMessages } = useXChat<BubbleDataType>({
  agent: agent.value,
  requestFallback: (_, { error }) => {
    if (error.name === "AbortError") {
      return {
        content: "Request is aborted",
        role: "assistant",
        status: "error",
      };
    }
    return {
      content: "Request failed, please try again!",
      role: "assistant",
      status: "error",
    };
  },
  transformMessage: (info: {
    originMessage?: { content?: string; role?: string };
    currentMessage?: any;
    isStreaming?: boolean;
  }) => {
    const originMessage = info?.originMessage || {};
    const currentMessage = info?.currentMessage || {};
    let content = "";
    let association: Array<{ key: string; description: string }> = [];
    let status = info?.isStreaming ? "loading" : "success";
    console.log(currentMessage, "我的打印");
    try {
      console.groupCollapsed("Processing server response");
      console.log("Original currentMessage:", currentMessage);
      console.log(
        "Full response structure:",
        JSON.stringify(currentMessage, null, 2)
      );

      // 记录完整的响应路径
      if (currentMessage?.output) {
        console.log("Output object:", currentMessage.output);
        if (currentMessage.output.text) {
          console.log("Raw text content:", currentMessage.output.text);
          try {
            const parsedText = JSON.parse(currentMessage.output.text);
            console.log("Parsed text content:", parsedText);
          } catch (e) {
            console.log("Text is not JSON, using as plain text");
          }
        }
      }

      // 统一处理响应数据
      const extractContentAndAssociation = (data: any) => {
        let extractedContent = "";
        let extractedAssociation: Array<{ key: string; description: string }> =
          [];

        // 尝试从不同路径提取数据

        const responseData = data?.output?.text || data?.data || data;
        const textContent =
          typeof responseData === "string"
            ? responseData
            : JSON.stringify(responseData);

        try {
          const parsedData =
            typeof responseData === "string"
              ? JSON.parse(responseData)
              : responseData;
          if (parsedData && typeof parsedData === "object") {
            // 提取content

            if (parsedData.content) {
              extractedContent = parsedData.content;
            } else if (parsedData.text) {
              extractedContent = parsedData.text;
            } else if (parsedData.output?.text) {
              extractedContent = parsedData.output.text;
            } else {
              extractedContent = JSON.stringify(parsedData, null, 2);
            }

            // 提取association
            if (parsedData.association) {
              extractedAssociation = parseAssociationQuestions(
                typeof parsedData.association === "string"
                  ? parsedData.association
                  : JSON.stringify(parsedData.association)
              );
            }
          } else {
            extractedContent = textContent;
          }
        } catch (e) {
          console.log("Failed to parse response data, using raw content:", e);
          extractedContent = textContent;
        }

        return { extractedContent, extractedAssociation };
      };

      // 处理各种响应格式
      if (Array.isArray(currentMessage)) {
        console.log("Processing array response");
        const firstItem = currentMessage[0];
        const { extractedContent, extractedAssociation } =
          extractContentAndAssociation(firstItem);
        content = extractedContent;
        association = extractedAssociation;
      } else if (currentMessage?.output || currentMessage?.data) {
        console.log("Processing object response");
        const { extractedContent, extractedAssociation } =
          extractContentAndAssociation(currentMessage);
        content = extractedContent;
        association = extractedAssociation;
      } else {
        console.log("Unknown response format, using raw message");
        content = JSON.stringify(currentMessage, null, 2);
      }
    } catch (e) {
      console.error("解析消息失败:", e);
      content = "解析消息失败，请查看控制台日志";
    }

    // 检查服务器响应状态
    const isErrorResponse =
      currentMessage?.status === "error" ||
      currentMessage?.output?.finish_reason === "error";

    // 确定最终内容
    let finalContent = content;
    if (isErrorResponse) {
      finalContent = "请求处理过程中出现错误，请稍后再试";
    } else if (!finalContent) {
      // 尝试从不同路径获取内容
      const possibleContentPaths = [
        currentMessage?.output?.text,
        currentMessage?.data,
        currentMessage?.message,
        currentMessage?.content,
      ];

      for (const pathContent of possibleContentPaths) {
        if (pathContent) {
          try {
            const parsed =
              typeof pathContent === "string"
                ? JSON.parse(pathContent)
                : pathContent;
            if (parsed?.content) {
              finalContent = parsed.content;
              break;
            } else if (typeof parsed === "string") {
              finalContent = parsed;
              break;
            }
          } catch (e) {
            finalContent = pathContent;
            break;
          }
        }
      }

      // 最终回退
      finalContent =
        finalContent || "暂时无法获取回复内容，请尝试重新提问或稍后再试";
    }

    // 记录最终内容
    console.groupCollapsed("Final content determination");
    console.log("Initial content:", content);
    console.log("Is error response:", isErrorResponse);
    console.log("Final content:", finalContent);
    console.groupEnd();

    console.log("Final content:", finalContent);
    console.log("Association data:", association);
    console.groupEnd();

    const result = {
      content: finalContent,
      role: "assistant",
      association,
      status: status as "loading" | "success" | "error",
    };

    console.groupCollapsed("Final transformed message");
    console.log("Complete transformed message:", result);
    console.log("Message status:", status);
    console.log("Content length:", finalContent.length);
    console.log("Association questions count:", association.length);
    console.groupEnd();

    return result;
  },
  resolveAbortController: (controller) => {
    abortController.value = controller;
  },
});

// ==================== Event ====================
const handleUserSubmit = async (val: string) => {
  console.groupCollapsed("User Submit");
  console.log("Submitted text:", val);
  console.log("Current messages:", JSON.parse(JSON.stringify(messages.value)));
  console.log("Is loading:", isLoading.value);
  console.groupEnd();

  // 添加用户消息
  const userMsgId = `msg_${Date.now()}`;
  setMessages((prev) => [
    ...prev,
    {
      id: userMsgId,
      message: { content: val, role: "user" },
      status: "success",
    } as MessageInfo<BubbleDataType>,
  ]);
  scrollToBottom(); // 新增

  // 立即添加loading状态的消息
  const loadingMsgId = `msg_${Date.now()}`;
  setMessages((prev) => [
    ...prev,
    {
      id: loadingMsgId,
      message: {
        content: "正在思考中...",
        role: "assistant",
        status: "loading",
      },
      status: "loading",
    },
  ]);
  scrollToBottom(); // 新增

  const url = "http://39.96.193.106:3000/api/dashscope/completion";
  const requestData = {
    input: {
      prompt: val,
    },
    parameters: {
      incremental_output: "true",
    },
    debug: {},
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DashScope-SSE": "enable",
      },
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
        console.log("收到 chunk:", chunk);
        buffer += chunk;
        let lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            let jsonStr = line.trim();
            if (jsonStr.startsWith("data:")) {
              jsonStr = jsonStr.replace(/^data:/, "").trim();
            }
            if (!jsonStr) continue;
            console.log("尝试解析行:", jsonStr);
            const data = JSON.parse(jsonStr);
            if (data.output && typeof data.output.text === "string") {
              console.log("解析到 text:", data.output.text);
              fullContent += data.output.text;
              console.log("当前 fullContent:", fullContent);
              setMessages((prev) => {
                const updatedMessages = prev.map((msg) => {
                  if (
                    msg.message.role === "assistant" &&
                    msg.status === "loading"
                  ) {
                    return {
                      ...msg,
                      message: {
                        ...msg.message,
                        content: fullContent,
                      },
                    };
                  }
                  return msg;
                });
                return updatedMessages;
              });
              scrollToBottom(); // 新增
            }
          } catch (e) {
            console.warn("流式解析失败，原始行：", line, e);
          }
        }
      }
    }
    // 结束后将loading消息替换为最终消息
    const { main, questions } = extractRelatedQuestions(fullContent);
    console.log("【调试】最终主内容：", main);
    console.log("【调试】最终相关问题：", questions);
    setMessages((prev) => {
      const filteredPrev = prev.filter(
        (msg) => !(msg.message.role === "assistant" && msg.status === "loading")
      );
      return [
        ...filteredPrev,
        {
          id: `msg_${Date.now()}`,
          message: {
            content: main,
            role: "assistant",
            status: "success",
            relatedQuestions: questions,
          },
          status: "success",
        },
      ];
    });
    scrollToBottom(); // 新增
  } catch (error) {
    setMessages((prev) => {
      const filteredPrev = prev.filter(
        (msg) => !(msg.message.role === "assistant" && msg.status === "loading")
      );
      return [
        ...filteredPrev,
        {
          id: `msg_${Date.now()}`,
          message: {
            content: error.message || "Request failed",
            role: "assistant",
            status: "error",
          },
          status: "error",
        },
      ];
    });
    scrollToBottom(); // 新增
  }
};

// 解析关联问题
const parseAssociationQuestions = (
  association: string
): Array<{ key: string; description: string }> => {
  console.groupCollapsed("Parsing association questions");
  console.log("Original association string:", association);

  if (!association) {
    console.log("Empty association string, returning empty array");
    console.groupEnd();
    return [];
  }

  // 匹配类似 "1. 问题内容" 的格式
  const questionRegex = /\d+\.\s*(.+?)(?=\n\d+\.|\n*$)/g;
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;

  console.log("Starting regex matching");
  while ((match = questionRegex.exec(association)) !== null) {
    console.log(`Found match at index ${match.index}:`, match[0]);
    matches.push(match);
  }

  const result = matches.map((match, index) => ({
    key: `assoc-${index}`,
    description: match[1]?.trim() || "",
  }));

  console.log("Final parsed association questions:", result);
  console.groupEnd();
  return result;
};

// 工具函数：抽离相关问题
function extractRelatedQuestions(fullContent: string) {
  console.log("【调试】待抽离内容：", fullContent);
  // 跨多行匹配
  const match = fullContent.match(/可能还会提问的问题[：:][\s\S]*/);
  if (!match) {
    console.log("【调试】未匹配到相关问题");
    return { main: fullContent, questions: [] };
  }
  const before = fullContent.slice(0, match.index).trim();
  const questionsStr = match[0].replace(/^可能还会提问的问题[：:]/, "").trim();
  const questions = [];
  // 匹配 1. xxx 2. xxx 3. xxx
  const regex = /[0-9]+[.、．]\s*(.+)/g;
  let qMatch;
  while ((qMatch = regex.exec(questionsStr))) {
    questions.push(qMatch[1].trim());
  }
  console.log("【调试】主内容：", before);
  console.log("【调试】相关问题：", questions);
  return { main: before, questions };
}

const setCopilotOpen = (val: boolean) => (copilotOpen.value = val);

const createNewSession = () => {
  if (agent.value.isRequesting()) {
    message.error(
      "Message is Requesting, you can create a new conversation after request done or abort it right now..."
    );
    return;
  }

  const timeNow = new Date().getTime().toString();
  sessionList.value = [
    { key: timeNow, label: "New session", group: "Today" },
    ...sessionList.value,
  ];
  curSession.value = timeNow;
};

const changeConversation = async (val: string) => {
  curSession.value = val;
};

const onPasteFile = (_: File, files: FileList) => {
  for (const file of Array.from(files)) {
    attachmentsRef.value?.upload(file);
  }
  attachmentsOpen.value = true;
};

// ==================== Style ====================
const { token } = theme.useToken();
const styles = computed(() => {
  return {
    copilotChat: {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      background: token.value.colorBgContainer,
      color: token.value.colorText,
      height: "100%",
    },
    chatHeader: {
      height: "52px",
      boxSizing: "border-box",
      borderBottom: `1px solid ${token.value.colorBorder}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 10px 0 16px",
    },
    headerTitle: {
      "font-weight": 600,
      "font-size": "15px",
    },
    headerButton: {
      width: "32px",
      height: "32px",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      "font-size": "18px",
    },
    conversations: {
      width: "300px",
      "& .ant-conversations-list": {
        paddingInlineStart: 0,
      },
    },
    chatList: {
      overflow: "auto",
      "padding-block": "16px",
      flex: 1,
      minHeight: 0,
    },
    chatWelcome: {
      "margin-inline": "16px",
      padding: "12px 16px",
      "border-radius": "2px 12px 12px 12px",
      background: "linear-gradient(97deg, #f2f9fe 0%, #f7f3ff 100%)",
      "margin-bottom": "16px",
    },
    loadingMessage: {
      "background-image":
        "linear-gradient(90deg, #ff6b23 0%, #af3cb8 31%, #53b6ff 89%)",
      "background-size": "100% 2px",
      "background-repeat": "no-repeat",
      "background-position": "bottom",
    },
    chatSend: {
      padding: "12px",
    },
    sendAction: {
      display: "flex",
      "align-items": "center",
      "margin-bottom": "12px",
      gap: "8px",
    },
    speechButton: {
      "font-size": "18px",
      color: `${token.value.colorText} !important`,
    },
  } as const;
});

const copilotOpen = ref<boolean>(true);

// 配置marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

// 配置 Bubble.List 的 roles，assistant 消息用 markdown-it 渲染
const roles: (typeof Bubble.List)["roles"] = {
  assistant: {
    placement: "start",
    messageRender: renderMarkdown,
    loadingRender: () =>
      h(Space, null, [h(Spin, { size: "small" }), "正在思考中"]),
    footer: (info: any) =>
      h("div", { style: { display: "flex", gap: "8px" } }, [
        h(Button, {
          type: "text",
          size: "small",
          icon: h(ReloadOutlined),
          title: "重新生成",
          onClick: () => onRegenerate(info),
        }),
        h(Button, {
          type: "text",
          size: "small",
          icon: h(CopyOutlined),
          title: "复制内容",
          onClick: () => onCopy(info),
        }),
        h("div", { style: { display: "flex", alignItems: "center" } }, [
          h(Button, {
            type: "text",
            size: "small",
            icon: h(
              currentPlayingMessageId.value === info.id
                ? ttsStatus.value.playback === "paused"
                  ? SoundOutlined
                  : PauseOutlined
                : SoundOutlined
            ),
            title: getPlaybackButtonTitle(info.id),
            loading:
              isConnectingTTS.value ||
              (currentPlayingMessageId.value === info.id &&
                (ttsStatus.value.playback === "loading" ||
                  ttsStatus.value.connection === "connecting")),
            onClick: () => onListen({ ...info, id: info.id }),
            style:
              currentPlayingMessageId.value === info.id
                ? {
                    backgroundColor:
                      ttsStatus.value.playback === "playing"
                        ? "rgba(0, 128, 0, 0.1)"
                        : ttsStatus.value.playback === "paused"
                        ? "rgba(255, 165, 0, 0.1)"
                        : "",
                    color:
                      ttsStatus.value.playback === "playing"
                        ? "green"
                        : ttsStatus.value.playback === "paused"
                        ? "orange"
                        : "",
                  }
                : {},
          }),
          // 播放状态指示器
          currentPlayingMessageId.value === info.id &&
          ttsStatus.value.playback !== "idle" &&
          ttsStatus.value.playback !== "error"
            ? h(
                "div",
                {
                  style: {
                    marginLeft: "4px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "2px",
                  },
                },
                [
                  // 状态文本
                  h("div", {
                    style: {
                      fontSize: "12px",
                      color:
                        ttsStatus.value.playback === "playing"
                          ? "green"
                          : ttsStatus.value.playback === "paused"
                          ? "orange"
                          : "#666",
                    },
                    innerHTML:
                      ttsStatus.value.playback === "playing"
                        ? "播放中"
                        : ttsStatus.value.playback === "paused"
                        ? "已暂停"
                        : ttsStatus.value.playback === "loading"
                        ? "加载中"
                        : "",
                  }),
                  // 进度条 (仅在播放或暂停时显示)
                  ttsStatus.value.playback === "playing" ||
                  ttsStatus.value.playback === "paused"
                    ? h(
                        "div",
                        {
                          style: {
                            width: "60px",
                            height: "4px",
                            backgroundColor: "#f0f0f0",
                            borderRadius: "2px",
                            overflow: "hidden",
                          },
                        },
                        [
                          h("div", {
                            style: {
                              width: `${getPlaybackProgress()}%`,
                              height: "100%",
                              backgroundColor:
                                ttsStatus.value.playback === "playing"
                                  ? "green"
                                  : "orange",
                              transition: "width 0.3s",
                            },
                          }),
                        ]
                      )
                    : null,
                ]
              )
            : null,
        ]),
      ]),
  },
  user: { placement: "end" },
};

function onRegenerate(footerProps) {
  // footerProps 就是当前AI回复的内容（字符串）
  const idx = messages.value.findIndex(
    (m) => m.message.role === "assistant" && m.message.content === footerProps
  );
  if (idx > 0) {
    // 向前查找最近一条 user 消息
    const userMsg = messages.value
      .slice(0, idx)
      .reverse()
      .find((m) => m.message.role === "user");
    if (userMsg) {
      handleUserSubmit(userMsg.message.content);
    } else {
      message.warning("未找到前一条用户消息，无法重新生成");
    }
  } else {
    message.warning("未找到对应的AI消息，无法重新生成");
  }
}

function onCopy(footerProps: any) {
  console.log("[AIChat] 复制内容 footerProps:", footerProps);
  navigator.clipboard
    .writeText(footerProps)
    .then(() => {
      message.success("已复制到剪贴板");
    })
    .catch((err) => {
      message.error("复制失败");
      console.error("[AIChat] 复制失败", err);
    });
}

// 添加相关问题点击处理
function handleRelatedQuestion(question: string) {
  // 清空所有已存在的 relatedQuestions
  setMessages((prev) =>
    prev.map((msg) => {
      if (
        msg.message.role === "assistant" &&
        msg.message.relatedQuestions &&
        msg.message.relatedQuestions.length
      ) {
        return {
          ...msg,
          message: {
            ...msg.message,
            relatedQuestions: [],
          },
        };
      }
      return msg;
    })
  );
  // 填充输入框并发起新提问
  inputValue.value = question;
  handleUserSubmit(question);
}

// 开始定时更新播放进度
function startProgressUpdates() {
  // 清除现有的计时器
  stopProgressUpdates();

  // 创建新的计时器，每200毫秒更新一次进度
  progressUpdateTimer.value = window.setInterval(() => {
    if (!tts.value || currentPlayingMessageId.value === null) {
      playbackProgress.value = 0;
      return;
    }

    try {
      // 从TTS服务获取播放进度
      const progress = tts.value.getPlaybackProgress();
      playbackProgress.value = progress.progress || 0;
    } catch (error) {
      console.error("获取播放进度失败:", error);
    }
  }, 200);
}

// 停止更新播放进度
function stopProgressUpdates() {
  if (progressUpdateTimer.value !== null) {
    window.clearInterval(progressUpdateTimer.value);
    progressUpdateTimer.value = null;
  }
}

// TTS 相关功能
function onListen(info: any) {
  console.group("TTS触发");
  console.log("触发TTS，参数:", info);

  // 获取消息ID和内容
  const messageId = info.id || info;
  const messageContent = typeof info === "string" ? info : info.content;

  console.log("消息ID:", messageId);
  console.log("消息内容类型:", typeof messageContent);
  console.log("消息内容长度:", messageContent?.length || 0);

  // 如果当前正在播放这条消息，则暂停播放
  if (currentPlayingMessageId.value === messageId) {
    console.log("当前消息正在播放，切换播放/暂停状态");
    if (tts.value) {
      tts.value.togglePlayPause().then((state) => {
        console.log("播放状态切换为:", state);
        if (state === "paused") {
          // 如果暂停了，保持当前播放消息ID不变
          message.info("语音播放已暂停");
        } else if (state === "playing") {
          // 如果恢复播放，保持当前播放消息ID不变
          message.info("语音播放已恢复");
        } else {
          // 如果出错或其他状态，清除当前播放消息ID
          currentPlayingMessageId.value = null;
        }
      });
    }
    console.groupEnd();
    return;
  }

  // 停止当前正在播放的其他消息
  if (currentPlayingMessageId.value && tts.value) {
    console.log("停止当前播放的其他消息:", currentPlayingMessageId.value);
    tts.value.stop();
  }

  // 提取纯文本（去除Markdown）
  console.log("开始提取纯文本...");
  const plainText = extractPlainText(messageContent);
  console.log("提取的纯文本长度:", plainText?.length || 0);

  if (!plainText) {
    console.error("无法提取有效的文本内容");
    message.error("无法提取有效的文本内容");
    console.groupEnd();
    return;
  }

  // 确保TTS服务已初始化
  if (!tts.value) {
    console.log("TTS服务未初始化，正在初始化...");
    initTTSService();
  }

  // 检查TTS服务连接状态
  if (tts.value && !tts.value.isConnected()) {
    console.log("TTS服务未连接，正在连接...");
    message.loading("正在连接语音服务...");
    tts.value
      .connect()
      .then(() => {
        console.log("TTS服务连接成功，开始语音转换");
        processTTSRequest(messageId, plainText);
      })
      .catch((error) => {
        console.error("TTS服务连接失败:", error);
        message.error(`语音服务连接失败: ${error.message || "未知错误"}`);
        console.groupEnd();
      });
  } else {
    // TTS服务已连接，直接处理请求
    processTTSRequest(messageId, plainText);
  }

  console.groupEnd();
}

// 处理TTS请求的辅助函数
function processTTSRequest(messageId: string, text: string) {
  console.group("处理TTS请求");
  console.log("消息ID:", messageId);
  console.log("文本长度:", text.length);

  // 设置当前播放的消息ID
  currentPlayingMessageId.value = messageId;

  // 显示加载指示器
  message.loading({
    content: "正在转换文本为语音...",
    duration: 0,
    key: "tts-loading",
  });

  // 使用TTS服务播放文本
  tts.value
    .speak(text)
    .then(() => {
      console.log("TTS请求已发送");

      // 监听播放状态变化
      const statusWatcher = watch(
        () => ttsStatus.value.playback,
        (newStatus) => {
          console.log("TTS播放状态变化:", newStatus);

          if (newStatus === "playing") {
            // 播放开始，关闭加载提示
            message.destroy("tts-loading");
            message.success("语音播放开始");
            // 开始更新进度
            startProgressUpdates();
          } else if (newStatus === "error") {
            // 播放错误
            message.destroy("tts-loading");
            message.error("语音播放失败");
            currentPlayingMessageId.value = null;
            stopProgressUpdates(); // 停止更新进度
            statusWatcher(); // 停止监听
          } else if (newStatus === "idle") {
            // 播放结束
            message.info("语音播放完成");
            currentPlayingMessageId.value = null;
            stopProgressUpdates(); // 停止更新进度
            statusWatcher(); // 停止监听
          } else if (newStatus === "paused") {
            // 播放暂停，但继续更新进度（显示暂停位置）
            message.info("语音播放已暂停");
          }
        }
      );
    })
    .catch((error) => {
      console.error("TTS请求失败:", error);
      message.destroy("tts-loading");
      message.error(`语音转换失败: ${error.message || "未知错误"}`);
      currentPlayingMessageId.value = null;
      stopProgressUpdates(); // 停止更新进度
    });

  console.groupEnd();
}

// 从Markdown文本中提取纯文本
function extractPlainText(markdownText: string): string {
  if (!markdownText) return "";

  console.log("提取纯文本，原始文本长度:", markdownText.length);

  try {
    // 移除代码块（包括语言标识）
    let text = markdownText.replace(/```[\s\S]*?```/g, "");

    // 移除行内代码，但保留代码内容
    text = text.replace(/`([^`]+)`/g, "$1");

    // 移除标题标记
    text = text.replace(/#{1,6}\s+/g, "");

    // 移除链接，保留链接文本
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    // 移除图片标记
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");

    // 移除粗体和斜体标记
    text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
    text = text.replace(/(\*|_)(.*?)\1/g, "$2");

    // 移除列表标记
    text = text.replace(/^[\*\-+]\s+/gm, "");
    text = text.replace(/^\d+\.\s+/gm, "");

    // 移除HTML标签
    text = text.replace(/<[^>]*>/g, "");

    // 移除表格标记
    text = text.replace(/\|.*\|/g, "");
    text = text.replace(/[-:]+/g, "");

    // 移除引用标记
    text = text.replace(/^>\s+/gm, "");

    // 移除水平线
    text = text.replace(/^-{3,}|^_{3,}|^\*{3,}/gm, "");

    // 移除多余空白行
    text = text.replace(/\n{3,}/g, "\n\n");

    // 移除多余空白
    text = text.replace(/\s+/g, " ").trim();

    console.log("提取后的纯文本长度:", text.length);

    // 如果提取后文本为空，返回原始文本的简单处理版本
    if (!text.trim()) {
      console.warn("提取后文本为空，使用简单处理");
      return markdownText.replace(/[#*`_>|]/g, "").trim();
    }

    return text;
  } catch (error) {
    console.error("提取纯文本时出错:", error);
    // 出错时返回原始文本的简单处理版本
    return markdownText.replace(/[#*`_>|]/g, "").trim();
  }
}
</script>

<template>
  <div :style="{ display: 'flex', height: '100%', minWidth: '1000px' }">
    <div
      :style="{ ...styles.copilotChat, display: copilotOpen ? 'flex' : 'none' }"
    >
      <!-- 对话区 - header -->
      <div :style="styles.chatHeader">
        <div :style="styles.headerTitle">✨ AI Copilot</div>
        <Space :size="0">
          <Button
            type="text"
            :icon="h(PlusOutlined)"
            :style="styles.headerButton"
            @click="createNewSession"
          />
          <Popover
            placement="bottom"
            :overlay-style="{ padding: 0, maxHeight: 600 }"
          >
            <template #content>
              <Conversations
                :items="
                  sessionList?.map((i) =>
                    i.key === curSession
                      ? { ...i, label: `[current] ${i.label}` }
                      : i
                  )
                "
                :active-key="curSession"
                groupable
                :styles="{
                  ...styles.conversations,
                  item: { padding: '0 8px' },
                }"
                @active-change="changeConversation"
              />
            </template>
            <Button
              type="text"
              :icon="h(CommentOutlined)"
              :style="styles.headerButton"
            />
          </Popover>
          <Button
            type="text"
            :icon="h(CloseOutlined)"
            :style="styles.headerButton"
            @click="setCopilotOpen(false)"
          />
        </Space>
      </div>
      <!-- 对话区 - 消息列表 -->
      <div :style="styles.chatList" ref="messageListRef">
        <div v-if="messages?.length">
          <Bubble.List
            :style="{ height: '100%', paddingInline: '16px' }"
            :items="bubbleItems"
            :roles="roles"
          />

          <!-- 在每条AI消息后显示关联问题 -->
          <template v-for="msg in messages" :key="msg.id">
            <div
              v-if="
                msg.message.relatedQuestions &&
                msg.message.relatedQuestions.length
              "
              style="margin: 8px 0 0 32px"
            >
              <Prompts
                title="🤔 你可能还想问："
                :items="
                  msg.message.relatedQuestions.map((q, idx) => ({
                    key: String(idx),
                    description: q,
                  }))
                "
                vertical
                @itemClick="
                  ({ data }) => handleRelatedQuestion(data.description)
                "
              />
            </div>
          </template>
        </div>
        <template v-else>
          <Welcome
            variant="borderless"
            title="👋 Hello, 我是一位专业的宣传专家，专注于"
            description="陕西仁医云科技服务公司及其仁医工程和母公司往年活动的推广我的任务是通过生动的语言和丰富的信息，将这些内容清晰、准确地传达给受众。如果您有任何关于仁医工程或母公司活动的问题，欢迎随时向我提问!"
            :style="styles.chatWelcome"
          />
          <Prompts
            vertical
            title="您可能想了解："
            :items="MOCK_QUESTIONS.map((i) => ({ key: i, description: i }))"
            :style="{
              'margin-inline': '16px',
            }"
            :styles="{
              title: { fontSize: 14 },
            }"
            @item-click="
              (info) => handleUserSubmit(String(info?.data?.description || ''))
            "
          />
        </template>
      </div>

      <!-- 对话区 - 输入框 -->
      <div :style="styles.chatSend">
        <div :style="styles.sendAction">
          <Button
            :icon="h(ScheduleOutlined)"
            @click="handleUserSubmit('What has Ant Design X upgraded?')"
          >
            Upgrades
          </Button>
          <Button
            :icon="h(AppstoreOutlined)"
            @click="
              handleUserSubmit(
                'What component assets are available in Ant Design X?'
              )
            "
          >
            Components
          </Button>
          <Button :icon="h(AppstoreAddOutlined)"> More </Button>
        </div>
        <!-- 输入框 -->
        <Suggestion
          :items="() => MOCK_SUGGESTIONS"
          @select="(itemVal) => (inputValue = `[${itemVal}]:`)"
        >
          <template #default>
            <Sender
              :loading="isLoading"
              :value="inputValue"
              allow-speech
              placeholder="Ask or input / use skills"
              @change="
                (v) => {
                  inputValue = v;
                }
              "
              @submit="
                () => {
                  handleUserSubmit(inputValue);
                  inputValue = '';
                }
              "
              @cancel="
                () => {
                  try {
                    abortController?.abort();
                  } catch (error) {
                    console.error(error);
                  }
                }
              "
              @paste-file="onPasteFile"
            >
              <template #header>
                <Sender.Header
                  title="Upload File"
                  :styles="{ content: { padding: 0 } }"
                  :open="attachmentsOpen"
                  force-render
                  @open-change="(val) => (attachmentsOpen = val)"
                >
                  <Attachments
                    ref="attachmentsRef"
                    :before-upload="() => false"
                    :items="files"
                    :placeholder="
                      (type) =>
                        type === 'drop'
                          ? { title: 'Drop file here' }
                          : {
                              icon: h(CloudUploadOutlined),
                              title: 'Upload files',
                              description:
                                'Click or drag files to this area to upload',
                            }
                    "
                    @change="({ fileList }) => (files = fileList)"
                  />
                </Sender.Header>
              </template>
              <template #prefix>
                <Button
                  type="text"
                  :icon="h(PaperClipOutlined, { style: { fontSize: '18px' } })"
                  @click="attachmentsOpen = !attachmentsOpen"
                />
              </template>
              <template
                #actions="{
                  info: {
                    components: { SendButton, LoadingButton, SpeechButton },
                  },
                }"
              >
                <div :style="{ display: 'flex', alignItems: 'center', gap: 4 }">
                  <component :is="SpeechButton" :style="styles.speechButton" />
                  <component
                    :is="LoadingButton"
                    v-if="isLoading"
                    type="default"
                  />
                  <component :is="SendButton" v-else type="primary" />
                </div>
              </template>
            </Sender>
          </template>
        </Suggestion>
      </div>
    </div>
  </div>
</template>
// TTS 相关功能 function onListen(messageContent: string) { //
如果当前正在播放这条消息，则暂停播放 if (currentPlayingMessageId.value ===
messageContent) { if (tts.value) { tts.value.togglePlayPause().then((state) => {
console.log('播放状态切换为:', state); if (state === 'paused') { //
如果暂停了，保持当前播放消息ID不变 } else if (state === 'playing') { //
如果恢复播放，保持当前播放消息ID不变 } else { //
如果出错或其他状态，清除当前播放消息ID currentPlayingMessageId.value = null; }
}); } return; } // 查找消息对象 const messageObj = messages.value.find(msg =>
msg.message.role === 'assistant' && msg.message.content === messageContent ); if
(!messageObj) { message.error('未找到对应的消息内容'); return; } //
提取纯文本（去除Markdown） const plainText = extractPlainText(messageContent);
if (!plainText) { message.error('无法提取有效的文本内容'); return; } //
确保TTS服务已初始化 if (!tts.value) { initTTSService(); } //
设置当前播放的消息ID currentPlayingMessageId.value = messageContent; //
使用TTS服务播放文本 tts.value.speak(plainText) .then(() => {
console.log('TTS请求已发送'); }) .catch((error) => {
console.error('TTS请求失败:', error); message.error(`语音转换失败:
${error.message || '未知错误'}`); currentPlayingMessageId.value = null; }); } //
从Markdown文本中提取纯文本 function extractPlainText(markdownText: string):
string { // 移除代码块 let text = markdownText.replace(/```[\s\S]*?```/g, '');
// 移除行内代码 text = text.replace(/`([^`]+)`/g, '$1'); // 移除标题标记 text =
text.replace(/#{1,6}\s+/g, ''); // 移除链接，保留链接文本 text =
text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // 移除图片标记 text =
text.replace(/!\[([^\]]*)\]\([^)]+\)/g, ''); // 移除粗体和斜体标记 text =
text.replace(/(\*\*|__)(.*?)\1/g, '$2'); text = text.replace(/(\*|_)(.*?)\1/g,
'$2'); // 移除列表标记 text = text.replace(/^[\*\-+]\s+/gm, ''); text =
text.replace(/^\d+\.\s+/gm, ''); // 移除HTML标签 text = text.replace(/<[^>]*>/g,
''); // 移除多余空白 text = text.replace(/\s+/g, ' ').trim(); return text; }
