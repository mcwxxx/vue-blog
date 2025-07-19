<template>
  <div class="chat-input">
    <Sender
      v-model:value="inputValue"
      :submit-type="'shiftEnter'"
      :allow-speech="true"
      :loading="loading"
      :disabled="disabled"
      @submit="handleSend"
      @paste-file="handlePasteFile"
    >
      <template #actions>
        <Button type="text" @click="handleFileUpload">
          <PaperClipOutlined />
        </Button>
        <Button type="text" @click="handleVoiceInput">
          <AudioOutlined />
        </Button>
      </template>
      <template #footer v-if="showFooter">
        <div class="sender-footer">
          <span>支持 Shift + Enter 换行</span>
        </div>
      </template>
    </Sender>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Sender } from "ant-design-x-vue";
import { Button } from "ant-design-vue";
import { PaperClipOutlined, AudioOutlined } from "@ant-design/icons-vue";

interface Props {
  loading?: boolean;
  disabled?: boolean;
  showFooter?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  showFooter: true,
});

const emit = defineEmits<{
  send: [content: string];
  fileUpload: [];
  voiceInput: [];
  pasteFile: [files: File[]];
}>();

const inputValue = ref("");

const handleSend = (content: string) => {
  if (content.trim()) {
    emit("send", content);
    inputValue.value = "";
  }
};

const handleFileUpload = () => {
  emit("fileUpload");
};

const handleVoiceInput = () => {
  emit("voiceInput");
};

const handlePasteFile = (files: File[]) => {
  emit("pasteFile", files);
};
</script>

<style scoped>
.chat-input {
  padding: 12px;
}

.sender-footer {
  font-size: 12px;
  color: #999;
  text-align: center;
  padding: 8px 0;
}
</style>
