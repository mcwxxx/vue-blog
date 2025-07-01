<script setup>
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";

const editor = useEditor({
  content: "<p>开始编辑你的文章...</p>",
  extensions: [StarterKit],
});

defineExpose({
  getHTML: () => editor.value.getHTML(),
  getText: () => editor.value.getText(),
  isEmpty: () => editor.value.isEmpty,
});
</script>

<template>
  <div class="editor border rounded p-4">
    <div v-if="editor" class="flex gap-2 mb-4">
      <button
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'bg-gray-200': editor.isActive('bold') }"
        class="p-2 rounded"
      >
        加粗
      </button>
      <button
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'bg-gray-200': editor.isActive('italic') }"
        class="p-2 rounded"
      >
        斜体
      </button>
    </div>
    <EditorContent :editor="editor" class="min-h-[200px]" />
  </div>
</template>

<style>
.ProseMirror {
  min-height: 200px;
  padding: 8px;
  outline: none;
}

.ProseMirror:focus {
  outline: none;
}
</style>
