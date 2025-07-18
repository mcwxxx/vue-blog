/**
 * TTS服务重构后的测试文件
 * 用于验证音频次序、重复调用处理等功能
 */

import ttsService from './ttsService.js';

/**
 * 测试TTS服务的基本功能
 */
export async function testTTSBasicFunctionality() {
  console.group('TTS基本功能测试');
  
  try {
    // 初始化TTS服务
    await ttsService.init({
      onStatusChange: (status) => {
        console.log('状态变化:', status);
      },
      onError: (error) => {
        console.error('TTS错误:', error);
      },
      autoReconnect: true
    });
    
    console.log('TTS服务初始化成功');
    
    // 测试文本转语音
    const testText = '这是一个测试文本，用于验证TTS服务的基本功能。';
    console.log('开始测试文本转语音:', testText);
    
    const result = await ttsService.speak(testText);
    console.log('speak调用结果:', result);
    
    // 等待一段时间让音频准备
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查播放状态
    const playbackStatus = ttsService.getPlaybackStatus();
    console.log('播放状态:', playbackStatus);
    
    if (playbackStatus === 'ready') {
      console.log('尝试播放音频');
      await ttsService.play();
      console.log('播放命令已发送');
    }
    
    console.log('基本功能测试完成');
    
  } catch (error) {
    console.error('基本功能测试失败:', error);
  }
  
  console.groupEnd();
}

/**
 * 测试重复调用处理
 */
export async function testDuplicateCallHandling() {
  console.group('重复调用处理测试');
  
  try {
    const testText1 = '第一个测试文本';
    const testText2 = '第二个测试文本';
    
    console.log('快速连续发送两个TTS请求');
    
    // 快速连续调用
    const promise1 = ttsService.speak(testText1);
    const promise2 = ttsService.speak(testText2);
    
    const results = await Promise.allSettled([promise1, promise2]);
    
    console.log('第一个请求结果:', results[0]);
    console.log('第二个请求结果:', results[1]);
    
    // 检查是否正确处理了重复调用
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const rejectedCount = results.filter(r => r.status === 'rejected').length;
    
    console.log(`成功请求数: ${successCount}, 被拒绝请求数: ${rejectedCount}`);
    
    if (successCount === 1 && rejectedCount === 1) {
      console.log('✅ 重复调用处理正确');
    } else {
      console.warn('⚠️ 重复调用处理可能有问题');
    }
    
  } catch (error) {
    console.error('重复调用测试失败:', error);
  }
  
  console.groupEnd();
}

/**
 * 测试资源清理
 */
export async function testResourceCleanup() {
  console.group('资源清理测试');
  
  try {
    const testText = '资源清理测试文本';
    
    // 发送请求
    await ttsService.speak(testText);
    console.log('TTS请求已发送');
    
    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 调用停止和清理
    await ttsService.stopAndCleanup();
    console.log('资源清理完成');
    
    // 检查状态是否正确重置
    const playbackStatus = ttsService.getPlaybackStatus();
    const connectionStatus = ttsService.getConnectionStatus();
    
    console.log('清理后播放状态:', playbackStatus);
    console.log('清理后连接状态:', connectionStatus);
    
    if (playbackStatus === 'idle') {
      console.log('✅ 播放状态正确重置');
    } else {
      console.warn('⚠️ 播放状态未正确重置');
    }
    
  } catch (error) {
    console.error('资源清理测试失败:', error);
  }
  
  console.groupEnd();
}

/**
 * 测试错误处理
 */
export async function testErrorHandling() {
  console.group('错误处理测试');
  
  try {
    // 测试空文本
    console.log('测试空文本处理');
    const result1 = await ttsService.speak('');
    console.log('空文本结果:', result1);
    
    // 测试过长文本
    console.log('测试过长文本处理');
    const longText = 'a'.repeat(6000); // 超过5000字符限制
    const result2 = await ttsService.speak(longText);
    console.log('过长文本结果:', result2);
    
    // 测试无效输入
    console.log('测试无效输入处理');
    const result3 = await ttsService.speak(null);
    console.log('无效输入结果:', result3);
    
    console.log('错误处理测试完成');
    
  } catch (error) {
    console.log('捕获到预期错误:', error.message);
  }
  
  console.groupEnd();
}

/**
 * 运行所有测试
 */
export async function runAllTests() {
  console.log('🚀 开始TTS服务重构测试');
  
  await testTTSBasicFunctionality();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testDuplicateCallHandling();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testResourceCleanup();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testErrorHandling();
  
  console.log('✅ 所有测试完成');
}

// 如果直接运行此文件，执行所有测试
if (typeof window !== 'undefined' && window.location) {
  // 浏览器环境
  window.runTTSTests = runAllTests;
  console.log('TTS测试函数已挂载到 window.runTTSTests，可在控制台调用');
}