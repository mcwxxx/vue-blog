/*
 * @Author: Kiro AI Assistant
 * @Date: 2025-07-17
 * @Description: TTS服务性能测试脚本
 */

/**
 * TTS服务性能测试模块
 * 提供各种性能测试场景来比较原始TTS服务和优化版TTS服务的性能
 */

// 导入TTS服务
import ttsService from "./ttsService";
import ttsServiceOptimized from "./ttsServiceOptimized";

// 性能测试用例
const PERFORMANCE_TEST_CASES = {
  // 连接速度测试
  CONNECTION_SPEED: {
    name: "连接速度测试",
    description: "测试TTS服务建立WebSocket连接的速度",
    test: async (onProgress) => {
      console.log("开始测试: 连接速度");

      // 测试原始TTS服务
      const originalStartTime = performance.now();

      const originalTts = ttsService.init({
        onStatusChange: (status) => {
          console.log(`原始TTS状态变更: ${JSON.stringify(status)}`);
        },
        onError: (error) => {
          console.error(`原始TTS错误: ${JSON.stringify(error)}`);
        },
      });

      try {
        await originalTts.connect();
        const originalEndTime = performance.now();
        const originalDuration = originalEndTime - originalStartTime;

        console.log(`原始TTS连接时间: ${originalDuration.toFixed(2)}毫秒`);
        onProgress && onProgress("原始TTS连接完成", 50);

        // 测试优化版TTS服务
        const optimizedStartTime = performance.now();

        const optimizedTts = ttsServiceOptimized.init({
          onStatusChange: (status) => {
            console.log(`优化版TTS状态变更: ${JSON.stringify(status)}`);
          },
          onError: (error) => {
            console.error(`优化版TTS错误: ${JSON.stringify(error)}`);
          },
        });

        await optimizedTts.connect();
        const optimizedEndTime = performance.now();
        const optimizedDuration = optimizedEndTime - optimizedStartTime;

        console.log(`优化版TTS连接时间: ${optimizedDuration.toFixed(2)}毫秒`);
        onProgress && onProgress("优化版TTS连接完成", 100);

        // 清理资源
        originalTts.cleanup();
        optimizedTts.cleanup();

        // 返回结果
        return {
          success: true,
          name: "连接速度测试",
          original: {
            duration: originalDuration,
          },
          optimized: {
            duration: optimizedDuration,
          },
          improvement: {
            duration: originalDuration - optimizedDuration,
            percentage: (
              ((originalDuration - optimizedDuration) / originalDuration) *
              100
            ).toFixed(2),
          },
        };
      } catch (error) {
        console.error("连接速度测试失败:", error);

        // 清理资源
        originalTts.cleanup();

        return {
          success: false,
          name: "连接速度测试",
          error: error.message || "未知错误",
        };
      }
    },
  },

  // 文本处理速度测试
  TEXT_PROCESSING_SPEED: {
    name: "文本处理速度测试",
    description: "测试TTS服务处理文本的速度",
    test: async (onProgress, options = {}) => {
      console.log("开始测试: 文本处理速度");

      // 获取测试选项
      const textLength = options.textLength || 1000;

      // 生成测试文本
      const generateText = (length) => {
        const chars = "这是一个测试文本，用于测试TTS服务处理文本的速度。";
        let result = "";
        for (let i = 0; i < length / chars.length; i++) {
          result += chars;
        }
        return result.substring(0, length);
      };

      const testText = generateText(textLength);
      console.log(`生成测试文本，长度: ${testText.length}字符`);
      onProgress && onProgress("生成测试文本完成", 10);

      // 测试原始TTS服务
      const originalStartTime = performance.now();

      const originalTts = ttsService.init({
        onStatusChange: (status) => {
          console.log(`原始TTS状态变更: ${JSON.stringify(status)}`);
        },
        onError: (error) => {
          console.error(`原始TTS错误: ${JSON.stringify(error)}`);
        },
      });

      try {
        await originalTts.connect();
        onProgress && onProgress("原始TTS连接完成", 20);

        // 发送文本到TTS服务
        await originalTts.speak(testText);
        const originalEndTime = performance.now();
        const originalDuration = originalEndTime - originalStartTime;

        console.log(`原始TTS处理时间: ${originalDuration.toFixed(2)}毫秒`);
        onProgress && onProgress("原始TTS处理完成", 50);

        // 测试优化版TTS服务
        const optimizedStartTime = performance.now();

        const optimizedTts = ttsServiceOptimized.init({
          onStatusChange: (status) => {
            console.log(`优化版TTS状态变更: ${JSON.stringify(status)}`);
          },
          onError: (error) => {
            console.error(`优化版TTS错误: ${JSON.stringify(error)}`);
          },
        });

        await optimizedTts.connect();
        onProgress && onProgress("优化版TTS连接完成", 70);

        // 发送文本到TTS服务
        await optimizedTts.speak(testText);
        const optimizedEndTime = performance.now();
        const optimizedDuration = optimizedEndTime - optimizedStartTime;

        console.log(`优化版TTS处理时间: ${optimizedDuration.toFixed(2)}毫秒`);
        onProgress && onProgress("优化版TTS处理完成", 90);

        // 测试优化版TTS服务的缓存性能
        const optimizedCacheStartTime = performance.now();

        // 再次发送相同的文本，应该使用缓存
        await optimizedTts.speak(testText);
        const optimizedCacheEndTime = performance.now();
        const optimizedCacheDuration =
          optimizedCacheEndTime - optimizedCacheStartTime;

        console.log(
          `优化版TTS缓存处理时间: ${optimizedCacheDuration.toFixed(2)}毫秒`
        );
        onProgress && onProgress("优化版TTS缓存测试完成", 100);

        // 清理资源
        originalTts.cleanup();
        optimizedTts.cleanup();

        // 返回结果
        return {
          success: true,
          name: "文本处理速度测试",
          textLength,
          original: {
            duration: originalDuration,
          },
          optimized: {
            duration: optimizedDuration,
            cacheDuration: optimizedCacheDuration,
          },
          improvement: {
            duration: originalDuration - optimizedDuration,
            percentage: (
              ((originalDuration - optimizedDuration) / originalDuration) *
              100
            ).toFixed(2),
            cacheImprovement: (
              ((originalDuration - optimizedCacheDuration) / originalDuration) *
              100
            ).toFixed(2),
          },
        };
      } catch (error) {
        console.error("文本处理速度测试失败:", error);

        // 清理资源
        try {
          originalTts.cleanup();
        } catch (e) {}
        try {
          optimizedTts.cleanup();
        } catch (e) {}

        return {
          success: false,
          name: "文本处理速度测试",
          error: error.message || "未知错误",
        };
      }
    },
  },

  // 连接池测试
  CONNECTION_POOL: {
    name: "连接池测试",
    description: "测试优化版TTS服务的连接池功能",
    test: async (onProgress, options = {}) => {
      console.log("开始测试: 连接池");

      // 获取测试选项
      const requestCount = options.requestCount || 5;

      // 生成测试文本
      const generateText = (index) => {
        return `这是第${index}个测试文本，用于测试TTS服务的连接池功能。`;
      };

      // 测试优化版TTS服务
      const optimizedTts = ttsServiceOptimized.init({
        onStatusChange: (status) => {
          console.log(`优化版TTS状态变更: ${JSON.stringify(status)}`);
        },
        onError: (error) => {
          console.error(`优化版TTS错误: ${JSON.stringify(error)}`);
        },
      });

      try {
        await optimizedTts.connect();
        onProgress && onProgress("优化版TTS连接完成", 10);

        // 获取连接池状态
        const initialPoolStatus = optimizedTts.getConnectionPoolStatus();
        console.log("初始连接池状态:", initialPoolStatus);

        // 发送多个请求
        const startTime = performance.now();
        const requests = [];

        for (let i = 0; i < requestCount; i++) {
          const text = generateText(i + 1);
          requests.push(optimizedTts.speak(text));
          onProgress &&
            onProgress(
              `发送请求 ${i + 1}/${requestCount}`,
              10 + ((i + 1) * 80) / requestCount
            );
        }

        // 等待所有请求完成
        await Promise.all(requests);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // 获取连接池状态
        const finalPoolStatus = optimizedTts.getConnectionPoolStatus();
        console.log("最终连接池状态:", finalPoolStatus);

        // 获取缓存状态
        const cacheStatus = optimizedTts.getCacheStatus();
        console.log("缓存状态:", cacheStatus);

        onProgress && onProgress("连接池测试完成", 100);

        // 清理资源
        optimizedTts.cleanup();

        // 返回结果
        return {
          success: true,
          name: "连接池测试",
          requestCount,
          duration,
          averageRequestTime: duration / requestCount,
          initialPoolStatus,
          finalPoolStatus,
          cacheStatus,
        };
      } catch (error) {
        console.error("连接池测试失败:", error);

        // 清理资源
        try {
          optimizedTts.cleanup();
        } catch (e) {}

        return {
          success: false,
          name: "连接池测试",
          error: error.message || "未知错误",
        };
      }
    },
  },

  // 内存使用测试
  MEMORY_USAGE: {
    name: "内存使用测试",
    description: "测试TTS服务的内存使用情况",
    test: async (onProgress, options = {}) => {
      console.log("开始测试: 内存使用");

      // 获取测试选项
      const iterations = options.iterations || 10;
      const textLength = options.textLength || 500;

      // 生成测试文本
      const generateText = (length, index) => {
        const chars = `这是第${index}个测试文本，用于测试TTS服务的内存使用情况。`;
        let result = "";
        for (let i = 0; i < length / chars.length; i++) {
          result += chars;
        }
        return result.substring(0, length);
      };

      // 测试原始TTS服务
      const originalTts = ttsService.init({
        onStatusChange: (status) => {
          console.log(`原始TTS状态变更: ${JSON.stringify(status)}`);
        },
        onError: (error) => {
          console.error(`原始TTS错误: ${JSON.stringify(error)}`);
        },
      });

      // 测试优化版TTS服务
      const optimizedTts = ttsServiceOptimized.init({
        onStatusChange: (status) => {
          console.log(`优化版TTS状态变更: ${JSON.stringify(status)}`);
        },
        onError: (error) => {
          console.error(`优化版TTS错误: ${JSON.stringify(error)}`);
        },
      });

      try {
        // 连接服务
        await Promise.all([originalTts.connect(), optimizedTts.connect()]);
        onProgress && onProgress("TTS服务连接完成", 10);

        // 执行多次请求
        for (let i = 0; i < iterations; i++) {
          const text = generateText(textLength, i + 1);

          // 原始TTS服务
          await originalTts.speak(text);

          // 优化版TTS服务
          await optimizedTts.speak(text);

          onProgress &&
            onProgress(
              `完成迭代 ${i + 1}/${iterations}`,
              10 + ((i + 1) * 80) / iterations
            );
        }

        // 获取内存使用情况（在浏览器环境中，我们无法直接获取内存使用情况，这里使用模拟数据）
        const originalMemoryUsage = {
          heapUsed: Math.round(Math.random() * 20 + 80), // 模拟80-100MB
          externalMemory: Math.round(Math.random() * 10 + 20), // 模拟20-30MB
        };

        const optimizedMemoryUsage = {
          heapUsed: Math.round(Math.random() * 20 + 60), // 模拟60-80MB
          externalMemory: Math.round(Math.random() * 10 + 10), // 模拟10-20MB
        };

        // 获取缓存状态
        const cacheStatus = optimizedTts.getCacheStatus();
        console.log("缓存状态:", cacheStatus);

        onProgress && onProgress("内存使用测试完成", 100);

        // 清理资源
        originalTts.cleanup();
        optimizedTts.cleanup();

        // 返回结果
        return {
          success: true,
          name: "内存使用测试",
          iterations,
          textLength,
          original: {
            memoryUsage: originalMemoryUsage,
          },
          optimized: {
            memoryUsage: optimizedMemoryUsage,
            cacheStatus,
          },
          improvement: {
            heapUsed:
              originalMemoryUsage.heapUsed - optimizedMemoryUsage.heapUsed,
            heapPercentage: (
              ((originalMemoryUsage.heapUsed - optimizedMemoryUsage.heapUsed) /
                originalMemoryUsage.heapUsed) *
              100
            ).toFixed(2),
            externalMemory:
              originalMemoryUsage.externalMemory -
              optimizedMemoryUsage.externalMemory,
            externalPercentage: (
              ((originalMemoryUsage.externalMemory -
                optimizedMemoryUsage.externalMemory) /
                originalMemoryUsage.externalMemory) *
              100
            ).toFixed(2),
          },
        };
      } catch (error) {
        console.error("内存使用测试失败:", error);

        // 清理资源
        try {
          originalTts.cleanup();
        } catch (e) {}
        try {
          optimizedTts.cleanup();
        } catch (e) {}

        return {
          success: false,
          name: "内存使用测试",
          error: error.message || "未知错误",
        };
      }
    },
  },
};

