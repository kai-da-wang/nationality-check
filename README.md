# 国籍鉴定 · 印象签

五颜六色的波普艺术展风格「国籍鉴定」恶搞网页，手机和电脑都能玩。无需后端或 API。

## 玩法

- **呈交照片**：从设备上传 JPG、PNG 或 WebP，或选“没带照片？先审个替身。”
- **本局结论已出**：证书显示“国籍鉴定 / 本官今日钦定 / [趣味结果] / 本官已阅，暂不接受狡辩。”
- **申请重审**：使用同一张照片重新抽选证书。
- **保存高清证书**：生成 1200 × 1600 PNG；另可打印 / 保存 PDF、修改昵称、换照片。
- 证书不包含额外的随机提示、趣味角色设定或底部免责声明。

所有照片都在浏览器本地处理，不传给服务器。国籍结果由随机函数生成，**不识别照片人物的真实国籍**。

## 本地运行

这是一个**单文件静态网站**。下载 `index.html` 后用现代浏览器直接打开，或在项目根目录使用：

```sh
python3 -m http.server 8000
```

浏览器访问 http://localhost:8000。

## GitHub Pages 公开部署

自动部署脚本已经放在 `.github/workflows/pages.yml`。要启用公开访问：

1. 打开本仓库 **Settings → General → Danger Zone → Change repository visibility → Public**，确认公开（请确保没有不想公开的文件）。
2. 打开 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
3. 到 **Actions** 页面运行或重新运行 `Deploy Nationality Check to GitHub Pages` 工作流（`Run workflow` / `Re-run jobs`）。
4. 工作流成功后网页应位于：**https://kai-da-wang.github.io/nationality-check/**。

此链接仅在 Pages 部署成功后可访问；代码推送本身不意味着网页已经公开。

## 文件结构

```text
index.html                     网页本体（CSS 与 JavaScript 均内嵌）
.github/workflows/pages.yml    GitHub Pages 自动部署
README.md                      项目说明
```

## 说明

这是一款娱乐性角色证书生成器，非官方国籍鉴定服务；人物照片不会用于推断真实种族、民族或国籍。
