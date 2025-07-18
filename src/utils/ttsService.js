/*
 * @Author: Kiro AI Assistant
 * @Date: 2025-07-17
 * @Description: TTS (Text-to-Speech) Service for converting text to speech using WebSocket
 */

/**
 * TTS Service Module
 * Provides functionality to convert text to speech using a WebSocket-based TTS service
 */

// Error types for better error handling
const ERROR_TYPES = {
  CONNECTION: "connection_error",
  WEBSOCKET: "websocket_error",
  SERVER: "server_error",
  PLAYBACK: "playback_error",
  INPUT: "input_error",
  TIMEOUT: "timeout_error",
  NETWORK: "network_error",
  UNKNOWN: "unknown_error",
};

// Default TTS options
const DEFAULT_OPTIONS = {
  voice_type: "S_Z4CpYSGv1", // Standard female voice
  speed_ratio: 1.0,
  volume_ratio: 1.0,
  pitch_ratio: 1.0,
};

// Error messages for common errors
const ERROR_MESSAGES = {
  [ERROR_TYPES.CONNECTION]: {
    default: "无法连接到语音服务器，请检查您的网络连接",
    timeout: "连接语音服务器超时，请稍后再试",
    refused: "语音服务器拒绝连接，服务可能暂时不可用",
    unavailable: "语音服务器不可用，请稍后再试",
  },
  [ERROR_TYPES.WEBSOCKET]: {
    default: "WebSocket连接错误",
    closed: "WebSocket连接已关闭",
    abnormal: "WebSocket连接异常关闭",
  },
  [ERROR_TYPES.SERVER]: {
    default: "服务器处理请求时出错",
    invalid_request: "无效的请求格式",
    unsupported_text: "服务器不支持处理该文本",
    rate_limited: "请求频率过高，请稍后再试",
  },
  [ERROR_TYPES.PLAYBACK]: {
    default: "音频播放失败",
    format: "不支持的音频格式",
    decode: "音频解码错误",
  },
  [ERROR_TYPES.INPUT]: {
    default: "无效的输入",
    empty: "文本不能为空",
    too_long: "文本过长，请减少文本长度",
  },
  [ERROR_TYPES.TIMEOUT]: {
    default: "操作超时",
    conversion: "文本转语音超时",
    response: "等待服务器响应超时",
  },
  [ERROR_TYPES.NETWORK]: {
    default: "网络错误",
    offline: "您当前处于离线状态",
    unstable: "网络连接不稳定",
  },
  [ERROR_TYPES.UNKNOWN]: {
    default: "发生未知错误",
  },
};

// WebSocket connection states
const CONNECTION_STATES = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
  RECONNECTING: "reconnecting",
};

// Playback states
const PLAYBACK_STATES = {
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  PLAYING: "playing",
  PAUSED: "paused",
  ERROR: "error",
};

/**
 * Initialize the TTS service
 * @param {Object} config Configuration options
 * @param {Function} config.onStatusChange Callback for status changes
 * @param {Function} config.onError Callback for errors
 * @param {boolean} config.autoReconnect Whether to automatically reconnect on connection loss
 * @param {number} config.reconnectAttempts Maximum number of reconnection attempts
 * @param {number} config.reconnectInterval Interval between reconnection attempts in ms
 * @returns {Object} TTS service API
 */
