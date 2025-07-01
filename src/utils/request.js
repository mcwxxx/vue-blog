/*
 * @Author: masi 2454023350@qq.com
 * @Date: 2025-06-26 14:01:53
 * @LastEditors: masi 2454023350@qq.com
 * @LastEditTime: 2025-06-26 14:02:17
 * @FilePath: \vue-blog\src\utils\request.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 统一请求封装
 * @param {string} url 请求路径
 * @param {object} options 请求选项
 * @returns {Promise} 响应结果
 */
export default async function request(url, options = {}) {
  try {
    // 添加 API 基础路径
    const fullUrl = `${import.meta.env.VITE_API_BASE_URL || ""}${url}`;

    // 设置默认请求头
    const defaultHeaders = {
      "Content-Type": "application/json",
    };

    // 合并选项
    const mergedOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    };

    const response = await fetch(fullUrl, mergedOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `请求失败: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("请求错误:", error);
    throw error;
  }
}
