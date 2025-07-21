/**
 * TTS 朗读功能组合函数
 * 整合 TTS 服务、文本提取和音频播放功能
 */

import { ref, reactive, computed, onUnmounted, toRefs } from 'vue'
import { TTSService } from '@/services/ttsService'
import { textExtractor } from '@/utils/textExtractor'
import { audioPlayer } from '@/utils/audioPlayer'
import type { TTSConfig, VoiceOptions } from '@/config/tts'
import { getTTSConfig } from '@/config/tts'

export interface TTSState {
  // 连接状态
  isConnected: boolean
  isConnecting: boolean
  
  // 播放状态
  isPlaying: boolean
  isPaused: boolean
  isSynthesizing: boolean
  
  // 当前播放信息
  currentMessageId: string | null
  currentText: string | null
  
  // 进度信息
  progress: number
  duration: number
  currentTime: number
  
  // 错误信息
  error: string | null
  lastError: Error | null
}

export interface TTSControls {
  // 连接控制
  connect: () => Promise<void>
  disconnect: () => void
  
  // 播放控制
  speak: (text: string, messageId?: string) => Promise<void>
  pause: () => void
  resume: () => Promise<void>
  stop: () => void
  
  // 配置控制
  setVoiceOptions: (options: Partial<VoiceOptions>) => void
  getVoiceOptions: () => VoiceOptions
  
  // 状态查询
  isCurrentMessage: (messageId: string) => boolean
  canSpeak: (text: string) => boolean
  
  // 错误处理
  clearError: () => void
}

