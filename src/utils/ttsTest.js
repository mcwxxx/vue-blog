/*
 * @Author: Kiro AI Assistant
 * @Date: 2025-07-17
 * @Description: TTS服务测试脚本
 */

/**
 * TTS服务测试模块
 * 提供各种测试场景来验证TTS服务的功能
 */

// 导入TTS服务
import ttsService from "./ttsService";

// 测试用例
const TEST_CASES = {
  // 短响应测试
  SHORT_RESPONSE: {
    name: "短响应测试",
    text: "这是一个简短的AI响应，用于测试TTS服务的基本功能。",
    expectedDuration: 3, // 预期时长（秒）
  },

  // 长响应测试
  LONG_RESPONSE: {
    name: "长响应测试",
    text: `这是一个较长的AI响应，用于测试TTS服务处理大量文本的能力。
    人工智能（AI）是计算机科学的一个分支，它致力于创建能够模拟人类智能的系统。
    这些系统可以学习、推理、感知、规划和解决问题。
    机器学习是AI的一个子领域，它使用统计方法使计算机系统能够从数据中"学习"，而无需明确编程。
    深度学习是机器学习的一个分支，它使用多层神经网络来分析各种因素。
    自然语言处理（NLP）是AI的另一个重要领域，它使计算机能够理解、解释和生成人类语言。
    计算机视觉使机器能够从图像或视频中获取信息并进行解释。
    机器人技术结合了AI的多个方面，创建能够在物理世界中执行任务的机器。
    AI的应用非常广泛，从虚拟助手到自动驾驶汽车，从医疗诊断到金融预测。
    随着技术的不断发展，AI将继续改变我们的生活和工作方式。`,
    expectedDuration: 30, // 预期时长（秒）
  },

  // 包含特殊字符的响应测试
  SPECIAL_CHARS_RESPONSE: {
    name: "特殊字符响应测试",
    text: `这个响应包含各种特殊字符和符号：
    数学符号: π, ∑, √, ∫, ∞, ≠, ≤, ≥
    货币符号: $, €, £, ¥, ₽
    标点符号: "引号", '单引号', (括号), [方括号], {花括号}, @at符号, #井号, %百分号
    中文标点: 。，；：""''？！（）【】《》
    表情符号: :-) :( ;) :D :P
    其他特殊字符: ©, ®, ™, §, ¶, •, ·, ※, †, ‡, ‰`,
    expectedDuration: 15, // 预期时长（秒）
  },

  // 包含代码块的响应测试
  CODE_BLOCK_RESPONSE: {
    name: "代码块响应测试",
    text: `以下是一个JavaScript函数示例：

    \`\`\`javascript
    function calculateSum(a, b) {
      // 这是一个简单的加法函数
      return a + b;
    }
    
    // 调用函数
    const result = calculateSum(5, 3);
    console.log("计算结果是: " + result);
    \`\`\`
    
    这个函数接受两个参数并返回它们的和。
    
    以下是一个Python示例：
    
    \`\`\`python
    def calculate_product(a, b):
        # 这是一个简单的乘法函数
        return a * b
        
    # 调用函数
    result = calculate_product(4, 5)
    print(f"计算结果是: {result}")
    \`\`\`
    
    这个函数接受两个参数并返回它们的乘积。`,
    expectedDuration: 20, // 预期时长（秒）
  },

  // HTML内容响应测试
  HTML_RESPONSE: {
    name: "HTML内容响应测试",
    text: `以下是一个简单的HTML示例：

    <html>
    <head>
      <title>测试页面</title>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { margin: 0 auto; width: 80%; }
        h1 { color: #333; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>欢迎使用TTS服务</h1>
        <p>这是一个<strong>测试</strong>页面，用于验证TTS服务处理HTML内容的能力。</p>
        <ul>
          <li>列表项1</li>
          <li>列表项2</li>
          <li>列表项3</li>
        </ul>
      </div>
    </body>
    </html>`,
    expectedDuration: 15, // 预期时长（秒）
  },

  // 多语言响应测试
  MULTILINGUAL_RESPONSE: {
    name: "多语言响应测试",
    text: `这是一个包含多种语言的响应：
    
    英语: Hello, how are you today?
    法语: Bonjour, comment allez-vous aujourd'hui?
    德语: Hallo, wie geht es Ihnen heute?
    西班牙语: Hola, ¿cómo estás hoy?
    意大利语: Ciao, come stai oggi?
    日语: こんにちは、今日はお元気ですか？
    韩语: 안녕하세요, 오늘 어떻게 지내세요?
    俄语: Здравствуйте, как вы сегодня?
    阿拉伯语: مرحبا، كيف حالك اليوم؟
    
    注意：TTS服务可能不支持所有这些语言，这取决于服务的配置。`,
    expectedDuration: 25, // 预期时长（秒）
  },
};

