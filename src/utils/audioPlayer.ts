/**
 * 音频播放管理工具
 * 管理音频播放实例，控制播放状态，处理播放事件
 */

export interface AudioPlayerEvents {
  play: () => void;
  pause: () => void;
  ended: () => void;
  error: (error: Error) => void;
  timeupdate: (currentTime: number, duration: number) => void;
  loadstart: () => void;
  canplay: () => void;
}

export class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private eventListeners: Map<keyof AudioPlayerEvents, Function[]> = new Map();
  private currentAudioUrl: string | null = null;
  private _isPlaying = false;
  private _duration = 0;
  private _currentTime = 0;

  constructor() {
    this.initializeEventListeners();
  }

  /**
   * 加载音频
   */
  async load(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 清理之前的音频
        this.cleanup();

        // 创建新的音频URL
        this.currentAudioUrl = URL.createObjectURL(audioBlob);
        
        // 创建音频元素
        this.audio = new Audio(this.currentAudioUrl);
        this.setupAudioEvents();

        // 监听加载完成
        const handleCanPlay = () => {
          this.audio!.removeEventListener('canplay', handleCanPlay);
          this.audio!.removeEventListener('error', handleError);
          this._duration = this.audio!.duration || 0;
          this.emit('canplay');
          resolve();
        };

        const handleError = (event: Event) => {
          this.audio!.removeEventListener('canplay', handleCanPlay);
          this.audio!.removeEventListener('error', handleError);
          const error = new Error('音频加载失败');
          this.emit('error', error);
          reject(error);
        };

        this.audio.addEventListener('canplay', handleCanPlay);
        this.audio.addEventListener('error', handleError);
        
        // 开始加载
        this.emit('loadstart');
        this.audio.load();

      } catch (error) {
        reject(new Error(`音频加载失败: ${error}`));
      }
    });
  }

  /**
   * 播放音频
   */
  async play(): Promise<void> {
    if (!this.audio) {
      throw new Error('没有加载的音频');
    }

    try {
      await this.audio.play();
      this._isPlaying = true;
      this.emit('play');
    } catch (error) {
      this._isPlaying = false;
      const playError = new Error(`播放失败: ${error}`);
      this.emit('error', playError);
      throw playError;
    }
  }

  /**
   * 暂停播放
   */
  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this._isPlaying = false;
      this.emit('pause');
    }
  }

  /**
   * 停止播放
   */
  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this._isPlaying = false;
      this._currentTime = 0;
      this.emit('pause');
    }
  }

  /**
   * 设置播放位置
   */
  seek(time: number): void {
    if (this.audio && time >= 0 && time <= this._duration) {
      this.audio.currentTime = time;
      this._currentTime = time;
    }
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * 获取音量
   */
  getVolume(): number {
    return this.audio?.volume || 0;
  }

  /**
   * 设置播放速度
   */
  setPlaybackRate(rate: number): void {
    if (this.audio) {
      this.audio.playbackRate = Math.max(0.25, Math.min(4, rate));
    }
  }

  /**
   * 获取播放速度
   */
  getPlaybackRate(): number {
    return this.audio?.playbackRate || 1;
  }

  /**
   * 检查是否正在播放
   */
  isPlaying(): boolean {
    return this._isPlaying && this.audio && !this.audio.paused;
  }

  /**
   * 检查是否已暂停
   */
  isPaused(): boolean {
    return this.audio ? this.audio.paused : true;
  }

  /**
   * 检查是否已结束
   */
  isEnded(): boolean {
    return this.audio ? this.audio.ended : false;
  }

  /**
   * 获取音频时长
   */
  getDuration(): number {
    return this._duration;
  }

  /**
   * 获取当前播放时间
   */
  getCurrentTime(): number {
    return this._currentTime;
  }

  /**
   * 获取播放进度（0-1）
   */
  getProgress(): number {
    if (this._duration === 0) return 0;
    return this._currentTime / this._duration;
  }

  /**
   * 获取缓冲进度
   */
  getBufferedProgress(): number {
    if (!this.audio || this.audio.buffered.length === 0) return 0;
    
    const buffered = this.audio.buffered;
    const currentTime = this.audio.currentTime;
    
    for (let i = 0; i < buffered.length; i++) {
      if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
        return buffered.end(i) / this._duration;
      }
    }
    
    return 0;
  }

  /**
   * 事件监听
   */
  on<K extends keyof AudioPlayerEvents>(event: K, callback: AudioPlayerEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听
   */
  off<K extends keyof AudioPlayerEvents>(event: K, callback: AudioPlayerEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 便捷的事件监听方法
   */
  onPlay(callback: () => void): void {
    this.on('play', callback);
  }

  onPause(callback: () => void): void {
    this.on('pause', callback);
  }

  onEnded(callback: () => void): void {
    this.on('ended', callback);
  }

  onError(callback: (error: Error) => void): void {
    this.on('error', callback);
  }

  onTimeUpdate(callback: (currentTime: number, duration: number) => void): void {
    this.on('timeupdate', callback);
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeEventListener('play', this.handlePlay);
      this.audio.removeEventListener('pause', this.handlePause);
      this.audio.removeEventListener('ended', this.handleEnded);
      this.audio.removeEventListener('error', this.handleError);
      this.audio.removeEventListener('timeupdate', this.handleTimeUpdate);
      this.audio.removeEventListener('loadstart', this.handleLoadStart);
      this.audio.removeEventListener('canplay', this.handleCanPlay);
      this.audio = null;
    }

    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }

    this._isPlaying = false;
    this._duration = 0;
    this._currentTime = 0;
  }

  /**
   * 销毁播放器
   */
  destroy(): void {
    this.cleanup();
    this.eventListeners.clear();
  }

  /**
   * 初始化事件监听器映射
   */
  private initializeEventListeners(): void {
    const events: (keyof AudioPlayerEvents)[] = [
      'play', 'pause', 'ended', 'error', 'timeupdate', 'loadstart', 'canplay'
    ];
    
    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }

  /**
   * 设置音频事件监听
   */
  private setupAudioEvents(): void {
    if (!this.audio) return;

    this.audio.addEventListener('play', this.handlePlay);
    this.audio.addEventListener('pause', this.handlePause);
    this.audio.addEventListener('ended', this.handleEnded);
    this.audio.addEventListener('error', this.handleError);
    this.audio.addEventListener('timeupdate', this.handleTimeUpdate);
    this.audio.addEventListener('loadstart', this.handleLoadStart);
    this.audio.addEventListener('canplay', this.handleCanPlay);
  }

  /**
   * 音频事件处理器
   */
  private handlePlay = (): void => {
    this._isPlaying = true;
    this.emit('play');
  };

  private handlePause = (): void => {
    this._isPlaying = false;
    this.emit('pause');
  };

  private handleEnded = (): void => {
    this._isPlaying = false;
    this._currentTime = this._duration;
    this.emit('ended');
  };

  private handleError = (event: Event): void => {
    this._isPlaying = false;
    const error = new Error('音频播放错误');
    this.emit('error', error);
  };

  private handleTimeUpdate = (): void => {
    if (this.audio) {
      this._currentTime = this.audio.currentTime;
      this._duration = this.audio.duration || 0;
      this.emit('timeupdate', this._currentTime, this._duration);
    }
  };

  private handleLoadStart = (): void => {
    this.emit('loadstart');
  };

  private handleCanPlay = (): void => {
    if (this.audio) {
      this._duration = this.audio.duration || 0;
    }
    this.emit('canplay');
  };

  /**
   * 触发事件
   */
  private emit<K extends keyof AudioPlayerEvents>(event: K, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          (callback as any)(...args);
        } catch (error) {
          console.error(`音频播放器事件监听器错误 [${event}]:`, error);
        }
      });
    }
  }
}

// 导出单例实例
export const audioPlayer = new AudioPlayer();