function init(config = {}) {
  // Internal state
  let ws = null;
  let audioChunks = [];
  let audioBlob = null;
  let audioPlayer = null;
  let connectionStatus = CONNECTION_STATES.DISCONNECTED;
  let playbackStatus = PLAYBACK_STATES.IDLE;
  let reconnectCount = 0;
  let reconnectTimer = null;
  let wsUrl = "";
  let pingInterval = null;

  // Configuration with defaults
  const settings = {
    autoReconnect: true,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    connectionTimeout: 10000, // 10 seconds
    pingInterval: 30000, // 30 seconds
    ...config,
  };

  // Callbacks
  const onStatusChange = settings.onStatusChange || (() => {});
  const onError = settings.onError || console.error;

  /**
   * 处理错误并提供有意义的错误消息
   * @param {string} errorType 错误类型
   * @param {string} errorSubtype 错误子类型
   * @param {Error|string} originalError 原始错误对象或消息
   * @param {boolean} shouldReconnect 是否应该尝试重新连接
   */
  function handleError(
    errorType,
    errorSubtype = "default",
    originalError = null,
    shouldReconnect = false
  ) {
    // 获取错误消息
    const errorMessages =
      ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
    const errorMessage = errorMessages[errorSubtype] || errorMessages.default;

    // 构建详细的错误信息
    let detailedMessage = errorMessage;
    if (originalError) {
      const originalMsg =
        originalError instanceof Error ? originalError.message : originalError;
      detailedMessage += `（${originalMsg}）`;
    }

    // 更新状态
    if (
      errorType === ERROR_TYPES.CONNECTION ||
      errorType === ERROR_TYPES.WEBSOCKET
    ) {
      connectionStatus = CONNECTION_STATES.ERROR;
    } else if (errorType === ERROR_TYPES.PLAYBACK) {
      playbackStatus = PLAYBACK_STATES.ERROR;
    }

    // 记录错误
    console.error(
      `TTS错误 [${errorType}:${errorSubtype}]:`,
      detailedMessage,
      originalError
    );

    // 触发错误回调
    onError({
      type: errorType,
      subtype: errorSubtype,
      message: detailedMessage,
      originalError,
    });

    // 更新状态消息
    updateStatus(detailedMessage);

    // 如果需要，尝试重新连接
    if (
      shouldReconnect &&
      settings.autoReconnect &&
      errorType === ERROR_TYPES.CONNECTION
    ) {
      attemptReconnect();
    }

    return detailedMessage;
  }

  // Create audio player if it doesn't exist
  if (!audioPlayer) {
    audioPlayer = new Audio();

    // Add event listeners to audio player
    audioPlayer.addEventListener("ended", () => {
      playbackStatus = PLAYBACK_STATES.IDLE;
      updateStatus("播放完成");
    });

    audioPlayer.addEventListener("error", (error) => {
      playbackStatus = PLAYBACK_STATES.ERROR;
      onError("音频播放错误: " + (error.message || "未知错误"));
      updateStatus("播放失败");
    });

    audioPlayer.addEventListener("play", () => {
      playbackStatus = PLAYBACK_STATES.PLAYING;
      updateStatus("正在播放");
    });

    audioPlayer.addEventListener("pause", () => {
      if (playbackStatus === PLAYBACK_STATES.PLAYING) {
        playbackStatus = PLAYBACK_STATES.PAUSED;
        updateStatus("播放暂停");
      }
    });

    // Add timeupdate event to track playback progress
    audioPlayer.addEventListener("timeupdate", () => {
      if (playbackStatus === PLAYBACK_STATES.PLAYING) {
        const progress = Math.round(
          (audioPlayer.currentTime / audioPlayer.duration) * 100
        );
        updateStatus(`播放进度: ${progress}%`);
      }
    });
  }

  /**
   * Update the status and trigger the callback
   * @param {string} message Optional status message
   */
  function updateStatus(message = null) {
    const status = {
      connection: connectionStatus,
      playback: playbackStatus,
      message: message,
    };
    onStatusChange(status);
  }

  /**
   * Get WebSocket URL based on current location
   * @returns {string} WebSocket URL
   */
  function getWebSocketUrl() {
    // 使用线上地址
    return "ws://39.96.193.106:3000/api/tts/ws";
  }

  /**
   * Send a ping to keep the connection alive
   */
  function sendPing() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "ping" }));
      } catch (error) {
        console.warn("Failed to send ping:", error);
      }
    }
  }

  /**
   * Start the ping interval to keep the connection alive
   */
  function startPingInterval() {
    stopPingInterval(); // Clear any existing interval
    pingInterval = setInterval(sendPing, settings.pingInterval);
  }

  /**
   * Stop the ping interval
   */
  function stopPingInterval() {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  }

  /**
   * 尝试重新连接到WebSocket服务器
   * @param {boolean} immediate 是否立即尝试重新连接
   */
  function attemptReconnect(immediate = false) {
    // 如果已达到最大重试次数，则停止重试
    if (reconnectCount >= settings.reconnectAttempts) {
      handleError(
        ERROR_TYPES.CONNECTION,
        "default",
        `已达到最大重连次数(${settings.reconnectAttempts}次)`,
        false
      );
      return;
    }

    // 清除现有的重连计时器
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // 设置重连延迟
    const delay = immediate ? 0 : settings.reconnectInterval;

    // 使用指数退避策略计算下一次重连间隔
    const backoffInterval = immediate
      ? 0
      : Math.min(
          settings.reconnectInterval * Math.pow(1.5, reconnectCount),
          30000 // 最大30秒
        );

    reconnectTimer = setTimeout(() => {
      reconnectCount++;
      connectionStatus = CONNECTION_STATES.RECONNECTING;
      updateStatus(
        `正在尝试重新连接(${reconnectCount}/${settings.reconnectAttempts})...`
      );

      connect()
        .then(() => {
          // 连接成功，重置重连计数
          reconnectCount = 0;
          updateStatus("重新连接成功");
        })
        .catch((error) => {
          // 连接失败，继续尝试重连
          if (
            settings.autoReconnect &&
            reconnectCount < settings.reconnectAttempts
          ) {
            // 分析错误类型，决定是否继续重试
            const errorMessage = error.message || "未知错误";

            // 检查是否是网络相关错误
            const isNetworkError =
              errorMessage.includes("network") ||
              errorMessage.includes("网络") ||
              errorMessage.includes("timeout") ||
              errorMessage.includes("超时");

            if (isNetworkError) {
              updateStatus(
                `网络连接问题，${settings.reconnectInterval / 1000}秒后重试...`
              );
            } else {
              updateStatus(
                `连接失败(${errorMessage})，${
                  settings.reconnectInterval / 1000
                }秒后重试...`
              );
            }

            attemptReconnect();
          } else {
            // 已达到最大重试次数或不自动重连
            handleError(
              ERROR_TYPES.CONNECTION,
              "default",
              `重连失败，已尝试${reconnectCount}次`,
              false
            );
          }
        });
    }, delay || backoffInterval);
  }

  /**
   * 连接到TTS WebSocket服务器
   * @param {string} customUrl 可选的自定义WebSocket URL
   * @returns {Promise} 连接成功时解析的Promise
   */
  function connect(customUrl = null) {
    return new Promise((resolve, reject) => {
      // 如果已经连接或正在连接，立即解析
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      ) {
        resolve();
        return;
      }

      // 关闭现有连接（如果有）
      if (ws) {
        try {
          ws.close();
        } catch (e) {
          // 忽略关闭时的错误
        }
      }

      // 停止任何现有的ping间隔
      stopPingInterval();

      connectionStatus = CONNECTION_STATES.CONNECTING;
      updateStatus("正在连接到语音服务器...");

      // 使用提供的URL或获取默认URL
      wsUrl = customUrl || getWebSocketUrl();

      try {
        ws = new WebSocket(wsUrl);

        // 设置连接超时
        const connectionTimeout = setTimeout(() => {
          if (connectionStatus === CONNECTION_STATES.CONNECTING) {
            const timeoutError = new Error("连接超时");
            handleError(ERROR_TYPES.CONNECTION, "timeout", timeoutError, true);
            reject(timeoutError);

            // 清理未连接的socket
            if (ws) {
              ws.close();
            }
          }
        }, settings.connectionTimeout);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          connectionStatus = CONNECTION_STATES.CONNECTED;
          reconnectCount = 0;
          updateStatus("已连接到语音服务器");

          // 启动ping间隔以保持连接活动
          startPingInterval();

          resolve();
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          stopPingInterval();

          // 检查关闭是否干净
          const wasClean = event.wasClean;
          const code = event.code;
          const reason = event.reason || "未知原因";

          if (wasClean) {
            connectionStatus = CONNECTION_STATES.DISCONNECTED;
            updateStatus(`连接已关闭: ${reason} (${code})`);
          } else {
            // 根据关闭代码确定错误子类型
            let errorSubtype = "default";
            if (code === 1001) {
              errorSubtype = "closed";
            } else if (code === 1006) {
              errorSubtype = "abnormal";
            }

            handleError(
              ERROR_TYPES.WEBSOCKET,
              errorSubtype,
              `连接丢失: ${reason} (${code})`,
              settings.autoReconnect
            );
          }
        };

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          stopPingInterval();

          // 分析WebSocket错误
          const errorMessage = error.message || "未知WebSocket错误";

          // 尝试确定错误类型
          let errorType = ERROR_TYPES.WEBSOCKET;
          let errorSubtype = "default";

          if (
            errorMessage.includes("refused") ||
            errorMessage.includes("拒绝")
          ) {
            errorType = ERROR_TYPES.CONNECTION;
            errorSubtype = "refused";
          } else if (
            errorMessage.includes("timeout") ||
            errorMessage.includes("超时")
          ) {
            errorType = ERROR_TYPES.CONNECTION;
            errorSubtype = "timeout";
          } else if (navigator.onLine === false) {
            errorType = ERROR_TYPES.NETWORK;
            errorSubtype = "offline";
          }

          handleError(errorType, errorSubtype, error, settings.autoReconnect);
          reject(error);
        };

        ws.onmessage = handleMessage;
      } catch (error) {
        // 处理连接创建过程中的错误
        let errorType = ERROR_TYPES.CONNECTION;
        let errorSubtype = "default";

        const errorMessage = error.message || "未知连接错误";

        if (errorMessage.includes("Invalid") || errorMessage.includes("无效")) {
          errorSubtype = "invalid_url";
        } else if (navigator.onLine === false) {
          errorType = ERROR_TYPES.NETWORK;
          errorSubtype = "offline";
        }

        handleError(errorType, errorSubtype, error, false);
        reject(error);
      }
    });
  }

  /**
   * 处理传入的WebSocket消息
   * @param {MessageEvent} event WebSocket消息事件
   */
  function handleMessage(event) {
    // 检查是否为文本消息（JSON）
    if (typeof event.data === "string") {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "error") {
          // 处理服务器返回的错误
          let errorSubtype = "default";

          // 尝试从错误消息中识别错误类型
          const errorMsg = data.message || "";
          if (
            errorMsg.includes("rate limit") ||
            errorMsg.includes("频率限制")
          ) {
            errorSubtype = "rate_limited";
          } else if (
            errorMsg.includes("invalid") ||
            errorMsg.includes("无效")
          ) {
            errorSubtype = "invalid_request";
          } else if (
            errorMsg.includes("unsupported") ||
            errorMsg.includes("不支持")
          ) {
            errorSubtype = "unsupported_text";
          }

          handleError(ERROR_TYPES.SERVER, errorSubtype, data.message);
        } else if (data.type === "header") {
          // 接收到新标头时清除之前的音频数据
          audioChunks = [];
          playbackStatus = PLAYBACK_STATES.LOADING;
          updateStatus("处理语音中");
        } else if (data.type === "status") {
          // 处理来自服务器的状态更新
          updateStatus(data.message);
        } else if (data.type === "progress") {
          // 处理进度更新
          updateStatus(`转换文本: ${data.progress}%`);
        } else if (data.type === "audio_info") {
          // 处理音频元数据信息
          updateStatus(`准备音频数据: ${data.format}, ${data.duration}秒`);
        } else if (data.type === "complete") {
          // TTS转换完成，但我们可能仍在接收音频块
          updateStatus("文本转换完成，处理音频数据");
        } else if (data.type === "pong") {
          // 服务器响应了我们的ping
          // 这只是为了保持连接活动，不需要任何操作
        } else if (data.type === "timeout") {
          // 处理超时错误
          handleError(
            ERROR_TYPES.TIMEOUT,
            "conversion",
            data.message || "转换超时"
          );
        }
      } catch (e) {
        // 非JSON或解析错误，记录警告但不中断操作
        console.warn("无法解析WebSocket消息:", e);
      }
    } else {
      // 二进制数据（音频）
      // 将接收到的音频块添加到我们的集合中
      audioChunks.push(event.data);

      try {
        // 从到目前为止接收的所有块创建音频blob
        // MIME类型应与服务器发送的内容匹配（通常为audio/mp3或audio/wav）
        audioBlob = new Blob(audioChunks, { type: "audio/mp3" });

        // 为音频blob创建URL
        const url = URL.createObjectURL(audioBlob);

        // 清理之前的URL（如果存在）以防止内存泄漏
        if (audioPlayer.src) {
          URL.revokeObjectURL(audioPlayer.src);
        }

        // 将音频播放器源设置为新的blob URL
        audioPlayer.src = url;

        // 更新状态以指示音频已准备就绪
        playbackStatus = PLAYBACK_STATES.READY;
        updateStatus("音频准备就绪，可以播放");

        // 如果配置了自动播放，则自动播放
        if (settings.autoPlay) {
          play();
        }
      } catch (error) {
        // 确定错误类型
        let errorSubtype = "default";
        const errorMsg = error.message || "";

        if (errorMsg.includes("format") || errorMsg.includes("格式")) {
          errorSubtype = "format";
        } else if (errorMsg.includes("decode") || errorMsg.includes("解码")) {
          errorSubtype = "decode";
        }

        handleError(ERROR_TYPES.PLAYBACK, errorSubtype, error);
      }
    }
  }

  /**
   * Disconnect from the TTS WebSocket server
   */
  function disconnect() {
    stopPingInterval();

    if (ws) {
      try {
        ws.close(1000, "User initiated disconnect");
      } catch (e) {
        // Ignore errors when closing
      }
      ws = null;
    }

    connectionStatus = CONNECTION_STATES.DISCONNECTED;
    updateStatus("Disconnected from TTS server");
  }

  /**
   * 将文本转换为语音并播放
   * @param {string} text 要转换为语音的文本
   * @param {Object} options TTS选项
   * @returns {Promise} 请求发送时解析的Promise
   */
  function speak(text, options = {}) {
    return new Promise(async (resolve, reject) => {
      // 停止当前播放
      stop();

      // 如果未连接，则连接
      if (connectionStatus !== CONNECTION_STATES.CONNECTED) {
        try {
          await connect();
        } catch (error) {
          // 连接错误已经由connect函数处理
          reject(error);
          return;
        }
      }

      // 验证文本输入
      if (!text || typeof text !== "string") {
        const error = new Error("无效的文本输入：文本不能为空");
        handleError(ERROR_TYPES.INPUT, "empty", error);
        reject(error);
        return;
      }

      // 检查文本是否为空（去除空格后）
      const trimmedText = text.trim();
      if (trimmedText === "") {
        const error = new Error("无效的文本输入：文本不能只包含空格");
        handleError(ERROR_TYPES.INPUT, "empty", error);
        reject(error);
        return;
      }

      // 检查文本长度是否过长（可选，根据服务器限制调整）
      const maxTextLength = 5000; // 假设最大长度为5000个字符
      if (trimmedText.length > maxTextLength) {
        const error = new Error(
          `文本过长：最大允许${maxTextLength}个字符，当前${trimmedText.length}个字符`
        );
        handleError(ERROR_TYPES.INPUT, "too_long", error);
        reject(error);
        return;
      }

      // 准备TTS请求
      const request = {
        type: "tts_request",
        text: trimmedText,
        options: { ...DEFAULT_OPTIONS, ...options },
      };

      try {
        // 清除之前的音频数据
        audioChunks = [];
        audioBlob = null;
        if (audioPlayer.src) {
          URL.revokeObjectURL(audioPlayer.src);
          audioPlayer.src = "";
        }

        playbackStatus = PLAYBACK_STATES.LOADING;
        updateStatus("正在发送文本到语音服务器");

        // 设置请求超时
        const requestTimeout = setTimeout(() => {
          if (playbackStatus === PLAYBACK_STATES.LOADING) {
            handleError(
              ERROR_TYPES.TIMEOUT,
              "response",
              "服务器响应超时，请稍后再试"
            );
          }
        }, settings.connectionTimeout * 2); // 使用比连接超时更长的时间

        // 发送请求
        ws.send(JSON.stringify(request));

        // 请求已发送，清除超时
        clearTimeout(requestTimeout);
        resolve();
      } catch (error) {
        // 确定错误类型
        let errorType = ERROR_TYPES.SERVER;
        let errorSubtype = "default";

        const errorMessage = error.message || "";

        if (
          errorMessage.includes("not connected") ||
          errorMessage.includes("INVALID_STATE_ERR") ||
          errorMessage.includes("未连接")
        ) {
          errorType = ERROR_TYPES.CONNECTION;
          errorSubtype = "default";

          // 如果是连接问题，尝试重新连接
          handleError(errorType, errorSubtype, error, true);
        } else {
          handleError(errorType, errorSubtype, error);
        }

        reject(error);
      }
    });
  }

  /**
   * Play the audio
   * @returns {Promise} Promise that resolves when playback starts or rejects on error
   */
  function play() {
    return new Promise((resolve, reject) => {
      if (
        audioPlayer.src &&
        (playbackStatus === PLAYBACK_STATES.READY ||
          playbackStatus === PLAYBACK_STATES.PAUSED)
      ) {
        audioPlayer
          .play()
          .then(() => {
            playbackStatus = PLAYBACK_STATES.PLAYING;
            updateStatus("正在播放音频");
            resolve();
          })
          .catch((error) => {
            playbackStatus = PLAYBACK_STATES.ERROR;
            const errorMsg = "播放音频失败: " + error.message;
            onError(errorMsg);
            updateStatus("播放失败");
            reject(new Error(errorMsg));
          });
      } else if (!audioPlayer.src) {
        const errorMsg = "没有可播放的音频";
        updateStatus(errorMsg);
        reject(new Error(errorMsg));
      } else {
        // 如果正在加载中，等待加载完成后自动播放
        if (playbackStatus === PLAYBACK_STATES.LOADING) {
          updateStatus("音频正在加载，将在准备就绪后播放");
          resolve();
        } else {
          resolve(); // 其他状态下，不执行任何操作但也不报错
        }
      }
    });
  }

  /**
   * Pause the audio
   * @returns {boolean} True if paused successfully
   */
  function pause() {
    if (playbackStatus === PLAYBACK_STATES.PLAYING) {
      try {
        audioPlayer.pause();
        playbackStatus = PLAYBACK_STATES.PAUSED;
        updateStatus("音频已暂停");
        return true;
      } catch (error) {
        onError("暂停音频失败: " + error.message);
        return false;
      }
    }
    return false;
  }

  /**
   * Toggle between play and pause
   * @returns {Promise} Promise that resolves with the new state
   */
  function togglePlayPause() {
    return new Promise((resolve) => {
      if (playbackStatus === PLAYBACK_STATES.PLAYING) {
        pause();
        resolve("paused");
      } else {
        play()
          .then(() => resolve("playing"))
          .catch(() => resolve("error"));
      }
    });
  }

  /**
   * Stop the audio and reset
   * @returns {boolean} True if stopped successfully
   */
  function stop() {
    if (audioPlayer.src) {
      try {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        playbackStatus = PLAYBACK_STATES.READY;
        updateStatus("音频已停止");
        return true;
      } catch (error) {
        onError("停止音频失败: " + error.message);
        return false;
      }
    }
    return false;
  }

  /**
   * Clean up resources
   */
  function cleanup() {
    stop();
    disconnect();

    if (audioPlayer.src) {
      URL.revokeObjectURL(audioPlayer.src);
      audioPlayer.src = "";
    }
  }

  /**
   * Check if connected to the TTS server
   * @returns {boolean} True if connected
   */
  function isConnected() {
    return connectionStatus === CONNECTION_STATES.CONNECTED;
  }

  /**
   * Get the current connection status
   * @returns {string} Connection status
   */
  function getConnectionStatus() {
    return connectionStatus;
  }

  /**
   * Get the current playback status
   * @returns {string} Playback status
   */
  function getPlaybackStatus() {
    return playbackStatus;
  }

  /**
   * Get current playback progress
   * @returns {Object} Object containing current time, duration and progress percentage
   */
  function getPlaybackProgress() {
    if (!audioPlayer.src) {
      return { currentTime: 0, duration: 0, progress: 0 };
    }

    const currentTime = audioPlayer.currentTime || 0;
    const duration = audioPlayer.duration || 0;
    const progress =
      duration > 0 ? Math.round((currentTime / duration) * 100) : 0;

    return {
      currentTime,
      duration,
      progress,
      formattedTime: formatTime(currentTime),
      formattedDuration: formatTime(duration),
    };
  }

  /**
   * Format time in seconds to MM:SS format
   * @param {number} seconds Time in seconds
   * @returns {string} Formatted time string
   */
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  /**
   * Set playback volume
   * @param {number} volume Volume level (0.0 to 1.0)
   */
  function setVolume(volume) {
    if (audioPlayer) {
      try {
        // Ensure volume is between 0 and 1
        const safeVolume = Math.max(0, Math.min(1, volume));
        audioPlayer.volume = safeVolume;
        updateStatus(`音量已设置为 ${Math.round(safeVolume * 100)}%`);
        return true;
      } catch (error) {
        onError("设置音量失败: " + error.message);
        return false;
      }
    }
    return false;
  }

  /**
   * Seek to a specific position in the audio
   * @param {number} position Position in seconds
   * @returns {boolean} True if seek was successful
   */
  function seekTo(position) {
    if (audioPlayer.src && !isNaN(position)) {
      try {
        // Ensure position is within valid range
        const safePosition = Math.max(
          0,
          Math.min(audioPlayer.duration, position)
        );
        audioPlayer.currentTime = safePosition;
        updateStatus(`已跳转至 ${formatTime(safePosition)}`);
        return true;
      } catch (error) {
        onError("跳转失败: " + error.message);
        return false;
      }
    }
    return false;
  }

  // Return the public API
  return {
    connect,
    disconnect,
    speak,
    play,
    pause,
    stop,
    togglePlayPause,
    getPlaybackProgress,
    setVolume,
    seekTo,
    isConnected,
    getConnectionStatus,
    getPlaybackStatus,
    cleanup,
  };
}

// Export the TTS service
export default {
  init,
  CONNECTION_STATES,
  PLAYBACK_STATES,
};
