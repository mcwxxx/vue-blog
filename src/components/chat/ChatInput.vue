<script setup lang="ts">
import { ref, computed } from "vue";
import { Button, Space } from "ant-design-vue";
import { Sender, Suggestion, Attachments } from "ant-design-x-vue";
import {
  PaperClipOutlined,
  CloudUploadOutlined,
  ScheduleOutlined,
  AppstoreOutlined,
  AppstoreAddOutlined,
} from "@ant-design/icons-vue";
import { h } from "vue";
import { theme } from "ant-design-vue";

// 定义 Props
interface Props {
  loading?: boolean;
  placeholder?: string;
  suggestions?: string[];
  allowSpeech?: boolean;
  allowAttachments?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  placeholder: "Ask or input / use skills",
  suggestions: () => ["技能1", "技能2", "技能3"],
  allowSpeech: true,
  allowAttachments: true,
});

// 定义 Emits
const emit = defineEmits<{
  submit: [value: string];
  cancel: [];
  "file-paste": [files: File[]];
  "suggestion-select": [suggestion: string];
  "action-click": [action: string];
}>();

// 响应式数据
const inputValue = ref<string>("");
const attachmentsOpen = ref<boolean>(false);
const files = ref<any[]>([]);
const attachmentsRef = ref();

// 处理提交
const handleSubmit = () => {
  if (!inputValue.value.trim()) return;

  console.log("[ChatInput] 提交消息:", inputValue.value);
  emit("submit", inputValue.value.trim());
  inputValue.value = "";
};

// 处理取消
const handleCancel = () => {
  console.log("[ChatInput] 取消请求");
  emit("cancel");
};

// 处理文件粘贴
const onPasteFile = (file: File, files: FileList) => {
  console.log("[ChatInput] 粘贴文件:", file, files);
  const fileArray = Array.from(files);
  for (const f of fileArray) {
    attachmentsRef.value?.upload(f);
  }
  attachmentsOpen.value = true;
  emit("file-paste", fileArray);
};

// 处理建议选择
const handleSuggestionSelect = (itemVal: string) => {
  inputValue.value = `[${itemVal}]:`;
  emit("suggestion-select", itemVal);
};

// 处理快捷操作
const handleQuickAction = (action: string, prompt: string) => {
  console.log("[ChatInput] 快捷操作:", action, prompt);
  emit("action-click", action);
  emit("submit", prompt);
};

// 样式
const { token } = theme.useToken();
const styles = computed(() => ({
  chatSend: {
    padding: "12px",
  },
  sendAction: {
    display: "flex",
    alignItems: "center",
    marginBottom: "12px",
    gap: "8px",
  },
  speechButton: {
    fontSize: "18px",
    color: `${token.value.colorText} !important`,
  },
}));

// 暴露方法给父组件
defineExpose({
  focus: () => {
    // 可以添加聚焦输入框的逻辑
  },
  clear: () => {
    inputValue.value = "";
  },
  setValue: (value: string) => {
    inputValue.value = value;
  },
  getValue: () => inputValue.value,
});
</script>

