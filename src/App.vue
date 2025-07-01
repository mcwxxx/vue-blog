<!--
 * @Author: masi 2454023350@qq.com
 * @Date: 2025-06-25 15:21:09
 * @LastEditors: masi 2454023350@qq.com
 * @LastEditTime: 2025-06-26 19:05:27
 * @FilePath: \figmamcp\vue-blog\src\App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup>
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <div>
    <header class="bg-white shadow-md sticky top-0 z-50">
      <nav class="container mx-auto px-4 py-4 flex gap-4">
        <RouterLink to="/" class="text-lg font-medium">首页</RouterLink>
        <RouterLink to="/about" class="text-lg font-medium">关于</RouterLink>
        <RouterLink
          to="/create"
          class="ml-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          写文章
        </RouterLink>
      </nav>
    </header>

    <main class="container mx-auto px-4 py-8 overflow-y-auto">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.router-link-active {
  @apply text-blue-600;
}
</style>
