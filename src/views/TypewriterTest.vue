<template>
  <div class="typewriter-test-container">
    <div class="test-header">
      <h2>打字机效果测试页面</h2>
      <p>测试TypewriterText组件的各种功能</p>
    </div>

    <div class="test-sections">
      <!-- 基础文本测试 -->
      <div class="test-section">
        <h3>基础文本测试</h3>
        <div class="test-content">
          <TypewriterText
            :text="basicText"
            :speed="50"
            :enabled="true"
            :show-cursor="true"
            @complete="onBasicComplete"
            @progress="onBasicProgress"
          />
        </div>
        <div class="controls">
          <button @click="resetBasicText" class="btn">重新开始</button>
          <button @click="skipBasicText" class="btn">跳过动画</button>
        </div>
        <div class="progress">
          进度: {{ basicProgress.toFixed(1) }}%
        </div>
      </div>

      <!-- Markdown测试 -->
      <div class="test-section">
        <h3>Markdown内容测试</h3>
        <div class="test-content">
          <TypewriterText
            ref="markdownTypewriter"
            :text="markdownText"
            :speed="30"
            :enabled="true"
            :show-cursor="true"
            @complete="onMarkdownComplete"
            @progress="onMarkdownProgress"
          />
        </div>
        <div class="controls">
          <button @click="resetMarkdownText" class="btn">重新开始</button>
          <button @click="skipMarkdownText" class="btn">跳过动画</button>
        </div>
        <div class="progress">
          进度: {{ markdownProgress.toFixed(1) }}%
        </div>
      </div>

      <!-- 长文本测试 -->
      <div class="test-section">
        <h3>长文本测试</h3>
        <div class="test-content">
          <TypewriterText
            ref="longTextTypewriter"
            :text="longText"
            :speed="20"
            :enabled="true"
            :show-cursor="true"
            @complete="onLongTextComplete"
            @progress="onLongTextProgress"
          />
        </div>
        <div class="controls">
          <button @click="resetLongText" class="btn">重新开始</button>
          <button @click="skipLongText" class="btn">跳过动画</button>
        </div>
        <div class="progress">
          进度: {{ longTextProgress.toFixed(1) }}%
        </div>
      </div>

      <!-- 控制面板 -->
      <div class="test-section">
        <h3>全局控制</h3>
        <div class="controls">
          <button @click="resetAllTests" class="btn btn-primary">重置所有测试</button>
          <button @click="skipAllTests" class="btn btn-secondary">跳过所有动画</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TypewriterText from '@/components/chat/TypewriterText.vue';

/**
 * 打字机效果测试页面
 * @description 测试TypewriterText组件的各种功能和场景
 */

// 组件引用
const markdownTypewriter = ref<InstanceType<typeof TypewriterText> | null>(null);
const longTextTypewriter = ref<InstanceType<typeof TypewriterText> | null>(null);

// 测试文本
const basicText = ref('这是一个基础的打字机效果测试。Hello World! 你好世界！');
const markdownText = ref(`# 这是一个Markdown测试

这里有**粗体文字**和*斜体文字*。

## 代码示例

\`\`\`javascript
function hello() {
  console.log('Hello, TypewriterText!');
}
\`\`\`

> 这是一个引用块

- 列表项 1
- 列表项 2
- 列表项 3

[这是一个链接](https://example.com)`);

const longText = ref(`人工智能（Artificial Intelligence，简称AI）是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。

该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。人工智能从诞生以来，理论和技术日益成熟，应用领域也不断扩大。

可以设想，未来人工智能带来的科技产品，将会是人类智慧的"容器"。人工智能可以对人的意识、思维的信息过程的模拟。

人工智能不是人的智能，但能像人那样思考、也可能超过人的智能。人工智能是一门极富挑战性的科学，从事这项工作的人必须懂得计算机知识，心理学和哲学。`);

// 进度状态
const basicProgress = ref(0);
const markdownProgress = ref(0);
const longTextProgress = ref(0);

// 事件处理函数
const onBasicComplete = () => {
  console.log('基础文本打字完成');
};

const onBasicProgress = (progress: number) => {
  basicProgress.value = progress;
};

const onMarkdownComplete = () => {
  console.log('Markdown文本打字完成');
};

const onMarkdownProgress = (progress: number) => {
  markdownProgress.value = progress;
};

const onLongTextComplete = () => {
  console.log('长文本打字完成');
};

const onLongTextProgress = (progress: number) => {
  longTextProgress.value = progress;
};

// 控制函数
const resetBasicText = () => {
  const currentText = basicText.value;
  basicText.value = '';
  basicProgress.value = 0;
  setTimeout(() => {
    basicText.value = currentText;
  }, 100);
};

const skipBasicText = () => {
  // 这里需要调用组件的skipTyping方法
  console.log('跳过基础文本动画');
};

const resetMarkdownText = () => {
  const currentText = markdownText.value;
  markdownText.value = '';
  markdownProgress.value = 0;
  setTimeout(() => {
    markdownText.value = currentText;
  }, 100);
};

const skipMarkdownText = () => {
  if (markdownTypewriter.value) {
    markdownTypewriter.value.skipTyping();
  }
};

const resetLongText = () => {
  const currentText = longText.value;
  longText.value = '';
  longTextProgress.value = 0;
  setTimeout(() => {
    longText.value = currentText;
  }, 100);
};

const skipLongText = () => {
  if (longTextTypewriter.value) {
    longTextTypewriter.value.skipTyping();
  }
};

const resetAllTests = () => {
  resetBasicText();
  resetMarkdownText();
  resetLongText();
};

const skipAllTests = () => {
  skipBasicText();
  skipMarkdownText();
  skipLongText();
};

// 生命周期
onMounted(() => {
  console.log('打字机测试页面已挂载');
});
</script>

<style scoped>
.typewriter-test-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.test-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e8e8e8;
}

.test-header h2 {
  color: #1890ff;
  margin-bottom: 10px;
}

.test-header p {
  color: #666;
  font-size: 16px;
}

.test-sections {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.test-section {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.test-section h3 {
  color: #333;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.test-content {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 20px;
  margin-bottom: 15px;
  min-height: 100px;
  line-height: 1.6;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #333;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.btn-primary {
  background: #1890ff;
  border-color: #1890ff;
  color: #fff;
}

.btn-primary:hover {
  background: #40a9ff;
  border-color: #40a9ff;
  color: #fff;
}

.btn-secondary {
  background: #f5f5f5;
  border-color: #d9d9d9;
  color: #666;
}

.btn-secondary:hover {
  background: #e6f7ff;
  border-color: #91d5ff;
  color: #1890ff;
}

.progress {
  font-size: 14px;
  color: #666;
  background: #f0f0f0;
  padding: 8px 12px;
  border-radius: 4px;
  display: inline-block;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .typewriter-test-container {
    padding: 15px;
  }
  
  .test-section {
    padding: 15px;
  }
  
  .controls {
    flex-wrap: wrap;
  }
  
  .btn {
    flex: 1;
    min-width: 120px;
  }
}
</style>