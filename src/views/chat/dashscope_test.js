/*
 * @Author: masi 2454023350@qq.com
 * @Date: 2025-07-03 10:53:26
 * @LastEditors: masi 2454023350@qq.com
 * @LastEditTime: 2025-07-03 10:53:54
 * @FilePath: \blog-backend\test\dashscope_test.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const axios = require("axios");
require("dotenv").config();

async function callDashScope() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const appId = process.env.DASHSCOPE_APP_ID;

  if (!apiKey || !appId) {
    console.error("请检查.env文件中的DASHSCOPE_API_KEY和DASHSCOPE_APP_ID配置");
    return;
  }

  const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;

  const data = {
    input: {
      prompt: "你是谁？",
    },
    parameters: {
      incremental_output: true,
    },
    debug: {},
  };

  try {
    console.log("正在发送请求到DashScope API...");
    console.log(`使用App ID: ${appId}`);

    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-SSE": "enable",
      },
      responseType: "stream",
    });

    if (response.status === 200) {
      console.log("请求成功，开始接收流式响应:");
      response.data.on("data", (chunk) => {
        const str = chunk.toString();
        if (str.includes('"text":')) {
          try {
            const data = JSON.parse(str.split("data:")[1]);
            console.log(`收到内容: ${JSON.stringify(data, null, 2)}`);
          } catch (e) {
            console.log(`收到原始数据: ${str}`);
          }
        } else {
          console.log(`收到数据: ${str}`);
        }
      });
    } else {
      console.log("请求失败:");
      console.log(`状态码: ${response.status}`);
      if (response.data) {
        console.log(`响应数据: ${JSON.stringify(response.data, null, 2)}`);
      }
    }
  } catch (error) {
    console.error("调用DashScope API出错:");
    if (error.response) {
      console.error(`响应状态: ${error.response.status}`);
      console.error(
        `响应数据: ${JSON.stringify(error.response.data, null, 2)}`
      );
    } else {
      console.error(error.message);
    }
  }
}

callDashScope();
