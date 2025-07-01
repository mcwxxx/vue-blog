# Bubble 组件文档

## Bubble 属性

| 属性             | 说明                 | 类型                                                                             | 默认值 | 版本 |
| ---------------- | -------------------- | -------------------------------------------------------------------------------- | ------ | ---- |
| avatar           | 展示头像             | VNode                                                                            | -      | -    |
| classNames       | 语义化结构 class     | Record<SemanticDOM, string>                                                      | -      | -    |
| content          | 聊天内容             | BubbleContentType                                                                | -      | -    |
| footer           | 底部内容             | VNode \| (content: BubbleContentType) => VNode                                   | -      | -    |
| header           | 头部内容             | VNode \| (content: BubbleContentType) => VNode                                   | -      | -    |
| loading          | 聊天内容加载状态     | boolean                                                                          | -      | -    |
| placement        | 信息位置             | start \| end                                                                     | start  | -    |
| shape            | 气泡形状             | round \| corner                                                                  | -      | -    |
| styles           | 语义化结构 style     | Record<SemanticDOM, CSSProperties>                                               | -      | -    |
| typing           | 设置聊天内容打字动画 | boolean \| { step?: number, interval?: number }                                  | false  | -    |
| variant          | 气泡样式变体         | filled \| borderless \| outlined \| shadow                                       | filled | -    |
| loadingRender    | 自定义渲染加载态内容 | () => VNode                                                                      | -      | -    |
| messageRender    | 自定义渲染内容       | <ContentType extends BubbleContentType = string>(content?: ContentType) => VNode | -      | -    |
| onTypingComplete | 打字效果完成时的回调 | () => void                                                                       | -      | -    |

## Bubble 插槽

| 插槽名  | 说明         | 类型                           |
| ------- | ------------ | ------------------------------ |
| avatar  | 头像         | -                              |
| header  | 头部面板     | { content: BubbleContentType } |
| footer  | 底部内容     | { content: BubbleContentType } |
| loading | loading 占位 | -                              |
| message | 消息内容     | { content: BubbleContentType } |

## Bubble.List 属性

| 属性       | 说明                                                             | 类型                                                          | 默认值 | 版本 |
| ---------- | ---------------------------------------------------------------- | ------------------------------------------------------------- | ------ | ---- |
| autoScroll | 当内容更新时，自动滚动到最新位置。如果用户滚动，则会暂停自动滚动 | boolean                                                       | true   | -    |
| items      | 气泡数据列表                                                     | (BubbleProps & { key?: string \| number, role?: string })[]   | -      | -    |
| roles      | 设置气泡默认属性                                                 | Record<string, BubbleProps> \| (bubble, index) => BubbleProps | -      | -    |

## 代码示例

```vue
import {
  FrownOutlined,
  SmileOutlined,
  SyncOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { BubbleList } from 'ant-design-x-vue';
import { Button, Flex, Space, Spin } from 'ant-design-vue';
import type { BubbleListProps } from 'ant-design-x-vue';
import { ref, h } from 'vue';

defineOptions({ name: 'AXBubbleBubbleCustomSetup' });

const roles: BubbleListProps['roles'] = {
  ai: {
    placement: 'start',
    avatar: { icon: h(UserOutlined), style: { background: '#fde3cf' } },
    typing: { step: 5, interval: 20 },
    style: {
      maxWidth: 600,
      marginInlineEnd: 44,
    },
    styles: {
      footer: {
        width: '100%',
      },
    },
    loadingRender: () =>
      h(Space, null, () => [h(Spin, { size: 'small' }), 'Custom loading...']),
  },
  user: {
    placement: 'end',
    avatar: { icon: h(UserOutlined), style: { background: '#87d068' } },
  },
};

// const listRef = useTemplateRef<InstanceType<typeof BubbleList>>(null);
const listRef = ref<InstanceType<typeof BubbleList>>(null);
</script>

<template>
  <BubbleList
    ref="listRef"
    :style="{ maxHeight: 300 }"
    :roles="roles"
    :items="[
      {
        key: 'welcome',
        role: 'ai',
        content: 'Mock welcome content. '.repeat(10),
        footer: h(Flex, null, () => [
          h(Button, {
            size: 'small',
            type: 'text',
            icon: h(SyncOutlined),
            style: { marginInlineEnd: 'auto' },
          }),
          h(Button, { size: 'small', type: 'text', icon: h(SmileOutlined) }),
          h(Button, { size: 'small', type: 'text', icon: h(FrownOutlined) }),
        ]),
      },
      {
        key: 'ask',
        role: 'user',
        content: 'Mock user content.',
      },
      {
        key: 'ai',
        role: 'ai',
        loading: true,
      },
    ]"
  />
</template>
```

