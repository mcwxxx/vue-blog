/*
 * @Author: Kiro AI Assistant
 * @Date: 2025-07-17
 * @Description: 修复版TTS监听函数，用于解决AIChat.vue中的TTS播放问题
 */

/**
 * 修复版TTS监听函数
 * 用于解决AIChat.vue中点击朗读按钮时提示"无文本"的问题
 */

/**
 * 从Markdown文本中提取纯文本
 * @param {string} markdownText Markdown格式的文本
 * @returns {string} 提取后的纯文本
 */
function extractPlainText(markdownText) {
  if (!markdownText) return "";

  console.log("提取纯文本，原始文本长度:", markdownText.length);
  console.log("原始文本前100个字符:", markdownText.substring(0, 100));

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
    console.log("提取后的纯文本前100个字符:", text.substring(0, 100));

    // 如果提取后文本为空，返回原始文本的简单处理版本
    if (!text.trim()) {
      console.warn("提取后文本为空，使用简单处理");
      const simpleText = markdownText.replace(/[#*`_>|]/g, "").trim();
      console.log("简单处理后的文本长度:", simpleText.length);
      return simpleText;
    }

    return text;
  } catch (error) {
    console.error("提取纯文本时出错:", error);
    // 出错时返回原始文本的简单处理版本
    const fallbackText = markdownText.replace(/[#*`_>|]/g, "").trim();
    console.log("错误回退处理后的文本长度:", fallbackText.length);
    return fallbackText;
  }
}

// 全局变量来跟踪当前的监听状态
let isListening = false;
let currentRequestId = null;
let statusCheckInterval = null;
let requestTimeout = null;

/**
 * 清理所有定时器和状态
 */
function cleanupTimersAndState() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
    statusCheckInterval = null;
  }
  
  if (requestTimeout) {
    clearTimeout(requestTimeout);
    requestTimeout = null;
  }
  
  currentRequestId = null;
}

/**
 * 等待音频准备就绪并尝试播放
 */
async function waitForAudioAndPlay(tts, requestId, messageApi, updateState) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 20; // 最多检查20次
    
    const checkAndPlay = async () => {
      // 检查请求是否已被取消
      if (currentRequestId !== requestId) {
        resolve();
        return;
      }
      
      attempts++;
      const status = tts.getPlaybackStatus();
      console.log(`检查播放状态 (${attempts}/${maxAttempts}):`, status);
      
      if (status === 'ready') {
        // 音频准备就绪，尝试播放
        try {
          await tts.play();
          console.log("自动播放成功");
          messageApi.success("语音播放开始");
          resolve();
        } catch (error) {
          console.log("自动播放失败:", error.message);
          // 显示手动播放按钮
          if (currentRequestId === requestId) {
            messageApi.info({
              content: "音频已准备就绪，请点击播放按钮开始播放",
              duration: 0,
              key: "manual-play-btn",
              btn: [{
                text: "播放",
                type: "primary",
                onClick: () => {
                  messageApi.destroy("manual-play-btn");
                  tts.play().then(() => {
                    messageApi.success("语音播放开始");
                  }).catch((err) => {
                    messageApi.error(`播放失败: ${err.message}`);
                    updateState({ currentPlayingMessageId: null });
                  });
                },
              }, {
                text: "取消",
                onClick: () => {
                  messageApi.destroy("manual-play-btn");
                  updateState({ currentPlayingMessageId: null });
                },
              }],
            });
          }
          resolve();
        }
      } else if (status === 'error') {
        console.log("检测到错误状态");
        reject(new Error("TTS服务出现错误"));
      } else if (attempts >= maxAttempts) {
        console.log("等待音频准备超时");
        // 显示手动播放按钮
        if (currentRequestId === requestId) {
          messageApi.info({
            content: "音频已准备就绪，请点击播放按钮开始播放",
            duration: 0,
            key: "manual-play-btn",
            btn: [{
              text: "播放",
              type: "primary",
              onClick: () => {
                messageApi.destroy("manual-play-btn");
                tts.play().then(() => {
                  messageApi.success("语音播放开始");
                }).catch((err) => {
                  messageApi.error(`播放失败: ${err.message}`);
                  updateState({ currentPlayingMessageId: null });
                });
              },
            }, {
              text: "取消",
              onClick: () => {
                messageApi.destroy("manual-play-btn");
                updateState({ currentPlayingMessageId: null });
              },
            }],
          });
        }
        resolve();
      } else {
        // 继续等待
        setTimeout(checkAndPlay, 500);
      }
    };
    
    // 开始检查
    checkAndPlay();
  });
}

/**
 * 修复版TTS监听函数
 * @param {Object} info 消息信息对象
 * @param {Object} tts TTS服务实例
 * @param {Object} state 状态对象，包含currentPlayingMessageId和ttsStatus
 * @param {Function} messageApi 消息API，用于显示提示
 * @param {Function} updateState 更新状态的回调函数
 */
