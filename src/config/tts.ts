/**
 * TTS 配置文件
 * 定义 TTS 服务的相关配置选项
 */

export interface TTSConfig {
  /** WebSocket 服务器地址 */
  wsUrl: string;
  /** 连接超时时间（毫秒） */
  connectionTimeout: number;
  /** 请求超时时间（毫秒） */
  requestTimeout: number;
  /** 重连间隔（毫秒） */
  reconnectInterval: number;
  /** 最大重连次数 */
  maxReconnectAttempts: number;
  /** 音频格式 */
  audioFormat: "wav" | "mp3" | "ogg";
  /** 采样率 */
  sampleRate: number;
  /** 语音合成参数 */
  synthesis: {
    /** 语音速度 (0.5 - 2.0) */
    speed: number;
    /** 音调 (0.5 - 2.0) */
    pitch: number;
    /** 音量 (0.0 - 1.0) */
    volume: number;
    /** 语言代码 */
    language: string;
    /** 声音类型 */
    voice: string;
  };
  /** 缓存配置 */
  cache: {
    /** 是否启用缓存 */
    enabled: boolean;
    /** 缓存大小限制（MB） */
    maxSize: number;
    /** 缓存过期时间（毫秒） */
    expireTime: number;
  };
  /** 文本处理配置 */
  textProcessing: {
    /** 最大文本长度 */
    maxLength: number;
    /** 是否过滤HTML标签 */
    filterHtml: boolean;
    /** 是否过滤Markdown格式 */
    filterMarkdown: boolean;
    /** 文本分割大小 */
    chunkSize: number;
  };
}

/**
 * 默认 TTS 配置
 */
export const defaultTTSConfig: TTSConfig = {
  wsUrl: "ws://39.96.193.106:3000/api/tts/ws",
  connectionTimeout: 10000,
  requestTimeout: 30000,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  audioFormat: "wav",
  sampleRate: 16000,
  synthesis: {
    speed: 1.0,
    pitch: 1.0,
    volume: 0.8,
    language: "zh-CN",
    voice: "default",
  },
  cache: {
    enabled: true,
    maxSize: 50, // 50MB
    expireTime: 24 * 60 * 60 * 1000, // 24小时
  },
  textProcessing: {
    maxLength: 10000,
    filterHtml: true,
    filterMarkdown: true,
    chunkSize: 500,
  },
};

/**
 * 获取 TTS 配置
 * 支持环境变量覆盖默认配置
 */
export function getTTSConfig(): TTSConfig {
  const config = { ...defaultTTSConfig };

  // 从环境变量读取配置
  if (import.meta.env.VITE_TTS_WS_URL) {
    config.wsUrl = import.meta.env.VITE_TTS_WS_URL;
  }

  if (import.meta.env.VITE_TTS_CONNECTION_TIMEOUT) {
    config.connectionTimeout = parseInt(
      import.meta.env.VITE_TTS_CONNECTION_TIMEOUT,
      10
    );
  }

  if (import.meta.env.VITE_TTS_REQUEST_TIMEOUT) {
    config.requestTimeout = parseInt(
      import.meta.env.VITE_TTS_REQUEST_TIMEOUT,
      10
    );
  }

  if (import.meta.env.VITE_TTS_LANGUAGE) {
    config.synthesis.language = import.meta.env.VITE_TTS_LANGUAGE;
  }

  if (import.meta.env.VITE_TTS_VOICE) {
    config.synthesis.voice = import.meta.env.VITE_TTS_VOICE;
  }

  return config;
}

/**
 * TTS 错误类型
 */
export enum TTSErrorType {
  CONNECTION_FAILED = "CONNECTION_FAILED",
  SYNTHESIS_FAILED = "SYNTHESIS_FAILED",
  PLAYBACK_FAILED = "PLAYBACK_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  INVALID_TEXT = "INVALID_TEXT",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  TIMEOUT = "TIMEOUT",
}

/**
 * TTS 错误信息映射
 */
export const TTSErrorMessages: Record<TTSErrorType, string> = {
  [TTSErrorType.CONNECTION_FAILED]: "无法连接到TTS服务",
  [TTSErrorType.SYNTHESIS_FAILED]: "语音合成失败",
  [TTSErrorType.PLAYBACK_FAILED]: "音频播放失败",
  [TTSErrorType.NETWORK_ERROR]: "网络连接错误",
  [TTSErrorType.INVALID_TEXT]: "文本内容无效",
  [TTSErrorType.SERVICE_UNAVAILABLE]: "TTS服务不可用",
  [TTSErrorType.TIMEOUT]: "请求超时",
};
