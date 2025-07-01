<!--
 * @Author: masi 2454023350@qq.com
 * @Date: 2025-06-25 15:31:25
 * @LastEditors: masi 2454023350@qq.com
 * @LastEditTime: 2025-06-26 17:56:09
 * @FilePath: \figmamcp\vue-blog\src\views\Post.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup>
import { ref, onMounted } from "vue";
import { useRoute, RouterLink } from "vue-router";
import request from "../utils/request";

const route = useRoute();
const post = ref(null);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    post.value = await request(`/api/posts/${route.params.id}`);
  } catch (err) {
    error.value = err.message || "获取文章失败";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <RouterLink
      to="/"
      class="mb-4 inline-block text-blue-600 hover:text-blue-800"
    >
      ← 返回首页
    </RouterLink>

    <div v-if="loading" class="text-center py-8">加载中...</div>

    <div v-else-if="error" class="text-red-500 p-4 bg-red-50 rounded">
      {{ error }}
    </div>

    <div v-else-if="post">
      <h1 class="text-3xl font-bold mb-4">{{ post.title }}</h1>
      <div class="prose max-w-none" v-html="post.content"></div>
    </div>
  </div>
</template>
