/**
 * TTS WebSocket 服务
 * 管理 WebSocket 连接，处理 TTS 请求和响应，音频数据接收和缓存
 */

export interface VoiceOptions {
  voice_type: string; // 声音类型
  speed_ratio: number; // 语速 (0.5-2.0)
  volume_ratio: number; // 音量 (0.5-2.0)
  pitch_ratio: number; // 音调 (0.5-2.0)
}

export type TTSStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "synthesizing"
  | "error";

export interface TTSOptions {
  wsUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

import { getTTSConfig, TTSErrorType, TTSErrorMessages, type TTSConfig } from '@/config/tts';

export class TTSService {
  private ws: WebSocket | null = null;
  private config: TTSConfig;
  private status: TTSStatus = "disconnected";
  private reconnectAttempts = 0;
  private eventListeners: Map<string, Function[]> = new Map();
  private pendingRequests: Map<string, {
    resolve: (blob: Blob) => void;
    reject: (error: Error) => void;
    chunks: Blob[];
    timeout: NodeJS.Timeout;
  }> = new Map();
  private connectionTimeout: NodeJS.Timeout | null = null;
  private connectionMonitorInterval: NodeJS.Timeout | null = null;

  constructor(private options: TTSOptions = {}) {
    this.config = getTTSConfig();
  }

  // 获取配置值的便捷方法
  private get wsUrl(): string {
    return this.options.wsUrl || this.config.wsUrl;
  }

  private get maxReconnectAttempts(): number {
    return this.options.maxRetries || this.config.maxReconnectAttempts;
  }

  private get reconnectDelay(): number {
    return this.config.reconnectInterval;
  }

  private get requestTimeout(): number {
    return this.options.timeout || this.config.requestTimeout;
  }

  /**
   * 初始化服务
   */
  async init(options: TTSOptions = {}): Promise<void> {
    this.options = { ...this.options, ...options };
  }

  /**
   * 连接WebSocket
   */
  async connect(): Promise<boolean> {
    if (this.status === "connected" || this.status === "connecting") {
      return this.status === "connected";
    }

    return new Promise((resolve, reject) => {
      try {
        this.status = "connecting";
        this.emit("statusChange", this.status);

        // 构建WebSocket URL
        const wsUrl = this.wsUrl;
        this.ws = new WebSocket(wsUrl);

        // 连接超时处理
        const timeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            this.handleConnectionError(new Error(TTSErrorMessages[TTSErrorType.TIMEOUT]));
            reject(new Error(TTSErrorMessages[TTSErrorType.TIMEOUT]));
          }
        }, this.config.connectionTimeout);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.status = "connected";
          this.reconnectAttempts = 0;
          this.emit("statusChange", this.status);
          this.emit("connected");
          resolve(true);
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          this.handleConnectionError(new Error("WebSocket连接错误"));
          reject(new Error("WebSocket连接错误"));
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          this.handleConnectionClose(event);
        };

        this.ws.onmessage = this.handleMessage.bind(this);

