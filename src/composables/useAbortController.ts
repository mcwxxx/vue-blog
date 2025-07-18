/**
 * 终止控制逻辑 Composable
 * @description 管理 AbortController 实例，提供终止当前请求的功能
 */

import { reactive, readonly } from 'vue';
import type { AbortState } from '@/types/chat';

/**
 * 终止控制器 Hook
 * @returns 终止控制相关的状态和方法
 */
export function useAbortController() {
  // 终止状态
  const abortState = reactive<AbortState>({
    controller: null,
    isAborting: false,
  });

  /**
   * 创建新的 AbortController
   * @returns 新创建的 AbortController 实例
   */
  const createController = (): AbortController => {
    // 如果存在旧的控制器，先终止它
    if (abortState.controller) {
      abortState.controller.abort();
    }
    
    abortState.controller = new AbortController();
    abortState.isAborting = false;
    
    console.log('[useAbortController] 创建新的 AbortController');
    return abortState.controller;
  };

  /**
   * 终止当前请求
   */
  const abortRequest = (): void => {
    if (abortState.controller && !abortState.isAborting) {
      console.log('[useAbortController] 终止当前请求');
      abortState.controller.abort();
      abortState.isAborting = true;
    } else {
      console.warn('[useAbortController] 没有可终止的请求');
    }
  };

  /**
   * 清理控制器
   */
  const cleanup = (): void => {
    if (abortState.controller) {
      abortState.controller.abort();
      abortState.controller = null;
      abortState.isAborting = false;
      console.log('[useAbortController] 清理 AbortController');
    }
  };

  /**
   * 检查是否正在终止
   * @returns 是否正在终止状态
   */
  const isAborting = (): boolean => {
    return abortState.isAborting;
  };

  /**
   * 检查是否有活跃的控制器
   * @returns 是否有活跃的控制器
   */
  const hasActiveController = (): boolean => {
    return abortState.controller !== null && !abortState.isAborting;
  };

  /**
   * 获取当前控制器的信号
   * @returns AbortSignal 或 undefined
   */
  const getSignal = (): AbortSignal | undefined => {
    return abortState.controller?.signal;
  };

  return {
    // 只读状态
    abortState: readonly(abortState),
    
    // 方法
    createController,
    abortRequest,
    cleanup,
    isAborting,
    hasActiveController,
    getSignal,
  };
}