# 国籍鉴定

面向手机的恶搞角色证书生成器，采用撞色艺术海报风格。

公开体验：https://parallel-passport-kai.imjusttrying341.chatgpt.site

上传照片后自动进入第二页生成证书，支持保存 PNG、修改昵称、重新抽签，以及通过浏览器打印为 PDF。

## 部署

这是纯静态网站，无须后端、数据库、API Key 或构建步骤。将 `dist/` 设为网站根目录即可部署。

本地预览需要 Python 3：

```bash
python3 -m http.server 8000 --directory dist
```

然后打开 `http://localhost:8000`。

## 功能

- 本机处理 JPG、PNG、WebP 图片，支持拖放，最大 15 MB。
- 手机优先的两屏流程与底部保存按钮。
- 1200 × 1600 高清 PNG，以及打印 / PDF 导出。
- 日本角色默认 70% 权重，可在编辑面板调整。
- 昵称编辑、重抽、返回取消和减少动画偏好支持。
- 自带中文字库。

## 结果的含义

本项目用于随机角色创作，照片只作插图。抽签函数不接收照片、面部特征或个人属性，不识别真实国籍。图片仅保存在页面内存中，不上传服务器。

海报含有“娱乐角色作品 / CHARACTER ART”展签，不是官方文件。

## 测试

需要 Node.js 22 或更新版本：

```bash
npm install
npm test
```

测试覆盖加权抽签、文字边界、字库与证书渲染，以及上传、生成、编辑、下载、打印和返回取消的逻辑。

字体基于 Noto Sans SC 合并并重命名为 Parallel Sans，适用 SIL Open Font License，见 `dist/fonts/OFL.txt`。
