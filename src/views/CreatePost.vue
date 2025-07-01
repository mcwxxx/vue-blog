<!--
 * @Author: masi 2454023350@qq.com
 * @Date: 2025-06-25 15:55:38
 * @LastEditors: masi 2454023350@qq.com
 * @LastEditTime: 2025-06-26 13:55:29
 * @FilePath: \figmamcp\vue-blog\src\views\CreatePost.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup>
import { ref } from "vue";
import Editor from "../components/Editor.vue";
import { useRouter } from "vue-router";
import request from "../utils/request";

const router = useRouter();
const title = ref("");
const editorRef = ref(null);

const submitPost = async () => {
  if (!title.value || !editorRef.value || editorRef.value.isEmpty()) {
    alert("请填写标题和内容");
    return;
  }

  try {
    await request("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        title: title.value,
        content: editorRef.value.getHTML(),
      }),
    });
    router.push("/");
  } catch (error) {
    console.error("提交失败:", error);
    alert("提交失败，请重试");
  }
};
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6">创建新文章</h1>

    <div class="mb-4">
      <label class="block mb-2 font-medium">标题</label>
      <input
        v-model="title"
        type="text"
        class="w-full p-2 border rounded"
        placeholder="输入文章标题"
      />
    </div>

    <div class="mb-6">
      <label class="block mb-2 font-medium">内容</label>
      <Editor ref="editorRef" />
    </div>

    <button
      @click="submitPost"
      class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      发布文章
    </button>
  </div>
</template>