## API 集成总结

通过对`src/views/AIChat.vue`文件的分析，结合本文档中的 API 接口定义和调用示例，可以得出以下结论：

1. **成功集成验证**：

   - 在 AIChat.vue 组件中已成功实现了 XRequest API 的调用
   - 使用了`useXAgent`和`useXChat`这两个高阶 API 封装
   - 实现了完整的请求生命周期处理（onSuccess, onError, onUpdate）

2. **关键集成点**：

   ```typescript
   // API配置
   const [agent] = useXAgent<BubbleDataType>({
     baseURL: "https://api.x.ant.design/api/model-url-path",
     model: "model-name",
     dangerouslyApiKey: "Bearer sk-xxxxxxxxxxxxxxxxxxxx",
   });

   // 聊天消息处理
   const { messages, onRequest } = useXChat({
     agent: agent.value,
     requestFallback: (_, { error }) => {
       /* 错误处理 */
     },
     transformMessage: (info) => {
       /* 消息转换 */
     },
     resolveAbortController: (controller) => {
       abortController.value = controller;
     },
   });
   ```

3. **集成注意事项**：

   - 需要替换示例中的`baseURL`、`model`和`dangerouslyApiKey`为实际值
   - 流式响应(stream: true)需要特殊处理消息更新逻辑
   - 建议添加请求中止(abort)处理，如示例中的 abortController
   - 复杂的消息结构需要实现 transformMessage 函数进行转换

4. **调用示例**：
   ```typescript
   // 发送用户消息
   handleUserSubmit(val: string) {
     onRequest({
       stream: true,
   | transformStream | 可选的转换函数，用于处理流数据 | XStreamOptions<Output>['transformStream'] | -      | -    |
   ```

## 基础 API 调用示例

```vue
<script setup lang="ts">
import { LoadingOutlined, TagsOutlined } from "@ant-design/icons-vue";
import { Button, Descriptions, Flex } from "ant-design-vue";
import {
  ThoughtChain,
  type ThoughtChainItem,
  XRequest,
} from "ant-design-x-vue";
import { ref, h } from "vue";

defineOptions({ name: "AXXRequestBasicSetup" });

/**
 * 🔔 Please replace the BASE_URL, PATH, MODEL, API_KEY with your own values.
 */
const BASE_URL = "https://api.example.com";
const PATH = "/chat";
const MODEL = "gpt-3.5-turbo";
// const API_KEY = '';

const exampleRequest = XRequest({
  baseURL: BASE_URL + PATH,
  model: MODEL,

  /** 🔥🔥 Its dangerously! */
  // dangerouslyApiKey: API_KEY
});

const status = ref<ThoughtChainItem["status"]>();
const lines = ref<Record<string, string>[]>([]);

async function request() {
  status.value = "pending";

  await exampleRequest.create(
    {
      messages: [{ role: "user", content: "hello, who are u?" }],
      stream: true,
      agentId: 111,
    },
    {
      onSuccess: (messages) => {
        status.value = "success";
        console.log("onSuccess", messages);
      },
      onError: (error) => {
        status.value = "error";
        console.error("onError", error);
      },
      onUpdate: (msg) => {
        lines.value = [...lines.value, msg];
        console.log("onUpdate", msg);
      },
    }
  );
}
</script>

<template>
  <Flex align="start" gap="16" :style="{ overflow: 'auto' }">
    <Button type="primary" :disabled="status === 'pending'" @click="request">
      {{ `Request - ${BASE_URL + PATH}` }}
    </Button>
    <ThoughtChain
      :items="[
        {
          title: 'Request Log',
          status: status,
          icon: status === 'pending' ? h(LoadingOutlined) : h(TagsOutlined),
          description:
            status === 'error' &&
            exampleRequest.baseURL === BASE_URL + PATH &&
            'Please replace the BASE_URL, PATH, MODEL, API_KEY with your own values.',
          content: h(Descriptions, { column: 1 }, () => [
            h(Descriptions.Item, { label: 'Status' }, status || '-'),
            h(
              Descriptions.Item,
              { label: 'Update Times' },
              lines.length.toString()
            ),
          ]),
        },
      ]"
    />
  </Flex>
</template>
```