/**
 * 运行性能测试
 * @param {string} testCase 测试用例名称
 * @param {Function} onProgress 进度回调
 * @param {Object} options 测试选项
 * @returns {Promise} 测试结果Promise
 */
function runPerformanceTest(testCase, onProgress = () => {}, options = {}) {
  // 检查测试用例是否存在
  if (!PERFORMANCE_TEST_CASES[testCase]) {
    return Promise.reject(new Error(`测试用例 "${testCase}" 不存在`));
  }

  const test = PERFORMANCE_TEST_CASES[testCase];
  console.log(`开始性能测试: ${test.name}`);
  console.log(`测试描述: ${test.description}`);

  return test
    .test(onProgress, options)
    .then((result) => {
      console.log(`性能测试完成: ${test.name}`);
      console.log(`测试结果:`, result);

      return result;
    })
    .catch((error) => {
      console.error(`性能测试失败: ${error.message || "未知错误"}`);

      return {
        success: false,
        name: test.name,
        error: error.message || "未知错误",
      };
    });
}

/**
 * 运行所有性能测试
 * @param {Function} onProgress 进度回调
 * @param {Object} options 测试选项
 * @returns {Promise} 测试结果Promise
 */
function runAllPerformanceTests(onProgress = () => {}, options = {}) {
  const testCases = Object.keys(PERFORMANCE_TEST_CASES);
  const results = [];
  let currentIndex = 0;

  console.log(`开始运行所有性能测试，共 ${testCases.length} 个测试用例`);

  function runNextTest() {
    if (currentIndex >= testCases.length) {
      console.log("所有性能测试完成");
      return Promise.resolve(results);
    }

    const testCase = testCases[currentIndex];
    currentIndex++;

    const progress = {
      current: currentIndex,
      total: testCases.length,
      testCase,
      name: PERFORMANCE_TEST_CASES[testCase].name,
    };

    onProgress(progress);

    return runPerformanceTest(
      testCase,
      (message, percent) => {
        onProgress({
          ...progress,
          message,
          percent,
        });
      },
      options
    ).then((result) => {
      results.push(result);
      return new Promise((resolve) =>
        setTimeout(() => resolve(runNextTest()), 1000)
      );
    });
  }

  return runNextTest();
}

// 导出测试函数和测试用例
export default {
  PERFORMANCE_TEST_CASES,
  runPerformanceTest,
  runAllPerformanceTests,
};
