<template>
  <div class="typewriter-test">
    <h2>打字机效果测试</h2>
    
    <div class="test-section">
      <h3>1. 直接使用 TypewriterText 组件</h3>
      <div class="test-box">
        <TypewriterText
          :text="testText"
          :speed="50"
          :enabled="true"
          :show-cursor="true"
          @complete="onComplete"
          @progress="onProgress"
        />
      </div>
    </div>
    
    <div class="test-section">
      <h3>2. 模拟 ChatBubble 中的条件</h3>
      <div class="test-box">
        <div v-if="shouldUseTypewriter">
          <p>✅ 条件满足，使用打字机效果：</p>
          <TypewriterText
            :text="testText"
            :speed="50"
            :enabled="true"
            :show-cursor="true"
          />
        </div>
        <div v-else>
          <p>❌ 条件不满足，使用普通渲染：</p>
          <div v-html="renderMarkdown(testText)"></div>
        </div>
      </div>
    </div>
    
    <div class="test-section">
      <h3>3. 测试控制</h3>
      <div class="controls">
        <label>
          <input v-model="isLoading" type="checkbox" />
          isLoading: {{ isLoading }}
        </label>
        <label>
          <input v-model="hasValidContent" type="checkbox" />
          hasValidContent: {{ hasValidContent }}
        </label>
        <p>shouldUseTypewriter: {{ shouldUseTypewriter }}</p>
      </div>
    </div>
    
    <div class="test-section">
      <h3>4. 模拟真实消息数据</h3>
      <div class="test-box">
        <pre>{{ JSON.stringify(mockMessage, null, 2) }}</pre>
        <div class="render-result">
          <component :is="renderTestMessage(mockMessage)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import TypewriterText from '@/components/chat/TypewriterText.vue';
import { renderMarkdown } from '@/utils/markdown';

const testText = ref('这是一个测试文本，用来验证打字机效果是否正常工作。我们需要确保在正确的条件下，文字能够逐字显示出来。');
const isLoading = ref(true);
const hasValidContent = ref(true);

const shouldUseTypewriter = computed(() => {
  return isLoading.value && hasValidContent.value;
});

const mockMessage = ref({
  id: 'test-msg-1',
  content: testText.value,
  role: 'assistant',
  status: 'loading',
  loading: true,
  timestamp: Date.now()
});

const onComplete = () => {
  console.log('✅ 打字机效果完成');
};

const onProgress = (progress: number) => {
  if (progress % 20 === 0) {
    console.log('📝 打字机进度:', progress + '%');
  }
};

const renderTestMessage = (message: any) => {
  const content = message.content;
  const info = {
    loading: message.loading,
    status: message.status,
    messageId: message.id
  };
  
  console.log('🔍 测试渲染条件:', {
    'info.loading': info.loading,
    'info.status': info.status,
    'content length': content?.length || 0,
    'isLoading': info.loading === true || info.status === 'loading',
    'hasValidContent': content && content.trim().length > 0
  });
  
  const isLoading = info.loading === true || info.status === 'loading';
  const hasValidContent = content && content.trim().length > 0;
  
  if (isLoading && hasValidContent) {
    console.log('✅ 使用打字机效果');
    return h(TypewriterText, {
      text: content,
      speed: 50,
      enabled: true,
      showCursor: true
    });
  }
  
  console.log('❌ 使用普通渲染');
  return h('div', { innerHTML: renderMarkdown(content) });
};
</script>

<style scoped>
.typewriter-test {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.test-section {
  margin-bottom: 30px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
}

.test-box {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 4px;
  margin-top: 10px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.controls label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.render-result {
  margin-top: 15px;
  padding: 10px;
  background: white;
  border-radius: 4px;
}

pre {
  background: #f0f0f0;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}
</style>