<script setup>
import { ref, onMounted } from "vue";
import { marked } from "marked";

const readmeContent = ref("");
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    const response = await fetch("/README.md");
    readmeContent.value = marked(await response.text());
  } catch (err) {
    error.value = err.message || "加载文档失败";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="container mx-auto px-4 py-8 h-full">
    <div v-if="loading" class="text-center py-8">加载中...</div>
    <div v-else-if="error" class="text-red-500 p-4 bg-red-50 rounded">
      {{ error }}
    </div>
    <div v-else class="prose max-w-none h-full" v-html="readmeContent"></div>
  </div>
</template>

<style>
.prose {
  max-width: 100%;
}
.prose img {
  max-width: 100%;
}
</style>
