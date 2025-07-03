/*
 * @Author: masi 2454023350@qq.com
 * @Date: 2025-06-25 15:21:09
 * @LastEditors: masi 2454023350@qq.com
 * @LastEditTime: 2025-07-03 18:08:53
 * @FilePath: \vue-blog\vite.config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: "css", // 使用CSS样式
        }),
      ],
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
    port: 9938,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://47.107.149.197:3000",
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
        target: "http://47.107.149.197:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
