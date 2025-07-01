import { Client } from "basic-ftp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ftpConfig = {
  host: "39.98.177.199",
  port: 3000,
  user: "root",
  password: "P5XHNezrhEYNjnZw",
  secure: false, // 根据服务器配置，如果支持FTPS，可以设置为true或 'implicit'
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localBasePath = path.join(__dirname, "dist");
const remoteBasePath = "/"; // 上传到FTP服务器的根目录，或者指定一个子目录，例如 '/htdocs/myapp'

async function uploadDirectory(client, localPath, remotePath) {
  const entries = fs.readdirSync(localPath, { withFileTypes: true });

  for (const entry of entries) {
    const currentLocalPath = path.join(localPath, entry.name);
    const currentRemotePath = path
      .join(remotePath, entry.name)
      .replace(/\\/g, "/"); // 确保远程路径使用正斜杠

    if (entry.isDirectory()) {
      try {
        await client.ensureDir(currentRemotePath);
        console.log(`Created remote directory: ${currentRemotePath}`);
      } catch (dirError) {
        // 如果目录已存在，ensureDir可能会报错，可以根据错误类型判断是否忽略
        if (dirError.code !== 550) {
          // 550通常表示文件/目录不存在或权限问题，但有时也用于已存在的情况
          console.error(
            `Error creating remote directory ${currentRemotePath}:`,
            dirError
          );
          // 根据实际情况决定是否继续
        }
      }
      await uploadDirectory(client, currentLocalPath, currentRemotePath);
    } else if (entry.isFile()) {
      try {
        await client.uploadFrom(currentLocalPath, currentRemotePath);
        console.log(`Uploaded: ${currentLocalPath} to ${currentRemotePath}`);
      } catch (uploadError) {
        console.error(
          `Error uploading file ${currentLocalPath} to ${currentRemotePath}:`,
          uploadError
        );
      }
    }
  }
}

async function main() {
  const client = new Client();
  client.ftp.verbose = true; // 开启详细日志，方便调试

  try {
    console.log(`Connecting to FTP server: ${ftpConfig.host}...`);
    await client.access(ftpConfig);
    console.log("FTP connection successful.");

    // 确保基础远程目录存在
    if (remoteBasePath !== "/" && remoteBasePath !== "") {
      try {
        await client.ensureDir(remoteBasePath);
        console.log(`Ensured remote base directory: ${remoteBasePath}`);
      } catch (dirError) {
        if (dirError.code !== 550) {
          console.error(
            `Error creating remote base directory ${remoteBasePath}:`,
            dirError
          );
          client.close();
          return;
        }
      }
    }

    console.log(
      `Starting upload from ${localBasePath} to ${remoteBasePath}...`
    );
    await uploadDirectory(client, localBasePath, remoteBasePath);
    console.log("Upload finished.");
  } catch (err) {
    console.error("FTP operation failed:", err);
  } finally {
    if (!client.closed) {
      client.close();
      console.log("FTP connection closed.");
    }
  }
}

main();