export async function fixedOnListen(info, tts, state, messageApi, updateState) {
  // 生成唯一的请求ID
  const requestId = Date.now() + Math.random();
  
  // 防止重复调用
  if (isListening) {
    console.log("已经在处理TTS请求，忽略重复调用");
    return;
  }

  // 清理之前的状态
  cleanupTimersAndState();
  
  isListening = true;
  currentRequestId = requestId;
  console.group("TTS触发 - 修复版");
  console.log("触发TTS，参数:", info);

  try {
    // 确保info是对象
    if (!info || typeof info !== "object") {
      console.error("无效的消息信息");
      messageApi.error("无效的消息信息");
      return;
    }

  // 获取消息ID和内容 - 增强版
  let messageId;
  let messageContent;

  // 处理各种可能的info格式
  if (typeof info === "string") {
    // 如果info是字符串，将其视为内容，并生成一个唯一ID
    messageContent = info;
    messageId = `msg_${Date.now()}`;
  } else if (info && typeof info === "object") {
    // 如果info是对象
    if (info.id && info.content) {
      // 标准格式：{id: xxx, content: xxx}
      messageId = info.id;
      messageContent = info.content;
    } else if (info.id) {
      // 只有ID的格式：{id: xxx}，可能内容就是对象本身
      messageId = info.id;
      messageContent = JSON.stringify(info);
    } else if (info.content) {
      // 只有内容的格式：{content: xxx}
      messageContent = info.content;
      messageId = `msg_${Date.now()}`;
    } else {
      // 其他情况，尝试将整个对象作为内容
      messageContent = JSON.stringify(info);
      messageId = `msg_${Date.now()}`;
    }
  } else {
    // 其他类型，生成默认值
    messageContent = String(info || "");
    messageId = `msg_${Date.now()}`;
  }

  console.log("处理后的消息ID:", messageId);
  console.log("处理后的消息内容类型:", typeof messageContent);
  console.log("处理后的消息内容长度:", messageContent?.length || 0);

  // 验证处理后的消息内容
  if (!messageContent || messageContent.trim() === "") {
    console.error("处理后的消息内容为空");
    messageApi.error("无法获取有效的文本内容");
    console.groupEnd();
    return;
  }

  // 如果当前正在播放这条消息，则暂停播放
  if (state.currentPlayingMessageId === messageId) {
    console.log("当前消息正在播放，切换播放/暂停状态");
    if (tts) {
      tts.togglePlayPause().then((playState) => {
        console.log("播放状态切换为:", playState);
        if (playState === "paused") {
          // 如果暂停了，保持当前播放消息ID不变
          messageApi.info("语音播放已暂停");
        } else if (playState === "playing") {
          // 如果恢复播放，保持当前播放消息ID不变
          messageApi.info("语音播放已恢复");
        } else {
          // 如果出错或其他状态，清除当前播放消息ID
          updateState({ currentPlayingMessageId: null });
        }
      });
    }
    console.groupEnd();
    return;
  }

  // 停止当前正在播放的其他消息
  if (state.currentPlayingMessageId && tts) {
    console.log("停止当前播放的其他消息:", state.currentPlayingMessageId);
    tts.stop();
  }

  // 提取纯文本（去除Markdown）
  console.log("开始提取纯文本...");
  const plainText = extractPlainText(messageContent);
  console.log("提取的纯文本长度:", plainText?.length || 0);

  if (!plainText) {
    console.error("无法提取有效的文本内容");
    messageApi.error("无法提取有效的文本内容");
    console.groupEnd();
    return;
  }

    // 设置当前播放的消息ID
    updateState({ currentPlayingMessageId: messageId });

    // 显示加载指示器
    messageApi.loading({
      content: "正在转换文本为语音...",
      duration: 0,
      key: "tts-loading",
    });

    // 设置总体超时
    requestTimeout = setTimeout(() => {
      if (currentRequestId === requestId) {
        console.log("TTS请求总体超时");
        messageApi.destroy("tts-loading");
        messageApi.error("语音转换超时");
        updateState({ currentPlayingMessageId: null });
        cleanupTimersAndState();
        isListening = false;
      }
    }, 15000); // 15秒总超时

    // 使用TTS服务播放文本
    console.log("开始TTS转换...");
    const speakSuccess = await tts.speak(plainText);
    
    // 检查请求是否已被取消
    if (currentRequestId !== requestId) {
      console.log("请求已被取消");
      return;
    }
    
    if (!speakSuccess) {
      throw new Error("TTS请求失败");
    }

    console.log("TTS请求已发送，等待音频准备就绪...");
    
    // 清除loading提示
    messageApi.destroy("tts-loading");

    // 等待音频准备就绪并尝试播放
    await waitForAudioAndPlay(tts, requestId, messageApi, updateState);

  } catch (error) {
    console.error("TTS处理过程中出错:", error);
    
    // 只有当前请求才处理错误
    if (currentRequestId === requestId) {
      messageApi.destroy("tts-loading");
      messageApi.error(`语音转换失败: ${error.message || "未知错误"}`);
      updateState({ currentPlayingMessageId: null });
    }
  } finally {
    // 只有当前请求才清理状态
    if (currentRequestId === requestId) {
      cleanupTimersAndState();
      isListening = false;
    }
  }

  console.groupEnd();
}

// 导出辅助函数
export { extractPlainText, cleanupTimersAndState };