export function useTTS() {
  // TTS 服务实例
  const ttsService = new TTSService()
  
  // 响应式状态
  const state = reactive<TTSState>({
    isConnected: false,
    isConnecting: false,
    isPlaying: false,
    isPaused: false,
    isSynthesizing: false,
    currentMessageId: null,
    currentText: null,
    progress: 0,
    duration: 0,
    currentTime: 0,
    error: null,
    lastError: null
  })
  
  // 语音配置
  const voiceOptions = ref<VoiceOptions>({
    voice_type: 'S_Z4CpYSGv1',
    speed_ratio: 1.0,
    volume_ratio: 1.0,
    pitch_ratio: 1.0
  })
  
  // TTS 配置
  const ttsConfig = ref<TTSConfig>(getTTSConfig())
  
  // 计算属性
  const canConnect = computed(() => !state.isConnected && !state.isConnecting)
  const canSpeak = computed(() => state.isConnected && !state.isSynthesizing)
  const canControl = computed(() => state.isConnected && (state.isPlaying || state.isPaused))
  
  // 连接到 TTS 服务
  const connect = async (): Promise<void> => {
    if (state.isConnected || state.isConnecting) {
      return
    }
    
    try {
      state.isConnecting = true
      state.error = null
      
      await ttsService.connect()
      
      state.isConnected = true
      state.isConnecting = false
      
      console.log('TTS 服务连接成功')
    } catch (error) {
      state.isConnecting = false
      state.isConnected = false
      
      const errorMessage = error instanceof Error ? error.message : '连接 TTS 服务失败'
      state.error = errorMessage
      state.lastError = error instanceof Error ? error : new Error(errorMessage)
      
      console.error('TTS 连接失败:', error)
      throw error
    }
  }
  
  // 断开 TTS 服务连接
  const disconnect = (): void => {
    try {
      // 停止当前播放
      stop()
      
      // 断开服务连接
      ttsService.disconnect()
      
      // 重置状态
      state.isConnected = false
      state.isConnecting = false
      state.error = null
      
      console.log('TTS 服务已断开连接')
    } catch (error) {
      console.error('断开 TTS 连接时出错:', error)
    }
  }
  
  // 朗读文本
  // 添加音频缓存
  const audioCache = new Map<string, Blob>();
  const maxCacheSize = 10; // 最大缓存数量
  
  // 生成缓存键
  function generateCacheKey(text: string, options: VoiceOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${text.substring(0, 100)}_${btoa(optionsStr).substring(0, 20)}`;
  }
  
  // 修改speak函数，添加缓存逻辑
  const speak = async (text: string, messageId?: string): Promise<void> => {
    try {
      // 验证输入
      if (!text || typeof text !== 'string') {
        throw new Error('无效的文本内容');
      }
  
      // 确保已连接
      if (!state.isConnected) {
        await connect();
      }
  
      // 停止当前播放
      if (state.isPlaying || state.isPaused) {
        stop();
      }
  
      // 提取纯文本
      const plainText = textExtractor.extractPlainText(text);
      if (!textExtractor.validateText(plainText)) {
        throw new Error('没有可朗读的有效文本内容');
      }
  
      // 过滤敏感信息
      const sanitizedText = textExtractor.sanitize(plainText);
  
      // 检查缓存
      const cacheKey = generateCacheKey(sanitizedText, voiceOptions.value);
      let audioBlob = audioCache.get(cacheKey);
  
      if (!audioBlob) {
        // 缓存未命中，请求TTS服务
        state.isSynthesizing = true;
        state.currentMessageId = messageId || null;
        state.currentText = sanitizedText;
        state.error = null;
  
        console.log('开始 TTS 合成:', { messageId, textLength: sanitizedText.length, cached: false });
  
        audioBlob = await ttsService.synthesize(sanitizedText, voiceOptions.value);
  
        // 添加到缓存
        if (audioCache.size >= maxCacheSize) {
          // 删除最旧的缓存项
          const firstKey = audioCache.keys().next().value;
          audioCache.delete(firstKey);
        }
        audioCache.set(cacheKey, audioBlob);
      } else {
        console.log('使用缓存的音频:', { messageId, textLength: sanitizedText.length, cached: true });
        state.currentMessageId = messageId || null;
        state.currentText = sanitizedText;
      }
  
      // 检查是否被中断
      if (state.currentMessageId !== messageId) {
        console.log('TTS 播放被中断');
        return;
      }
  
      state.isSynthesizing = false;
  
      // 加载并播放音频
      await audioPlayer.load(audioBlob);
      await audioPlayer.play();
  
      state.isPlaying = true;
      state.isPaused = false;
  
      console.log('TTS 播放开始');
  
    } catch (error) {
      state.isSynthesizing = false;
      state.isPlaying = false;
      state.isPaused = false;
  
      const errorMessage = error instanceof Error ? error.message : 'TTS 朗读失败';
      state.error = errorMessage;
      state.lastError = error instanceof Error ? error : new Error(errorMessage);
  
      console.error('TTS 朗读失败:', error);
      throw error;
    }
  };
  
  // 暂停播放
  const pause = (): void => {
    if (!state.isPlaying) {
      return
    }
    
    try {
      audioPlayer.pause()
      state.isPlaying = false
      state.isPaused = true
      
      console.log('TTS 播放已暂停')
    } catch (error) {
      console.error('暂停 TTS 播放失败:', error)
    }
  }
  
  // 恢复播放
  const resume = async (): Promise<void> => {
    if (!state.isPaused) {
      return
    }
    
    try {
      await audioPlayer.play()
      state.isPlaying = true
      state.isPaused = false
      
      console.log('TTS 播放已恢复')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '恢复播放失败'
      state.error = errorMessage
      state.lastError = error instanceof Error ? error : new Error(errorMessage)
      
      console.error('恢复 TTS 播放失败:', error)
      throw error
    }
  }
  
  // 停止播放
  const stop = (): void => {
    try {
      audioPlayer.stop()
      
      state.isPlaying = false
      state.isPaused = false
      state.currentMessageId = null
      state.currentText = null
      state.progress = 0
      state.currentTime = 0
      state.duration = 0
      
      console.log('TTS 播放已停止')
    } catch (error) {
      console.error('停止 TTS 播放失败:', error)
    }
  }
  
  // 设置语音选项
  const setVoiceOptions = (options: Partial<VoiceOptions>): void => {
    voiceOptions.value = { ...voiceOptions.value, ...options }
    console.log('语音选项已更新:', voiceOptions.value)
  }
  
  // 获取语音选项
  const getVoiceOptions = (): VoiceOptions => {
    return { ...voiceOptions.value }
  }
  
  // 检查是否为当前播放的消息
  const isCurrentMessage = (messageId: string): boolean => {
    return state.currentMessageId === messageId
  }
  
  // 检查是否可以朗读文本
  const canSpeakText = (text: string): boolean => {
    if (!text || typeof text !== 'string') {
      return false
    }
    
    const plainText = textExtractor.extractPlainText(text)
    return textExtractor.validateText(plainText)
  }
  
  // 清除错误
  const clearError = (): void => {
    state.error = null
    state.lastError = null
  }
  
  // 设置音频播放器事件监听
  const setupAudioEvents = (): void => {
    // 播放结束
    audioPlayer.onEnded(() => {
      state.isPlaying = false
      state.isPaused = false
      state.currentMessageId = null
      state.currentText = null
      state.progress = 0
      state.currentTime = 0
      console.log('TTS 播放结束')
    })
    
    // 播放错误
    audioPlayer.onError((error) => {
      state.isPlaying = false
      state.isPaused = false
      state.error = error.message
      state.lastError = error
      console.error('TTS 播放错误:', error)
    })
    
    // 时间更新
    audioPlayer.onTimeUpdate((currentTime, duration) => {
      state.currentTime = currentTime
      state.duration = duration
      state.progress = duration > 0 ? currentTime / duration : 0
    })
  }
  
  // 设置 TTS 服务事件监听
  const setupTTSEvents = (): void => {
    // 连接状态变化
    ttsService.on('statusChange', (status: string) => {
      state.isConnected = status === 'connected'
      if (status === 'disconnected') {
        state.isConnecting = false
        stop()
      }
    })
    
    // 连接成功
    ttsService.on('connected', () => {
      state.isConnected = true
      state.isConnecting = false
    })
    
    // 连接断开
    ttsService.on('disconnected', () => {
      state.isConnected = false
      state.isConnecting = false
      stop()
    })
    
    // 服务错误
    ttsService.on('error', (error: Error) => {
      state.error = error.message
      state.lastError = error
      state.isSynthesizing = false
      state.isConnecting = false
      console.error('TTS 服务错误:', error)
    })
  }
  
  // 初始化
  const initialize = (): void => {
    setupAudioEvents()
    setupTTSEvents()
  }
  
  // 清理资源
  const cleanup = (): void => {
    try {
      stop()
      disconnect()
      audioPlayer.cleanup()
    } catch (error) {
      console.error('清理 TTS 资源时出错:', error)
    }
  }
  
  // 组件卸载时清理
  onUnmounted(() => {
    cleanup()
  })
  
  // 初始化
  initialize()
  
  // 返回状态和控制方法
  return {
    // 响应式状态
    ...toRefs(state),
    voiceOptions,
    ttsConfig,
    
    // 计算属性
    canConnect,
    canSpeak,
    canControl,
    
    // 控制方法
    connect,
    disconnect,
    speak,
    pause,
    resume,
    stop,
    setVoiceOptions,
    getVoiceOptions,
    isCurrentMessage,
    canSpeakText,
    clearError,
    cleanup
  }
}

// 导出类型
export type { TTSState, TTSControls }