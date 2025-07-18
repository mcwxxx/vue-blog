# AIChat.vue 修复补丁

## 问题描述

在 AIChat.vue 中，当点击朗读按钮时提示"无文本"，但实际上控制台已经打印了消息内容。这个问题可能是因为 onListen 函数中的参数处理有误。

## 修复步骤

1. 首先，在 AIChat.vue 文件顶部的 import 部分添加以下导入语句：

```javascript
import fixedOnListen from "../utils/ttsFixedListener";
```

2. 然后，替换原有的 onListen 函数实现为以下代码：

```javascript
// TTS 相关功能
function onListen(info: any) {
  // 使用修复版的onListen函数
  fixedOnListen(
    info,
    tts.value,
    {
      currentPlayingMessageId: currentPlayingMessageId.value,
      ttsStatus: ttsStatus.value,
    },
    message,
    (newState) => {
      // 更新状态
      if (newState.currentPlayingMessageId !== undefined) {
        currentPlayingMessageId.value = newState.currentPlayingMessageId;
      }
    }
  );
}
```

3. 保留原有的 processTTSRequest 函数，因为它仍然会被 watch 函数使用。

## 修复原理

1. 修复版的 onListen 函数更加健壮，能够正确处理各种类型的输入参数。
2. 增加了更详细的日志记录，帮助诊断问题。
3. 改进了纯文本提取函数，确保即使在复杂的 Markdown 文本中也能提取出有效的文本内容。
4. 添加了更多的错误检查和处理，确保在各种情况下都能给用户提供有意义的反馈。

## 测试方法

1. 在 AIChat.vue 中实现上述修改。
2. 重新加载页面，并尝试点击 AI 消息旁边的朗读按钮。
3. 观察控制台日志，确认文本内容被正确提取和处理。
4. 验证语音播放是否正常工作。

## 注意事项

- 确保 ttsService 已正确初始化。
- 确保 WebSocket URL 已设置为正确的线上地址。
- 如果仍然遇到问题，可以尝试在控制台中打印更多的调试信息，以便进一步诊断问题。
