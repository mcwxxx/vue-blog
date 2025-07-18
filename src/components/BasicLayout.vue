<!--
 * @Author: masi 2454023350@qq.com
 * @Date: 2025-06-26 15:47:19
 * @LastEditors: masi 2454023350@qq.com
 * @LastEditTime: 2025-06-26 19:24:20
 * @FilePath: \vue-blog\src\components\BasicLayout.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup>
import { Layout, Menu, Drawer, Button } from "ant-design-vue";
import { useRouter } from "vue-router";
import { ref, onMounted, onUnmounted } from "vue";
const { Sider, Content } = Layout;

const isMobile = ref(false);
const collapsed = ref(false);
const drawerVisible = ref(false);

const checkIsMobile = () => {
  isMobile.value = window.innerWidth < 768;
  collapsed.value = isMobile.value;
};

onMounted(() => {
  checkIsMobile();
  window.addEventListener("resize", checkIsMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkIsMobile);
});

const toggleDrawer = () => {
  drawerVisible.value = !drawerVisible.value;
};

const router = useRouter();
const handleMenuClick = ({ key }) => {
  switch (key) {
    case "home":
      router.push("/");
      break;
    case "ai-chat":
      router.push("/ai/chat");
      break;
    case "ai-diagnosis":
      router.push("/ai/diagnosis");
      break;
    case "ai-tts-test":
      router.push("/ai/tts-test");
      break;
    case "article-list":
      router.push("/posts");
      if (isMobile.value) drawerVisible.value = false;
      break;
    case "article-detail":
      router.push(`/post/${id}`);
      if (isMobile.value) drawerVisible.value = false;
      break;
    case "article-create":
      router.push("/create");
      break;
  }
};
</script>

<template>
  <Layout class="layout-container flex">
    <!-- 桌面端侧边栏 -->
    <Sider
      v-if="!isMobile"
      class="shadow-md"
      theme="light"
      width="220"
      :collapsed="collapsed"
    >
      <Menu mode="inline" @click="handleMenuClick">
        <Menu.Item key="home">主页</Menu.Item>
        <Menu.SubMenu key="ai" title="AI功能">
          <Menu.Item key="ai-chat">对话区域</Menu.Item>
          <Menu.Item key="ai-diagnosis">问诊区域</Menu.Item>
          <Menu.Item key="ai-tts-test">TTS测试</Menu.Item>
        </Menu.SubMenu>
        <Menu.SubMenu key="article" title="文章管理">
          <Menu.Item key="article-list">文章列表</Menu.Item>
          <Menu.Item key="article-create">添加文章</Menu.Item>
        </Menu.SubMenu>
      </Menu>
    </Sider>

    <!-- 移动端抽屉菜单 -->
    <Drawer v-model:open="drawerVisible" placement="left" width="220">
      <Menu mode="inline" @click="handleMenuClick">
        <Menu.Item key="home">主页</Menu.Item>
        <Menu.SubMenu key="ai" title="AI功能">
          <Menu.Item key="ai-chat">对话区域</Menu.Item>
          <Menu.Item key="ai-diagnosis">问诊区域</Menu.Item>
          <Menu.Item key="ai-tts-test">TTS测试</Menu.Item>
        </Menu.SubMenu>
        <Menu.SubMenu key="article" title="文章管理">
          <Menu.Item key="article-list">文章列表</Menu.Item>
          <Menu.Item key="article-create">添加文章</Menu.Item>
        </Menu.SubMenu>
      </Menu>
    </Drawer>

    <Layout class="main-container">
      <Content class="content-container">
        <div class="content-wrapper">
          <router-view />
        </div>
      </Content>
    </Layout>
  </Layout>
</template>

<style scoped>
.layout-container {
  /* max-height: calc(100vh - 64px + 2rem); */
  display: flex;
}
.sider-container {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
}
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* max-height: calc(100vh - 64px); */
  height: calc(100vh - 144px);
}
.tab-container {
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}
.content-container {
  flex: 1;
  background: #fff;
  /* max-height: calc(100vh - 104px); */
  overflow: auto;
}
.mobile-menu-btn {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 1000;
}
.content-wrapper {
  height: 100%;
}
/* 滚动条样式 */
.content-wrapper::-webkit-scrollbar {
  width: 8px;
}
.content-wrapper::-webkit-scrollbar-track {
  background: transparent;
}
.content-wrapper::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
.content-wrapper::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .main-container {
    margin-left: 0;
  }
  .tab-container {
    padding: 12px 16px;
  }
  .content-container {
    margin-left: 0;
    padding: 16px;
  }
}
</style>
