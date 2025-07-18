/*
 * @Author: Kiro AI Assistant
 * @Date: 2025-07-17
 * @Description: 优化版TTS (Text-to-Speech) Service，提供更高效的WebSocket连接管理和音频数据处理
 */

/**
 * 优化版TTS服务模块
 * 提供更高效的WebSocket连接管理和音频数据处理
 */

// 导入原始TTS服务以扩展其功能
import originalTtsService from "./ttsService";

// 连接池大小
const CONNECTION_POOL_SIZE = 2;

// 音频缓存大小（条目数）
const AUDIO_CACHE_SIZE = 10;

// 音频块大小（字节）
const AUDIO_CHUNK_SIZE = 32 * 1024; // 32KB

// 连接池
let connectionPool = [];

// 音频缓存 - 使用LRU（最近最少使用）缓存策略
const audioCache = {
  // 缓存数据，键为文本的哈希，值为音频blob
  data: new Map(),

  // 访问顺序，用于LRU策略
  order: [],

  // 获取缓存项
  get(key) {
    if (this.data.has(key)) {
      // 更新访问顺序
      this.order = this.order.filter((k) => k !== key);
      this.order.push(key);

      return this.data.get(key);
    }
    return null;
  },

  // 设置缓存项
  set(key, value) {
    // 如果缓存已满，删除最久未使用的项
    if (this.data.size >= AUDIO_CACHE_SIZE && !this.data.has(key)) {
      const oldestKey = this.order.shift();
      this.data.delete(oldestKey);
    }

    // 添加新项
    this.data.set(key, value);

    // 更新访问顺序
    this.order = this.order.filter((k) => k !== key);
    this.order.push(key);
  },

  // 清除缓存
  clear() {
    this.data.clear();
    this.order = [];
  },
};

/**
 * 计算文本的哈希值，用作缓存键
 * @param {string} text 要哈希的文本
 * @returns {string} 哈希值
 */
function hashText(text) {
  let hash = 0;
  if (text.length === 0) return hash.toString();

  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return hash.toString();
}

/**
 * 初始化连接池
 * @param {Object} config TTS服务配置
 */
function initConnectionPool(config) {
  // 清空现有连接池
  connectionPool.forEach((conn) => {
    if (conn.tts) {
      try {
        conn.tts.cleanup();
      } catch (e) {
        console.warn("清理连接池时出错:", e);
      }
    }
  });

  connectionPool = [];

  // 创建新的连接
  for (let i = 0; i < CONNECTION_POOL_SIZE; i++) {
    const tts = originalTtsService.init({
      ...config,
      onStatusChange: (status) => {
        // 更新连接状态
        if (connectionPool[i]) {
          connectionPool[i].status = status.connection;
        }

        // 调用原始状态变更回调
        if (config.onStatusChange) {
          config.onStatusChange(status);
        }
      },
      onError: (error) => {
        // 标记连接为错误状态
        if (connectionPool[i]) {
          connectionPool[i].status = "error";
        }

        // 调用原始错误回调
        if (config.onError) {
          config.onError(error);
        }
      },
    });

    connectionPool.push({
      tts,
      status: "disconnected",
      busy: false,
      lastUsed: Date.now(),
    });
  }
}

/**
 * 获取可用的连接
 * @returns {Object|null} 可用的连接或null
 */
function getAvailableConnection() {
  // 首先查找空闲且已连接的连接
  let conn = connectionPool.find((c) => !c.busy && c.status === "connected");

  // 如果没有找到，查找任何空闲的连接
  if (!conn) {
    conn = connectionPool.find((c) => !c.busy);
  }

  // 如果仍然没有找到，使用最早使用的连接
  if (!conn) {
    conn = connectionPool.reduce((prev, curr) =>
      prev.lastUsed < curr.lastUsed ? prev : curr
    );
  }

  return conn;
}

/**
 * 优化的TTS服务初始化
 * @param {Object} config 配置选项
 * @returns {Object} TTS服务API
 */
