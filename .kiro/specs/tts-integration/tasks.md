# 实施计划

- [ ] 1.创建 TTS 服务模块

- 为 TTS 功能创建独立的服务模块
- 实现 WebSocket 连接管理
- 实现文本到语音转换和音频播放
- _Requirements：2.1、2.2_

- [x] 1.1 创建基本服务结构

- 创建 'src/utils/ttsService.js' 文件
- 定义模块 API（init、connect、disconnect、speak、stop）
- 实现连接和播放的状态管理
- _Requirements：2.1、2.2_

- [x] 1.2 实现 WebSocket 连接处理

- 新增连接 TTS WebSocket 服务器的函数
- 处理连接事件（打开、关闭、错误）
- 实施状态变更通知
- _Requirements：1.5、2.1_

- [x] 1.3 实现文本到语音的转换

- 添加向 TTS 服务器发送文本的功能
- 处理传入的音频数据块
- 从接收的数据创建音频 blob
- _Requirements：1.1、2.2_

- [x] 1.4 实现音频播放控件

- 创建音频播放器实例
- 添加播放、暂停和停止功能
- 处理播放事件（已结束、错误）
- _Requirements：1.3、1.4_

- [ ] 1.5 添加错误处理

- 实施全面的错误处理
- 提供有意义的错误消息
- 为失败的连接添加重试功能
- _Requirements：1.5_

- [-] 2.将 TTS 服务与 AIChat 组件集成

- 修改 AIChat.vue 以使用 TTS 服务
- 为 TTS 功能添加 UI 元素
- _Requirements：1.1、1.2、1.3、1.4_

- [x] 2.1 导入和初始化 TTS 服务

- 在 AIChat.vue 中导入 TTS 服务模块
- 使用适当的回调初始化服务
- 处理组件生命周期（挂载、卸载）
- _Requirements：2.2、2.3_
-

- [ ] 2.2 在 AI 消息中添加“Listen”按钮

- 修改 AI 消息页脚以包含 Listen 按钮
- 为按钮添加图标和提示框
- _Requirements：1.1_

- [x] 2.3 实现文本提取和 TTS 触发

- 从 AI 响应中提取纯文本（删除 Markdown）
- 实现处理程序以在按钮单击时触发 TTS
- 在 TTS 处理过程中显示加载指示器
- _Requirements：1.1、1.2_

- [x] 2.4 添加播放状态指示器

- 在按钮上显示播放/暂停状态
- 根据播放状态更新 UI
- _Requirements：1.3、1.4_

- [x] 3.测试和优化

- 测试 TTS 功能
- 修复任何问题并优化实施
- _Requirements：1.1、1.2、1.3、1.4、1.5_

- [x] 3.1 使用各种 AI 响应进行测试

- 使用短响应和长响应进行测试
- 使用包含特殊字符的响应进行测试
- 使用包含代码块的响应进行测试
- _Requirements：1.1_

- [x] 3.2 测试错误处理

- 使用服务器连接故障进行测试
- 使用无效的文本输入进行测试
- 验证错误消息是否显示正确
- _Requirements：1.5_

- [x] 3.3 优化性能

- 优化 WebSocket 连接管理
- 改进了大型响应的音频数据处理
- _Requirements：2.1、2.2_