        // 添加连接状态监控
        this.startConnectionMonitoring();

      } catch (error) {
        this.handleConnectionError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    // 停止连接监控
    this.stopConnectionMonitoring();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = "disconnected";
    this.emit("statusChange", this.status);
    this.emit("disconnected");
    
    // 清理待处理的请求
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error("连接已断开"));
    });
    this.pendingRequests.clear();
  }

  /**
   * 发送TTS请求
   */
  async synthesize(text: string, options: VoiceOptions = {
    voice_type: "S_Z4CpYSGv1",
    speed_ratio: 1.0,
    volume_ratio: 1.0,
    pitch_ratio: 1.0
  }): Promise<Blob> {
    if (this.status !== "connected") {
      throw new Error(TTSErrorMessages[TTSErrorType.SERVICE_UNAVAILABLE]);
    }

    if (!text.trim()) {
      throw new Error("文本内容不能为空");
    }

    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      console.log(`开始TTS请求，ID: ${requestId}，文本长度: ${text.length}`);

      // 设置请求超时
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error("请求超时"));
      }, this.requestTimeout);

      // 存储请求信息
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        chunks: [],
        timeout
      });

      // 发送TTS请求（根据服务器协议格式）
      const request = {
        id: requestId, // 添加请求ID
        text: text,
        options: {
          voice_type: options.voice_type || this.config.synthesis.voice,
          speed_ratio: options.speed_ratio || this.config.synthesis.speed,
          volume_ratio: options.volume_ratio || this.config.synthesis.volume,
          pitch_ratio: options.pitch_ratio || this.config.synthesis.pitch
        }
      };

      try {
        // 检查WebSocket连接状态
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          this.status = "disconnected";
          this.emit("statusChange", this.status);
          reject(new Error("WebSocket连接已断开"));
          return;
        }

        this.status = "synthesizing";
        this.emit("statusChange", this.status);
        this.ws.send(JSON.stringify(request));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        
        // 检查是否是连接问题
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.status = "disconnected";
          this.emit("statusChange", this.status);
          this.handleConnectionError(new Error("WebSocket连接在发送时断开"));
        } else {
          this.status = "connected";
          this.emit("statusChange", this.status);
        }
        reject(error);
      }
    });
  }

  /**
   * 获取连接状态
   */
  getStatus(): TTSStatus {
    return this.status;
  }

  /**
   * 事件监听
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`事件监听器错误 [${event}]:`, error);
        }
      });
    }
  }

  /**
   * 处理WebSocket消息
   */
  private handleMessage(event: MessageEvent): void {
    try {
      if (event.data instanceof Blob) {
        // 音频数据
        this.handleAudioData(event.data);
      } else {
        // JSON消息
        const message = JSON.parse(event.data);
        this.handleJsonMessage(message);
      }
    } catch (error) {
      console.error("处理消息错误:", error);
      this.emit("error", error);
    }
  }

  /**
   * 处理音频数据
   */
  // 改进请求ID生成，包含更多上下文信息
  private generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `tts_${timestamp}_${random}`;
  }

  // 修改音频数据处理逻辑
  private handleAudioData(blob: Blob): void {
    // 改进：使用请求头信息或者时间戳来匹配正确的请求
    const requests = Array.from(this.pendingRequests.entries());
    if (requests.length === 0) {
      console.warn('收到音频数据但没有待处理的请求');
      return;
    }

    // 优先匹配最近的请求，但要确保是正确的请求
    let targetRequest: [string, any] | null = null;

    // 如果只有一个请求，直接使用
    if (requests.length === 1) {
      targetRequest = requests[0];
    } else {
      // 多个请求时，使用最新的正在处理的请求
      targetRequest = requests.find(([id, req]) => req.chunks.length === 0) || requests[requests.length - 1];
    }

    if (targetRequest) {
      const [requestId, request] = targetRequest;
      request.chunks.push(blob);

      console.log(`收到音频数据: ${blob.size} 字节，请求ID: ${requestId}，当前总块数: ${request.chunks.length}`);

      // 设置完成定时器
      if ((request as any).completionTimer) {
        clearTimeout((request as any).completionTimer);
      }

      (request as any).completionTimer = setTimeout(() => {
        if (this.pendingRequests.has(requestId) && request.chunks.length > 0) {
          console.log(`音频数据接收完成，请求ID: ${requestId}`);
          clearTimeout(request.timeout);
          const audioBlob = new Blob(request.chunks, { type: "audio/mp3" });
          request.resolve(audioBlob);
          this.pendingRequests.delete(requestId);

          this.status = "connected";
          this.emit("statusChange", this.status);
          this.emit("synthesisCompleted", requestId);
        }
      }, 1000);
    }
  }

  /**
   * 发送请求时添加更多日志
   */
  async synthesize(text: string, options: VoiceOptions = {
    voice_type: "S_Z4CpYSGv1",
    speed_ratio: 1.0,
    volume_ratio: 1.0,
    pitch_ratio: 1.0
  }): Promise<Blob> {
    if (this.status !== "connected") {
      throw new Error(TTSErrorMessages[TTSErrorType.SERVICE_UNAVAILABLE]);
    }

    if (!text.trim()) {
      throw new Error("文本内容不能为空");
    }

    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      
      // 设置请求超时
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error("请求超时"));
      }, this.requestTimeout);

      // 存储请求信息
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        chunks: [],
        timeout
      });

      // 发送TTS请求（根据服务器协议格式）
      const request = {
        text: text,
        options: {
          voice_type: options.voice_type || this.config.synthesis.voice,
          speed_ratio: options.speed_ratio || this.config.synthesis.speed,
          volume_ratio: options.volume_ratio || this.config.synthesis.volume,
          pitch_ratio: options.pitch_ratio || this.config.synthesis.pitch
        }
      };

      try {
        // 检查WebSocket连接状态
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          this.status = "disconnected";
          this.emit("statusChange", this.status);
          reject(new Error("WebSocket连接已断开"));
          return;
        }

        this.status = "synthesizing";
        this.emit("statusChange", this.status);
        this.ws.send(JSON.stringify(request));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        
        // 检查是否是连接问题
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.status = "disconnected";
          this.emit("statusChange", this.status);
          this.handleConnectionError(new Error("WebSocket连接在发送时断开"));
        } else {
          this.status = "connected";
          this.emit("statusChange", this.status);
        }
        reject(error);
      }
    });
  }

  /**
   * 处理JSON消息
   */
  private handleJsonMessage(message: any): void {
    console.log('收到JSON消息:', message);
    const { id, type, status, error } = message;

    // 处理不同类型的消息
    if (type === "error") {
      // 服务器错误消息
      console.error('服务器错误:', message.message);
      this.emit("error", new Error(message.message || "服务器错误"));
      return;
    }

    if (type === "header") {
      // 开始接收音频数据的信号
      console.log('开始接收音频数据...');
      // 清空当前请求的音频块（如果有的话）
      const requests = Array.from(this.pendingRequests.entries());
      if (requests.length > 0) {
        const [requestId, request] = requests[requests.length - 1];
        request.chunks = []; // 清空之前的数据
      }
      return;
    }

    if (type === "tts_response") {
      const request = this.pendingRequests.get(id);
      if (!request) return;

      if (status === "completed") {
        // 合成完成
        clearTimeout(request.timeout);
        const audioBlob = new Blob(request.chunks, { type: "audio/mp3" });
        request.resolve(audioBlob);
        this.pendingRequests.delete(id);
        
        this.status = "connected";
        this.emit("statusChange", this.status);
        this.emit("synthesisCompleted", id);
      } else if (status === "error") {
        // 合成错误
        clearTimeout(request.timeout);
        request.reject(new Error(error || "TTS合成失败"));
        this.pendingRequests.delete(id);
        
        this.status = "connected";
        this.emit("statusChange", this.status);
        this.emit("synthesisError", id, error);
      }
    }

    // 如果没有明确的完成信号，我们需要在音频数据接收完成后自动完成请求
    // 这是一个fallback机制，适用于服务器只发送音频数据而没有明确完成信号的情况
    if (!type && !id) {
      // 检查是否有待处理的请求且已接收到音频数据
      const requests = Array.from(this.pendingRequests.entries());
      if (requests.length > 0) {
        const [requestId, request] = requests[requests.length - 1];
        if (request.chunks.length > 0) {
          // 延迟一点时间，确保所有音频数据都已接收
          setTimeout(() => {
            if (this.pendingRequests.has(requestId)) {
              clearTimeout(request.timeout);
              const audioBlob = new Blob(request.chunks, { type: "audio/mp3" });
              request.resolve(audioBlob);
              this.pendingRequests.delete(requestId);
              
              this.status = "connected";
              this.emit("statusChange", this.status);
              this.emit("synthesisCompleted", requestId);
            }
          }, 500); // 等待500ms
        }
      }
    }
  }

  /**
   * 处理连接错误
   */
  private handleConnectionError(error: Error): void {
    this.status = "error";
    this.emit("statusChange", this.status);
    this.emit("error", error);
    
    // 尝试重连
    this.attemptReconnect();
  }

  /**
   * 尝试重连
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error(TTSErrorMessages[TTSErrorType.CONNECTION_FAILED]));
      return;
    }

    this.reconnectAttempts++;
    this.emit('reconnecting', this.reconnectAttempts);

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

    try {
      await this.connect();
      this.reconnectAttempts = 0;
    } catch (error) {
      await this.attemptReconnect();
    }
  }

  /**
   * 处理连接关闭
   */
  private handleConnectionClose(event: CloseEvent): void {
    this.status = "disconnected";
    this.emit("statusChange", this.status);
    this.emit("disconnected", event);
    
    // 如果不是主动关闭，尝试重连
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.handleConnectionError(new Error("连接意外关闭"));
    }
  }

  /**
   * 获取默认WebSocket URL
   */
  private getDefaultWsUrl(): string {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/api/tts/ws`;
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 开始连接状态监控
   */
  private startConnectionMonitoring(): void {
    this.stopConnectionMonitoring();
    
    this.connectionMonitorInterval = setInterval(() => {
      if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket连接状态异常:', this.ws.readyState);
        
        // 如果连接已断开但状态还是connected，更新状态
        if (this.status === 'connected' || this.status === 'synthesizing') {
          this.status = 'disconnected';
          this.emit('statusChange', this.status);
          
          // 清理待处理的请求
          this.pendingRequests.forEach(({ reject, timeout }) => {
            clearTimeout(timeout);
            reject(new Error('连接意外断开'));
          });
          this.pendingRequests.clear();
          
          // 尝试重连
          this.handleConnectionError(new Error('连接状态监控检测到连接断开'));
        }
      }
    }, 1000); // 每秒检查一次
  }

  /**
   * 停止连接状态监控
   */
  private stopConnectionMonitoring(): void {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }
  }
}

// 导出单例实例
export const ttsService = new TTSService();