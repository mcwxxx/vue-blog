<template>
  <Button
    :type="type"
    :size="size"
    :disabled="disabled"
    :loading="loading"
    :danger="variant === 'danger'"
    @click="$emit('click')"
  >
    <template #icon v-if="icon">
      <component :is="iconComponent" />
    </template>
    <slot />
  </Button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Button } from "ant-design-vue";
import {
  CopyOutlined,
  ReloadOutlined,
  StopOutlined,
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  LikeOutlined,
  DislikeOutlined,
} from "@ant-design/icons-vue";

interface Props {
  icon?:
    | "copy"
    | "refresh"
    | "stop"
    | "clear"
    | "delete"
    | "edit"
    | "like"
    | "dislike";
  type?: "primary" | "default" | "dashed" | "text" | "link";
  size?: "large" | "middle" | "small";
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "danger";
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  size: "middle",
  disabled: false,
  loading: false,
  variant: "default",
});

defineEmits<{
  click: [];
}>();

const iconComponent = computed(() => {
  const iconMap = {
    copy: CopyOutlined,
    refresh: ReloadOutlined,
    stop: StopOutlined,
    clear: ClearOutlined,
    delete: DeleteOutlined,
    edit: EditOutlined,
    like: LikeOutlined,
    dislike: DislikeOutlined,
  };
  return props.icon ? iconMap[props.icon] : null;
});
</script>
