import { Client } from "ssh2";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 服务器配置
const server = {
  host: "47.107.149.197",
  username: "root",
  password: "Yijiumasi./",
  remotePath: "/var/www/html", // 修改为根目录
};

// 本地构建目录
const localDir = path.join(__dirname, "dist");

// 改进的目录创建函数
const ensureRemoteDir = (sftp, remotePath, callback) => {
  // 处理根目录情况
  if (remotePath === "/" || remotePath === "") {
    return callback();
  }

  // 拆分路径为层级
  const pathSegments = remotePath
    .split("/")
    .filter((segment) => segment !== "");

  // 逐级创建目录
  const createPath = (index = 1) => {
    if (index > pathSegments.length) return callback();

    const currentPath = "/" + pathSegments.slice(0, index).join("/");

    sftp.mkdir(currentPath, { recursive: true }, (err) => {
      if (err && err.code !== 4) {
        console.error(`创建目录 ${currentPath} 失败:`, err);
      }
      createPath(index + 1);
    });
  };

  createPath();
};

console.log("开始连接到服务器...");
const conn = new Client();

conn
  .on("ready", () => {
    console.log("连接成功，开始上传文件...");

    conn.sftp((err, sftp) => {
      if (err) throw err;

      // 递归上传目录
      const uploadDir = (localPath, remotePath) => {
        fs.readdir(localPath, (err, items) => {
          if (err) throw err;

          ensureRemoteDir(sftp, remotePath, () => {
            items.forEach((item) => {
              const localItemPath = path.join(localPath, item);
              // 修复路径转换：Windows路径 -> Linux路径
              const remoteItemPath = path
                .join(remotePath, item)
                .replace(/\\/g, "/");

              fs.stat(localItemPath, (err, stats) => {
                if (err) throw err;

                if (stats.isDirectory()) {
                  uploadDir(localItemPath, remoteItemPath);
                } else {
                  // 上传前确保MIME类型
                  sftp.fastPut(localItemPath, remoteItemPath, (err) => {
                    if (err) {
                      console.error(`上传 ${localItemPath} 失败:`, err);
                    } else {
                      console.log(
                        `✓ ${localItemPath} -> ${remoteItemPath.replace(
                          /\\/g,
                          "/"
                        )}`
                      );
                    }
                  });
                }
              });
            });
          });
        });
      };

      // 开始上传
      uploadDir(localDir, server.remotePath);

      // 完成后重启Nginx
      setTimeout(() => {
        conn.exec("sudo systemctl restart nginx", (err, stream) => {
          if (err) console.error("重启Nginx失败:", err);
          stream.on("close", () => {
            conn.end();
            console.log("所有文件上传完成! Nginx已重启");
            console.log(`前端已部署到: http://${server.host}`);
          });
        });
      }, 3000);
    });
  })
  .connect({
    host: server.host,
    port: 22,
    username: server.username,
    password: server.password,
  });

conn.on("error", (err) => {
  console.error("连接失败:", err);
});
