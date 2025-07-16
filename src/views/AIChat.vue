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
import { ref, watch, onMounted, computed, h, type ComputedRef } from "vue";

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
    role: i.message.role,
    content: i.message.content,
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
  const requestData = {
    input: {
      prompt: val,
    },
    parameters: {
      incremental_output: true,
    },
    debug: {},
  };

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

  try {
    console.log("Sending request with data:", {
      stream: true,
      message: { content: val, role: "user" },
      ...requestData,
    });

    console.log("Before agent request - transformMessage should be called");
    const response = await agent.value.request(
      {
        stream: true,
        message: {
          content: val,
          role: "user",
          output: {
            text: JSON.stringify({
              content: val,
              role: "user",
            }),
          },
        },
        headers: {
          "Content-Type": "application/json",
          "X-DashScope-SSE": "enable",
        },
        ...requestData,
      },
      {
        onUpdate: (response: BubbleDataType) => {
          // 解析服务器返回的JSON字符串
          let parsedContent = response.content || "";
          let parsedAssociation = response.association || [];

          try {
            // 处理非流式响应
            if (response.output && response.output.text) {
              const textStr = response.output.text;
              try {
                // 尝试解析text字段
                const textObj = JSON.parse(textStr);
                if (textObj && typeof textObj === "object") {
                  parsedContent = textObj.content || textObj.text;
                  if (!parsedContent) {
                    parsedContent =
                      typeof textObj === "string"
                        ? textObj
                        : JSON.stringify(textObj, null, 2);
                  }
                  if (textObj.association) {
                    parsedAssociation = parseAssociationQuestions(
                      typeof textObj.association === "string"
                        ? textObj.association
                        : JSON.stringify(textObj.association)
                    );
                  }
                } else {
                  parsedContent = textStr;
                }
              } catch (e) {
                console.log("解析text内容失败，直接使用:", textStr);
                parsedContent = textStr;
              }
            } else if (response.content) {
              parsedContent = response.content;
            }
          } catch (e) {
            console.error("解析消息失败:", e);
            parsedContent = "解析消息失败，请查看控制台日志";
          }

          setMessages((prev) => {
            // 更新现有的loading消息而不是创建新的
            const updatedMessages = prev.map((msg) => {
              if (
                msg.message.role === "assistant" &&
                msg.status === "loading"
              ) {
                return {
                  ...msg,
                  message: {
                    ...msg.message,
                    content: parsedContent,
                    association: parsedAssociation,
                  },
                };
              }
              return msg;
            });
            return updatedMessages;
          });
        },
        onSuccess: (response: BubbleDataType) => {
          // 解析服务器返回的JSON字符串
          let parsedContent = response.content || "";
          let parsedAssociation = response.association || [];

          try {
            if (response.output && response.output.text) {
              const textStr = response.output.text;
              try {
                const textObj = JSON.parse(textStr);
                if (textObj && typeof textObj === "object") {
                  parsedContent = textObj.content || textObj.text;
                  if (!parsedContent) {
                    parsedContent =
                      typeof textObj === "string"
                        ? textObj
                        : JSON.stringify(textObj, null, 2);
                  }
                  if (textObj.association) {
                    parsedAssociation = parseAssociationQuestions(
                      typeof textObj.association === "string"
                        ? textObj.association
                        : JSON.stringify(textObj.association)
                    );
                  }
                } else {
                  parsedContent = textStr;
                }
              } catch (e) {
                console.log("解析text内容失败，直接使用:", textStr);
                parsedContent = textStr;
              }
            } else if (typeof response.content === "string") {
              const parsed = JSON.parse(response.content);
              if (parsed.content) parsedContent = parsed.content;
              if (parsed.association) parsedAssociation = parsed.association;
            }
          } catch (e) {
            console.log("解析消息内容失败，使用原始内容:", e);
          }

          // 更新消息为成功状态
          setMessages((prev) => {
            // 过滤掉所有assistant的loading消息
            const filteredPrev = prev.filter(
              (msg) =>
                !(msg.message.role === "assistant" && msg.status === "loading")
            );

            // 添加成功状态的消息
            return [
              ...filteredPrev,
              {
                id: `msg_${Date.now()}`,
                message: {
                  content: parsedContent,
                  role: "assistant",
                  status: "success",
                  association: parsedAssociation,
                },
                status: "success",
              },
            ];
          });
        },
        onError: (error: Error) => {
          // 更新消息状态为错误
          setMessages((prev) => {
            // 过滤掉所有assistant的loading消息
            const filteredPrev = prev.filter(
              (msg) =>
                !(msg.message.role === "assistant" && msg.status === "loading")
            );

            // 添加错误状态的消息
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
        },
      }
    );
  } catch (error: any) {
    // 更新消息状态为错误
    setMessages((prev) => {
      // 过滤掉所有assistant的loading消息
      const filteredPrev = prev.filter(
        (msg) => !(msg.message.role === "assistant" && msg.status === "loading")
      );

      // 添加错误状态的消息
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

const roles: (typeof Bubble.List)["roles"] = {
  assistant: {
    placement: "start",
    footer: h("div", { style: { display: "flex" } }, [
      h(Button, {
        type: "text",
        size: "small",
        icon: h(ReloadOutlined),
        onClick: () => {},
      }),
      h(Button, {
        type: "text",
        size: "small",
        icon: h(CopyOutlined),
        onClick: () => {},
      }),
      h(Button, {
        type: "text",
        size: "small",
        icon: h(LikeOutlined),
        onClick: () => {},
      }),
      h(Button, {
        type: "text",
        size: "small",
        icon: h(DislikeOutlined),
        onClick: () => {},
      }),
    ]),
    loadingRender: () =>
      h(Space, null, [h(Spin, { size: "small" }), "正在思考中"]),
    contentRender: (content: string) => {
      return h("div", {
        innerHTML: marked(content),
        style: {
          "& > *": {
            margin: "0.5em 0",
          },
        },
      });
    },
  },
  user: { placement: "end" },
};
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
      <div :style="styles.chatList">
        <div v-if="messages?.length">
          <Bubble.List
            :style="{ height: '100%', paddingInline: '16px' }"
            :items="bubbleItems"
            :roles="roles"
          />

          <!-- 在每条AI消息后显示关联问题 -->
          <template v-for="(msg, index) in messages">
            <div
              v-if="
                msg.message.role === 'assistant' &&
                msg.message.association?.length
              "
              :key="`assoc-${index}`"
            >
              <Prompts
                vertical
                :title="() => '您可能还想问：'"
                :items="msg.message.association"
                :style="{
                  'margin-inline': '16px',
                  'margin-top': '16px',
                }"
                :styles="{
                  title: { fontSize: 14, color: '#333', fontWeight: 'bold' },
                }"
                @item-click="
                  (info) =>
                    handleUserSubmit(String(info?.data?.description || ''))
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
            :title="() => '您可能想了解：'"
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
