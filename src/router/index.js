/*
 * @Author: masi 2454023350@qq.com
 * @Date: 2025-06-25 15:30:17
 * @LastEditors: masi 2454023350@qq.com
 * @LastEditTime: 2025-06-26 16:08:47
 * @FilePath: \figmamcp\vue-blog\src\router\index.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";

const routes = [
  {
    path: "/",
    component: () => import("../components/BasicLayout.vue"),
    children: [
      { path: "", component: Home, meta: { menuKey: "home" } },
      {
        path: "ai",
        children: [
          {
            path: "chat",
            component: () => import("../views/AIChat.vue"),
            meta: { menuKey: "ai-chat" },
          },
          {
            path: "chat-test",
            component: () => import("../views/ChatTest.vue"),
            meta: { menuKey: "ai-chat-test" },
          },
          {
            path: "typewriter-test",
            component: () => import("../views/TypewriterTest.vue"),
            meta: { menuKey: "ai-typewriter-test" },
          },
          {
            path: "diagnosis",
            component: () => import("../views/AIDiagnosis.vue"),
            meta: { menuKey: "ai-diagnosis" },
          },
        ],
      },
      {
        path: "post/:id",
        component: () => import("../views/Post.vue"),
        meta: { menuKey: "article-detail" },
      },
      {
        path: "posts",
        component: () => import("../views/PostList.vue"),
        meta: { menuKey: "article-list" },
      },
      { path: "about", component: () => import("../views/About.vue") },
      {
        path: "create",
        component: () => import("../views/CreatePost.vue"),
        meta: { menuKey: "article-create" },
      },
    ],
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
