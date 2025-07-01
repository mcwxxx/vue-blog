<!--
 * @Author: masi 2454023350@qq.com
 * @Date: 2025-06-26 15:37:30
 * @LastEditors: masi 2454023350@qq.com
 * @LastEditTime: 2025-06-26 15:37:49
 * @FilePath: \vue-blog\src\views\AI.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { Bubble, XProvider } from "ant-design-x-vue";
</script>

<template>
  <div class="ai-container">
    <h1>Ant Design X Vue 测试页面</h1>
    <Bubble content="你好，我是AI助手" />
  </div>
</template>

<style scoped>
.ai-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}
h1 {
  margin-bottom: 20px;
}
</style>
