/*
 * @Author: Kiro AI Assistant
 * @Date: 2025-07-17
 * @Description: TTS服务错误处理测试脚本
 */

/**
 * TTS服务错误处理测试模块
 * 提供各种错误场景来验证TTS服务的错误处理功能
 */

// 导入TTS服务
import ttsService from "./ttsService";

// 错误测试用例
const ERROR_TEST_CASES = {
  // 连接错误测试
  CONNECTION_ERROR: {
    name: "连接错误测试",
    description: "测试TTS服务在无法连接到服务器时的错误处理",
    test: (onError) => {
      console.log("开始测试: 连接错误");

      // 初始化TTS服务，但使用无效的WebSocket URL
      const tts = ttsService.init({
        onStatusChange: (status) => {
          console.log(`TTS状态变更: ${JSON.stringify(status)}`);
        },
        onError: (error) => {
          console.error(`TTS错误: ${JSON.stringify(error)}`);
          onError(error);
        },
      });

      // 尝试连接到无效的URL
      return tts
        .connect("ws://invalid-url-that-does-not-exist.example")
        .catch((error) => {
          console.log("预期的连接错误:", error);

          // 清理资源
          tts.cleanup();

          return {
            success: true,
            errorType: "CONNECTION_ERROR",
            message: error.message || "连接错误",
          };
        });
    },
  },

  // 空文本输入测试
  EMPTY_TEXT_INPUT: {
    name: "空文本输入测试",
    description: "测试TTS服务在接收到空文本输入时的错误处理",
    test: (onError) => {
      console.log("开始测试: 空文本输入");

      // 初始化TTS服务
      const tts = ttsService.init({
        onStatusChange: (status) => {
          console.log(`TTS状态变更: ${JSON.stringify(status)}`);
        },
        onError: (error) => {
          console.error(`TTS错误: ${JSON.stringify(error)}`);
          onError(error);
        },
      });

      // 尝试连接
      return tts
        .connect()
        .then(() => {
          console.log("TTS服务连接成功，尝试发送空文本");

          // 尝试发送空文本
          return tts.speak("").catch((error) => {
            console.log("预期的空文本错误:", error);

            // 清理资源
            tts.cleanup();

            return {
              success: true,
              errorType: "EMPTY_TEXT_INPUT",
              message: error.message || "空文本输入错误",
            };
          });
        })
        .catch((error) => {
          console.error("连接失败:", error);

          // 清理资源
          tts.cleanup();

          return {
            success: false,
            errorType: "CONNECTION_ERROR",
            message: error.message || "连接错误",
          };
        });
    },
  },

  // 空白文本输入测试
  WHITESPACE_TEXT_INPUT: {
    name: "空白文本输入测试",
    description: "测试TTS服务在接收到仅包含空白字符的文本输入时的错误处理",
    test: (onError) => {
      console.log("开始测试: 空白文本输入");

      // 初始化TTS服务
      const tts = ttsService.init({
        onStatusChange: (status) => {
          console.log(`TTS状态变更: ${JSON.stringify(status)}`);
        },
        onError: (error) => {
          console.error(`TTS错误: ${JSON.stringify(error)}`);
          onError(error);
        },
      });

      // 尝试连接
      return tts
        .connect()
        .then(() => {
          console.log("TTS服务连接成功，尝试发送空白文本");

          // 尝试发送仅包含空白字符的文本
          return tts.speak("   \n   \t   ").catch((error) => {
            console.log("预期的空白文本错误:", error);

            // 清理资源
            tts.cleanup();

            return {
              success: true,
              errorType: "WHITESPACE_TEXT_INPUT",
              message: error.message || "空白文本输入错误",
            };
          });
        })
        .catch((error) => {
          console.error("连接失败:", error);

          // 清理资源
          tts.cleanup();

          return {
            success: false,
            errorType: "CONNECTION_ERROR",
            message: error.message || "连接错误",
          };
        });
    },
  },

  // 过长文本输入测试
  TOO_LONG_TEXT_INPUT: {
    name: "过长文本输入测试",
    description: "测试TTS服务在接收到超过最大长度的文本输入时的错误处理",
    test: (onError) => {
      console.log("开始测试: 过长文本输入");

      // 生成一个非常长的文本（超过5000个字符）
      const generateLongText = (length) => {
        const chars = "这是一个测试文本，用于测试TTS服务的错误处理功能。";
        let result = "";
        for (let i = 0; i < length / chars.length; i++) {
          result += chars;
        }
        return result;
      };

      const longText = generateLongText(6000); // 生成6000个字符的文本

      // 初始化TTS服务
      const tts = ttsService.init({
        onStatusChange: (status) => {
          console.log(`TTS状态变更: ${JSON.stringify(status)}`);
        },
        onError: (error) => {
          console.error(`TTS错误: ${JSON.stringify(error)}`);
          onError(error);
        },
      });

      // 尝试连接
      return tts
        .connect()
        .then(() => {
          console.log(
            `TTS服务连接成功，尝试发送过长文本（${longText.length}字符）`
          );

          // 尝试发送过长文本
          return tts.speak(longText).catch((error) => {
            console.log("预期的过长文本错误:", error);

            // 清理资源
            tts.cleanup();

            return {
              success: true,
              errorType: "TOO_LONG_TEXT_INPUT",
              message: error.message || "过长文本输入错误",
            };
          });
        })
        .catch((error) => {
          console.error("连接失败:", error);

          // 清理资源
          tts.cleanup();

          return {
            success: false,
            errorType: "CONNECTION_ERROR",
            message: error.message || "连接错误",
          };
        });
    },
  },

  // WebSocket关闭测试
  WEBSOCKET_CLOSE: {
    name: "WebSocket关闭测试",
    description: "测试TTS服务在WebSocket连接意外关闭时的错误处理",
    test: (onError) => {
      console.log("开始测试: WebSocket关闭");

      // 初始化TTS服务
      const tts = ttsService.init({
        onStatusChange: (status) => {
          console.log(`TTS状态变更: ${JSON.stringify(status)}`);
        },
        onError: (error) => {
          console.error(`TTS错误: ${JSON.stringify(error)}`);
          onError(error);
        },
      });

      // 尝试连接
      return tts
        .connect()
        .then(() => {
          console.log("TTS服务连接成功，模拟WebSocket关闭");

          // 获取内部WebSocket对象（注意：这是一个模拟，实际上无法直接访问内部WebSocket）
          // 这里我们通过断开连接来模拟WebSocket关闭
          tts.disconnect();

          // 尝试在断开连接后发送文本
          return tts.speak("这是一个测试文本").catch((error) => {
            console.log("预期的WebSocket关闭错误:", error);

            // 清理资源
            tts.cleanup();

            return {
              success: true,
              errorType: "WEBSOCKET_CLOSE",
              message: error.message || "WebSocket关闭错误",
            };
          });
        })
        .catch((error) => {
          console.error("连接失败:", error);

          // 清理资源
          tts.cleanup();

          return {
            success: false,
            errorType: "CONNECTION_ERROR",
            message: error.message || "连接错误",
          };
        });
    },
  },

  // 播放错误测试
  PLAYBACK_ERROR: {
    name: "播放错误测试",
    description: "测试TTS服务在音频播放失败时的错误处理",
    test: (onError) => {
      console.log("开始测试: 播放错误");

      // 初始化TTS服务
      const tts = ttsService.init({
        onStatusChange: (status) => {
          console.log(`TTS状态变更: ${JSON.stringify(status)}`);
        },
        onError: (error) => {
          console.error(`TTS错误: ${JSON.stringify(error)}`);
          onError(error);
        },
      });

      // 尝试连接
      return tts
        .connect()
        .then(() => {
          console.log("TTS服务连接成功，尝试模拟播放错误");

          // 这里我们无法直接模拟播放错误，因为这需要修改内部的Audio对象
          // 但我们可以测试在没有音频数据的情况下尝试播放

          // 尝试在没有音频数据的情况下播放
          return tts.play().catch((error) => {
            console.log("预期的播放错误:", error);

            // 清理资源
            tts.cleanup();

            return {
              success: true,
              errorType: "PLAYBACK_ERROR",
              message: error.message || "播放错误",
            };
          });
        })
        .catch((error) => {
          console.error("连接失败:", error);

          // 清理资源
          tts.cleanup();

          return {
            success: false,
            errorType: "CONNECTION_ERROR",
            message: error.message || "连接错误",
          };
        });
    },
  },
};