function init(config = {}) {
  // 初始化连接池
  initConnectionPool(config);

  // 创建主TTS实例
  const mainTts = originalTtsService.init(config);

  // 增强的speak函数，支持缓存和连接池
  async function enhancedSpeak(text, options = {}) {
    // 检查文本是否为空
    if (!text || typeof text !== "string" || text.trim() === "") {
      return Promise.reject(new Error("无效的文本输入：文本不能为空"));
    }

    // 计算文本哈希
    const textHash = hashText(text);

    // 检查缓存
    const cachedAudio = audioCache.get(textHash);
    if (cachedAudio) {
      console.log("使用缓存的音频数据");

      // 创建新的Blob URL
      const url = URL.createObjectURL(cachedAudio);

      // 清理之前的URL
      if (mainTts.getPlaybackStatus() !== "idle") {
        mainTts.stop();
      }

      // 设置音频源并播放
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
      };

      return new Promise((resolve, reject) => {
        audio.oncanplaythrough = () => {
          audio
            .play()
            .then(() => resolve())
            .catch((err) => reject(err));
        };
        audio.onerror = (err) => reject(err);
      });
    }

    // 获取可用连接
    const conn = getAvailableConnection();

    // 标记连接为忙碌状态
    conn.busy = true;
    conn.lastUsed = Date.now();

    try {
      // 确保连接已建立
      if (conn.status !== "connected") {
        await conn.tts.connect();
      }

      // 创建一个可写流来收集音频数据
      const audioChunks = [];

      // 监听音频数据
      const originalHandleMessage = conn.tts.handleMessage;
      conn.tts.handleMessage = function (event) {
        // 如果是二进制数据（音频），收集它
        if (typeof event.data !== "string") {
          audioChunks.push(event.data);
        }

        // 调用原始处理函数
        originalHandleMessage.call(this, event);
      };

      // 发送文本到TTS服务
      await conn.tts.speak(text, options);

      // 等待音频数据完成
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (conn.tts.getPlaybackStatus() === "ready") {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        // 设置超时
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 10000);
      });

      // 恢复原始处理函数
      conn.tts.handleMessage = originalHandleMessage;

      // 创建音频blob
      if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: "audio/mp3" });

        // 缓存音频数据
        audioCache.set(textHash, audioBlob);

        // 创建URL并播放
        const url = URL.createObjectURL(audioBlob);

        // 清理之前的URL
        if (mainTts.getPlaybackStatus() !== "idle") {
          mainTts.stop();
        }

        // 设置音频源并播放
        const audio = new Audio(url);
        audio.onended = () => {
          URL.revokeObjectURL(url);
        };

        return new Promise((resolve, reject) => {
          audio.oncanplaythrough = () => {
            audio
              .play()
              .then(() => resolve())
              .catch((err) => reject(err));
          };
          audio.onerror = (err) => reject(err);
        });
      }

      // 如果没有收集到音频数据，使用原始speak方法
      return mainTts.speak(text, options);
    } catch (error) {
      console.error("增强speak函数出错:", error);
      throw error;
    } finally {
      // 标记连接为空闲状态
      conn.busy = false;
    }
  }

  /**
   * 优化的连接函数
   * @param {string} customUrl 可选的自定义WebSocket URL
   * @returns {Promise} 连接成功时解析的Promise
   */
  async function enhancedConnect(customUrl = null) {
    // 连接所有池中的连接
    const connectPromises = connectionPool.map((conn) =>
      conn.tts
        .connect(customUrl)
        .then(() => {
          conn.status = "connected";
        })
        .catch((error) => {
          console.warn(`连接池连接失败: ${error.message}`);
          conn.status = "error";
          // 不抛出错误，让其他连接继续尝试
        })
    );

    // 等待至少一个连接成功
    await Promise.allSettled(connectPromises);

    // 检查是否至少有一个连接成功
    const hasConnected = connectionPool.some(
      (conn) => conn.status === "connected"
    );

    if (!hasConnected) {
      throw new Error("所有连接尝试都失败");
    }

    // 连接主TTS实例
    return mainTts.connect(customUrl);
  }

  /**
   * 优化的断开连接函数
   */
  function enhancedDisconnect() {
    // 断开所有池中的连接
    connectionPool.forEach((conn) => {
      try {
        conn.tts.disconnect();
        conn.status = "disconnected";
      } catch (e) {
        console.warn(`断开连接池连接失败: ${e.message}`);
      }
    });

    // 断开主TTS实例
    return mainTts.disconnect();
  }

  /**
   * 优化的清理函数
   */
  function enhancedCleanup() {
    // 清理所有池中的连接
    connectionPool.forEach((conn) => {
      try {
        conn.tts.cleanup();
      } catch (e) {
        console.warn(`清理连接池连接失败: ${e.message}`);
      }
    });

    // 清空连接池
    connectionPool = [];

    // 清空音频缓存
    audioCache.clear();

    // 清理主TTS实例
    return mainTts.cleanup();
  }

  /**
   * 获取连接池状态
   * @returns {Array} 连接池状态数组
   */
  function getConnectionPoolStatus() {
    return connectionPool.map((conn, index) => ({
      index,
      status: conn.status,
      busy: conn.busy,
      lastUsed: new Date(conn.lastUsed).toISOString(),
    }));
  }

  /**
   * 获取缓存状态
   * @returns {Object} 缓存状态
   */
  function getCacheStatus() {
    return {
      size: audioCache.data.size,
      maxSize: AUDIO_CACHE_SIZE,
      keys: audioCache.order,
    };
  }

  /**
   * 清除音频缓存
   */
  function clearCache() {
    audioCache.clear();
  }

  // 返回增强的API
  return {
    ...mainTts,
    speak: enhancedSpeak,
    connect: enhancedConnect,
    disconnect: enhancedDisconnect,
    cleanup: enhancedCleanup,
    getConnectionPoolStatus,
    getCacheStatus,
    clearCache,
  };
}

// 导出优化的TTS服务
export default {
  init,
  CONNECTION_STATES: originalTtsService.CONNECTION_STATES,
  PLAYBACK_STATES: originalTtsService.PLAYBACK_STATES,
};
