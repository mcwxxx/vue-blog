<script setup>
import { ref, onMounted } from "vue";
import request from "../utils/request";

const posts = ref([]);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    posts.value = await request("/api/posts");
  } catch (err) {
    error.value = err.message || "获取文章失败";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">文章列表</h1>

    <div v-if="loading" class="text-center py-8">加载中...</div>

    <div v-else-if="error" class="text-red-500 p-4 bg-red-50 rounded">
      {{ error }}
    </div>

    <div v-else>
      <div
        v-for="post in posts"
        :key="post._id"
        class="mb-6 p-4 border rounded-lg hover:shadow-md transition-shadow"
      >
        <RouterLink :to="'/post/' + post._id" class="block">
          <h2 class="text-xl font-semibold mb-2">{{ post.title }}</h2>
          <div class="text-gray-600 line-clamp-2" v-html="post.content"></div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 保留原有样式 */
</style>
