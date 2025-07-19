/*
 * @Author: masi 2454023350@qq.com
 * @Date: 2025-06-25 15:21:09
 * @LastEditors: masi 2454023350@qq.com
 * @LastEditTime: 2025-07-19 19:05:45
 * @FilePath: \vue-blog\vite.config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from "vite";
import { resolve } from "path";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [
    vue(),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: "css", // 使用CSS样式
        }),
        // 手动配置 ant-design-x-vue 组件自动导入
        (componentName) => {
          if (
            componentName.startsWith("X") ||
            [
              "Bubble",
              "BubbleList",
              "Sender",
              "Prompts",
              "Conversations",
              "Welcome",
              "Attachments",
              "Suggestion",
            ].includes(componentName)
          ) {
            return {
              name: componentName,
              from: "ant-design-x-vue",
            };
          }
        },
      ],
      dts: true, // 生成类型声明文件
    }),
  ],
  base: "/", // 恢复根路径
  build: {
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name].[ext]",
        chunkFileNames: "assets/[name].js",
        entryFileNames: "assets/[name].js",
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://39.96.193.106:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://39.96.193.106/:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
