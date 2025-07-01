/*
 * @Author: masi 2454023350@qq.com
 * @Date: 2025-06-25 15:21:09
 * @LastEditors: masi 2454023350@qq.com
 * @LastEditTime: 2025-06-25 15:29:57
 * @FilePath: \figmamcp\vue-blog\src\main.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createApp } from "vue";
import "./assets/main.css";
import App from "./App.vue";
import router from "./router";

createApp(App).use(router).mount("#app");