/**
 * 运行TTS测试
 * @param {string} testCase 测试用例名称
 * @param {Function} onComplete 测试完成回调
 * @param {Function} onError 错误回调
 */
function runTest(testCase, onComplete = () => {}, onError = console.error) {
  // 检查测试用例是否存在
  if (!TEST_CASES[testCase]) {
    onError(`测试用例 "${testCase}" 不存在`);
    return;
  }

  const test = TEST_CASES[testCase];
  console.log(`开始测试: ${test.name}`);
  console.log(`测试文本长度: ${test.text.length} 字符`);

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

  // 连接TTS服务
  tts
    .connect()
    .then(() => {
      console.log("TTS服务连接成功");

      // 记录开始时间
      const startTime = Date.now();

      // 发送文本到TTS服务
      return tts.speak(test.text).then(() => {
        console.log("TTS请求已发送");

        // 监听播放完成
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            const status = tts.getPlaybackStatus();
            if (status === "idle") {
              clearInterval(checkInterval);
              const endTime = Date.now();
              const duration = (endTime - startTime) / 1000;

              console.log(`测试完成: ${test.name}`);
              console.log(`实际播放时长: ${duration.toFixed(2)}秒`);
              console.log(`预期播放时长: ${test.expectedDuration}秒`);

              // 清理资源
              tts.cleanup();

              resolve({
                testCase,
                name: test.name,
                success: true,
                duration,
                expectedDuration: test.expectedDuration,
              });
            }
          }, 500);

          // 设置超时
          setTimeout(() => {
            clearInterval(checkInterval);
            console.warn(`测试超时: ${test.name}`);

            // 清理资源
            tts.cleanup();

            resolve({
              testCase,
              name: test.name,
              success: false,
              error: "测试超时",
            });
          }, (test.expectedDuration * 2 + 10) * 1000); // 超时时间为预期时长的2倍加10秒
        });
      });
    })
    .then((result) => {
      onComplete(result);
    })
    .catch((error) => {
      console.error(`测试失败: ${error.message || "未知错误"}`);

      // 清理资源
      tts.cleanup();

      onError({
        testCase,
        name: TEST_CASES[testCase].name,
        success: false,
        error: error.message || "未知错误",
      });
    });
}

/**
 * 运行所有测试
 * @param {Function} onProgress 进度回调
 * @param {Function} onComplete 完成回调
 * @param {Function} onError 错误回调
 */
function runAllTests(
  onProgress = () => {},
  onComplete = () => {},
  onError = console.error
) {
  const testCases = Object.keys(TEST_CASES);
  const results = [];
  let currentIndex = 0;

  console.log(`开始运行所有测试，共 ${testCases.length} 个测试用例`);

  function runNextTest() {
    if (currentIndex >= testCases.length) {
      console.log("所有测试完成");
      onComplete(results);
      return;
    }

    const testCase = testCases[currentIndex];
    currentIndex++;

    onProgress({
      current: currentIndex,
      total: testCases.length,
      testCase,
      name: TEST_CASES[testCase].name,
    });

    runTest(
      testCase,
      (result) => {
        results.push(result);
        setTimeout(runNextTest, 1000); // 等待1秒后运行下一个测试
      },
      (error) => {
        results.push(error);
        onError(error);
        setTimeout(runNextTest, 1000); // 即使出错也继续下一个测试
      }
    );
  }

  runNextTest();
}

// 导出测试函数和测试用例
export default {
  TEST_CASES,
  runTest,
  runAllTests,
};
