<script setup lang="ts">
import { computed } from 'vue';
import { Button, Space, Popover, message } from 'ant-design-vue';
import { Conversations } from 'ant-design-x-vue';
import {
  PlusOutlined,
  CommentOutlined,
  CloseOutlined,
} from '@ant-design/icons-vue';
import { h } from 'vue';
import { theme } from 'ant-design-vue';

// 定义会话类型
export interface SessionItem {
  key: string;
  label: string;
  group?: string;
}

// 定义 Props
interface Props {
  title?: string;
  sessionList?: SessionItem[];
  currentSession?: string;
  isRequesting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '✨ AI Copilot',
  sessionList: () => [],
  currentSession: '',
  isRequesting: false,
});

// 定义 Emits
interface Emits {
  newConversation: [];
  switchConversation: [conversationId: string];
  closeChat: [];
  createSession: [];
}

const emit = defineEmits<Emits>();

// 创建新会话
const handleCreateSession = () => {
  if (props.isRequesting) {
    message.error(
      'Message is Requesting, you can create a new conversation after request done or abort it right now...'
    );
    return;
  }
  
  console.log('[ChatHeader] 创建新会话');
  emit('createSession');
};

// 切换会话
const handleChangeSession = (sessionKey: string) => {
  console.log('[ChatHeader] 切换会话:', sessionKey);
  emit('changeSession', sessionKey);
};

// 关闭聊天
const handleClose = () => {
  console.log('[ChatHeader] 关闭聊天');
  emit('close');
};

// 转换会话列表，标记当前会话
const conversationItems = computed(() => 
  props.sessionList.map((item) => 
    item.key === props.currentSession
      ? { ...item, label: `[current] ${item.label}` }
      : item
  )
);

// 样式
const { token } = theme.useToken();
const styles = computed(() => ({
  chatHeader: {
    height: '52px',
    boxSizing: 'border-box' as const,
    borderBottom: `1px solid ${token.value.colorBorder}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 10px 0 16px',
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: '15px',
  },
  headerButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  conversations: {
    width: '300px',
    '& .ant-conversations-list': {
      paddingInlineStart: 0,
    },
  },
}));
</script>

<template>
  <div :style="styles.chatHeader">
    <!-- 标题 -->
    <div :style="styles.headerTitle">{{ title }}</div>
    
    <!-- 操作按钮 -->
    <Space :size="0">
      <!-- 新建会话 -->
      <Button
        type="text"
        :icon="h(PlusOutlined)"
        :style="styles.headerButton"
        :disabled="isRequesting"
        @click="handleCreateSession"
      />
      
      <!-- 会话列表 -->
      <Popover
        placement="bottom"
        :overlay-style="{ padding: 0, maxHeight: 600 }"
      >
        <template #content>
          <Conversations
            :items="conversationItems"
            :active-key="currentSession"
            groupable
            :styles="{
              ...styles.conversations,
              item: { padding: '0 8px' },
            }"
            @active-change="handleChangeSession"
          />
        </template>
        <Button
          type="text"
          :icon="h(CommentOutlined)"
          :style="styles.headerButton"
        />
      </Popover>
      
      <!-- 关闭按钮 -->
      <Button
        type="text"
        :icon="h(CloseOutlined)"
        :style="styles.headerButton"
        @click="handleClose"
      />
    </Space>
  </div>
</template>