<template>
  <div :style="styles.chatSend">
    <!-- 快捷操作按钮 -->
    <!-- <div :style="styles.sendAction">
      <Button
        :icon="h(ScheduleOutlined)"
        @click="
          handleQuickAction('upgrades', 'What has Ant Design X upgraded?')
        "
      >
        Upgrades
      </Button>
      <Button
        :icon="h(AppstoreOutlined)"
        @click="
          handleQuickAction(
            'components',
            'What component assets are available in Ant Design X?'
          )
        "
      >
        Components
      </Button>
      <Button :icon="h(AppstoreAddOutlined)"> More </Button>
    </div> -->

    <!-- 输入框 -->
    <Suggestion
      v-if="suggestions.length"
      :items="() => suggestions"
      @select="handleSuggestionSelect"
    >
      <template #default>
        <Sender
          :loading="loading"
          :value="inputValue"
          :allow-speech="allowSpeech"
          :placeholder="placeholder"
          @change="
            (v) => {
              inputValue = v;
            }
          "
          @submit="handleSubmit"
          @cancel="handleCancel"
          @paste-file="onPasteFile"
        >
          <!-- 附件上传 -->
          <template v-if="allowAttachments" #header>
            <Sender.Header
              title="Upload File"
              :styles="{ content: { padding: 0 } }"
              :open="attachmentsOpen"
              force-render
              @open-change="(val) => (attachmentsOpen = val)"
            >
              <Attachments
                ref="attachmentsRef"
                :before-upload="() => false"
                :items="files"
                :placeholder="
                  (type) =>
                    type === 'drop'
                      ? { title: 'Drop file here' }
                      : {
                          icon: h(CloudUploadOutlined),
                          title: 'Upload files',
                          description:
                            'Click or drag files to this area to upload',
                        }
                "
                @change="({ fileList }) => (files = fileList)"
              />
            </Sender.Header>
          </template>

          <!-- 附件按钮 -->
          <template v-if="allowAttachments" #prefix>
            <Button
              type="text"
              :icon="h(PaperClipOutlined, { style: { fontSize: '18px' } })"
              @click="attachmentsOpen = !attachmentsOpen"
            />
          </template>

          <!-- 发送按钮 -->
          <template
            #actions="{
              info: {
                components: { SendButton, LoadingButton, SpeechButton },
              },
            }"
          >
            <div :style="{ display: 'flex', alignItems: 'center', gap: 4 }">
              <component
                v-if="allowSpeech"
                :is="SpeechButton"
                :style="styles.speechButton"
              />
              <component :is="LoadingButton" v-if="loading" type="default" />
              <component :is="SendButton" v-else type="primary" />
            </div>
          </template>
        </Sender>
      </template>
    </Suggestion>

    <!-- 无建议时的简单输入框 -->
    <Sender
      v-else
      :loading="loading"
      :value="inputValue"
      :allow-speech="allowSpeech"
      :placeholder="placeholder"
      @change="
        (v) => {
          inputValue = v;
        }
      "
      @submit="handleSubmit"
      @cancel="handleCancel"
      @paste-file="onPasteFile"
    >
      <!-- 附件上传 -->
      <template v-if="allowAttachments" #header>
        <Sender.Header
          title="Upload File"
          :styles="{ content: { padding: 0 } }"
          :open="attachmentsOpen"
          force-render
          @open-change="(val) => (attachmentsOpen = val)"
        >
          <Attachments
            ref="attachmentsRef"
            :before-upload="() => false"
            :items="files"
            :placeholder="
              (type) =>
                type === 'drop'
                  ? { title: 'Drop file here' }
                  : {
                      icon: h(CloudUploadOutlined),
                      title: 'Upload files',
                      description: 'Click or drag files to this area to upload',
                    }
            "
            @change="({ fileList }) => (files = fileList)"
          />
        </Sender.Header>
      </template>

      <!-- 附件按钮 -->
      <template v-if="allowAttachments" #prefix>
        <Button
          type="text"
          :icon="h(PaperClipOutlined, { style: { fontSize: '18px' } })"
          @click="attachmentsOpen = !attachmentsOpen"
        />
      </template>

      <!-- 发送按钮 -->
      <template
        #actions="{
          info: {
            components: { SendButton, LoadingButton, SpeechButton },
          },
        }"
      >
        <div :style="{ display: 'flex', alignItems: 'center', gap: 4 }">
          <component
            v-if="allowSpeech"
            :is="SpeechButton"
            :style="styles.speechButton"
          />
          <component :is="LoadingButton" v-if="loading" type="default" />
          <component :is="SendButton" v-else type="primary" />
        </div>
      </template>
    </Sender>
  </div>
</template>
