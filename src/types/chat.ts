// 聊天消息类型
export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  avatar?: string;
  loading?: boolean;
  typing?: boolean;
  status?: "sending" | "sent" | "error" | "success" | "loading";
  relatedQuestions?: string[];
  attachments?: FileAttachment[];
}

// 会话项类型
export interface ConversationItem {
  key: string;
  label: string;
  timestamp: number;
  messages: ChatMessage[];
  isActive?: boolean;
}

// 提示词项类型
export interface PromptItem {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
  children?: PromptItem[];
}

// 文件附件类型
export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

// 请求消息类型
export interface RequestMessage {
  role: "user" | "assistant";
  content: string;
}

// 流式响应类型
export interface StreamResponse {
  content: string;
  isComplete?: boolean;
  relatedQuestions?: string[];
}

// API响应类型
export interface ApiResponse {
  choices: Array<{
    delta?: {
      content?: string;
    };
    message?: {
      content: string;
    };
  }>;
  relatedQuestions?: string[];
}

// 聊天状态
export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  currentStreamingMessageId: string | null;
}

// API响应类型（保持向后兼容）
export interface ChatResponse {
  content: string;
  relatedQuestions?: string[];
}

// 终止控制器类型
export interface AbortState {
  controller: AbortController | null;
  isAborting: boolean;
}

// 请求配置类型
export interface RequestConfig {
  apiUrl: string;
  headers: Record<string, string>;
  timeout?: number;
}

// useXAgent 相关类型定义
export interface RequestFnInfo {
  prompt?: string;
  messages?: ChatMessage[];
  [key: string]: any;
}

export interface RequestCallbacks {
  onUpdate?: (content: string) => void;
  onSuccess?: (content: string) => void;
  onError?: (error: Error) => void;
}

export type RequestFn = (
  info: RequestFnInfo,
  callbacks: RequestCallbacks
) => Promise<void>;

// 消息操作类型
export type MessageAction =
  | "copy"
  | "regenerate"
  | "like"
  | "dislike"
  | "edit"
  | "delete";

// 组件事件类型
export interface ChatEvents {
  send: (content: string) => void;
  abort: () => void;
  clear: () => void;
  "message-action": (action: MessageAction, message: ChatMessage) => void;
  "prompt-select": (prompt: PromptItem) => void;
  "stream-update": (data: StreamResponse) => void;
  success: (data: StreamResponse) => void;
  error: (error: { message: string }) => void;
  start: () => void;
  end: () => void;
}