/**
 * 运行错误测试
 * @param {string} testCase 测试用例名称
 * @param {Function} onComplete 测试完成回调
 * @param {Function} onError 错误回调
 */
function runErrorTest(
  testCase,
  onComplete = () => {},
  onError = console.error
) {
  // 检查测试用例是否存在
  if (!ERROR_TEST_CASES[testCase]) {
    onError(`测试用例 "${testCase}" 不存在`);
    return Promise.reject(new Error(`测试用例 "${testCase}" 不存在`));
  }

  const test = ERROR_TEST_CASES[testCase];
  console.log(`开始错误测试: ${test.name}`);
  console.log(`测试描述: ${test.description}`);

  return test
    .test(onError)
    .then((result) => {
      console.log(`错误测试完成: ${test.name}`);
      console.log(`测试结果: ${result.success ? "成功" : "失败"}`);
      console.log(`错误类型: ${result.errorType}`);
      console.log(`错误消息: ${result.message}`);

      onComplete(result);
      return result;
    })
    .catch((error) => {
      console.error(`错误测试失败: ${error.message || "未知错误"}`);

      const result = {
        success: false,
        errorType: "TEST_FAILURE",
        message: error.message || "测试失败",
      };

      onError(result);
      return result;
    });
}

/**
 * 运行所有错误测试
 * @param {Function} onProgress 进度回调
 * @param {Function} onComplete 完成回调
 * @param {Function} onError 错误回调
 */
function runAllErrorTests(
  onProgress = () => {},
  onComplete = () => {},
  onError = console.error
) {
  const testCases = Object.keys(ERROR_TEST_CASES);
  const results = [];
  let currentIndex = 0;

  console.log(`开始运行所有错误测试，共 ${testCases.length} 个测试用例`);

  function runNextTest() {
    if (currentIndex >= testCases.length) {
      console.log("所有错误测试完成");
      onComplete(results);
      return Promise.resolve(results);
    }

    const testCase = testCases[currentIndex];
    currentIndex++;

    onProgress({
      current: currentIndex,
      total: testCases.length,
      testCase,
      name: ERROR_TEST_CASES[testCase].name,
    });

    return runErrorTest(
      testCase,
      (result) => {
        results.push(result);
      },
      (error) => {
        results.push(error);
        onError(error);
      }
    ).then(() => {
      // 等待1秒后运行下一个测试
      return new Promise((resolve) =>
        setTimeout(() => resolve(runNextTest()), 1000)
      );
    });
  }

  return runNextTest();
}

// 导出测试函数和测试用例
export default {
  ERROR_TEST_CASES,
  runErrorTest,
  runAllErrorTests,
};
