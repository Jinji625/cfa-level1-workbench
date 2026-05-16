# CFA L1 Sprint Hub | 一级备考冲刺工作台

> 轻量化 CFA 一级备考 AI 工作台，纯前端实现，一键部署 GitHub Pages，所有数据本地存储，隐私零泄露。

---

## 在线预览

将本项目推送到 GitHub 仓库并启用 GitHub Pages 后，即可通过 `https://你的用户名.github.io/仓库名/` 访问。

---

## 核心功能

| 模块 | 功能说明 |
|------|---------|
| **上传中心** | 拖拽上传错题截图、笔记截图、官方讲义 PDF；图片自动 OCR，图片型 PDF 自动整页 OCR |
| **AI 解析** | 内置错题解析 Agent：识别题干→提取考点→分析错因→翻译官方解析→生成结构化卡片；**严格约束仅基于原题内容，不编造** |
| **知识库** | 按 CFA 一级 10 大章节自动归档；错题卡片与公式库双向关联；全文检索 |
| **公式库** | 自动从讲义/错题提取金融公式，LaTeX 渲染，关联错题双向跳转 |
| **冲刺面板** | 考试倒计时、各章节错题分布图表、薄弱章节 TOP5、高频易错公式、阶段化复习策略（考前 2 月/1 月/1 周自动切换） |
| **数据管理** | JSON 导入/导出备份、配置 AI API Key、设置考试日期 |

---

## 部署到 GitHub Pages（3 分钟）

### 方式一：GitHub Actions 自动部署（推荐）

1. **创建仓库**：在 GitHub 新建一个公开仓库，例如 `cfa-l1-hub`
2. **上传代码**：将本文件夹内所有文件上传到仓库根目录（保留 `.github/workflows/pages.yml`）
3. **启用 Pages**：
   - 进入仓库 `Settings` → `Pages`
   - `Source` 选择 `GitHub Actions`
4. **完成**：推送代码后 Actions 自动运行，约 1 分钟后即可访问 `https://你的用户名.github.io/cfa-l1-hub/`

### 方式二：传统分支部署

1. 上传代码到仓库 `main` 分支
2. `Settings` → `Pages` → `Source` 选择 `Deploy from a branch`
3. 选择 `main` 分支，`/(root)` 目录
4. 点击 Save，等待 1 分钟即可访问

---

## 使用指南

### 第一步：配置 AI 解析（强烈建议）

进入 **设置** 页面：
- **API 类型**：支持 OpenAI、DeepSeek、Kimi（月之暗面）、自定义兼容接口
- **API Key**：填入你的 Key（仅保存在浏览器本地 IndexedDB，不会上传）

**各平台配置对照：**

| 平台 | API 类型 | 默认接口地址 | 推荐模型 |
|------|---------|-------------|---------|
| OpenAI | `OpenAI` | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` |
| DeepSeek | `DeepSeek` | `https://api.deepseek.com/v1/chat/completions` | `deepseek-chat` |
| **Kimi** | **`Kimi`** | **`https://api.moonshot.cn/v1/chat/completions`** | **`moonshot-v1-8k`** |

> 选择对应类型后，系统会自动填入默认接口地址和模型名，您只需填入 **API Key** 即可。Kimi 的 API Key 请前往 [platform.moonshot.cn](https://platform.moonshot.cn) 获取。

> 未配置 API Key 时，系统提供演示模式，可体验全部流程，但解析结果为示例数据。

### 第二步：设置考试日期

在 **设置** 中修改考试日期，默认已设为当年 8 月 CFA 考季。

### 第三步：上传资料

在 **上传中心**：
- 拖拽或点击上传错题截图、笔记截图、PDF 讲义
- 系统自动 OCR → AI 解析 → 自动归档到对应章节
- 处理队列实时显示进度

### 第四步：查看知识库

在 **知识库**：
- 左侧切换「错题库」/「公式库」
- 按章节筛选浏览
- 点击卡片查看详情，错题与公式双向跳转

### 第五步：冲刺复盘

在 **冲刺面板**：
- 实时倒计时 + 当前阶段策略提醒
- 各章节错题分布柱状图
- 薄弱章节 TOP5 + 高频易错公式
- 今日复习建议（基于个人数据生成）

---

## 技术栈

- **纯前端**：HTML5 + CSS3 + Vanilla JS（ES6+），零构建工具
- **数据存储**：IndexedDB（Dexie.js 封装），全部数据保存在浏览器本地
- **OCR**：Tesseract.js（浏览器端运行，无需后端）
- **PDF 处理**：PDF.js（文本提取 + 图片型 PDF 渲染后 OCR）
- **公式渲染**：KaTeX
- **图表**：Chart.js
- **图标**：Phosphor Icons
- **AI 接口**：OpenAI 兼容格式（用户自配 Key，直连模型厂商）

---

## 隐私与安全

- ✅ **所有数据本地存储**：错题、公式、笔记、API Key 均仅存于浏览器 IndexedDB
- ✅ **无后端服务器**：纯静态页面，GitHub Pages 仅托管前端文件
- ✅ **AI 直连**：API 调用从前端直接发往 OpenAI/DeepSeek，不经过第三方中转
- ✅ **可完全离线使用**：上传和知识库浏览在无网络环境下正常工作（AI 解析需联网）
- ✅ **数据可导出**：支持 JSON 完整备份，可随时迁移或恢复

---

## 项目结构

```
cfa-level1-workbench/
├── index.html                  # 主入口（SPA 单页面）
├── css/
│   └── style.css               # 全部样式
├── js/
│   ├── db.js                   # IndexedDB 数据层（错题/公式/设置）
│   ├── ai-service.js           # AI 解析服务（OpenAI/DeepSeek 兼容）
│   ├── ocr.js                  # Tesseract.js OCR 封装
│   ├── pdf-handler.js          # PDF.js 文本提取与图片型 PDF OCR
│   ├── formula.js              # 公式管理与双向关联
│   ├── dashboard.js            # 冲刺面板统计与图表
│   └── app.js                  # 主应用逻辑、路由、交互
├── .github/
│   └── workflows/
│       └── pages.yml           # GitHub Actions 自动部署配置
└── README.md
```

---

## CFA 一级章节体系

系统内置 CFA Level 1 十大科目，上传资料自动归类：

1. 道德与职业标准 (Ethics)
2. 定量方法 (Quant)
3. 经济学 (Econ)
4. 财务报表分析 (FSA)
5. 公司发行人 (Corporate)
6. 权益投资 (Equity)
7. 固定收益 (Fixed)
8. 衍生品 (Derivatives)
9. 另类投资 (Alt)
10. 投资组合管理 (PM)

---

## 自定义与扩展

- **修改配色**：编辑 `css/style.css` 中 `:root` 变量
- **添加章节**：修改 `js/db.js` 中的 `CFA_CHAPTERS` 数组
- **调整冲刺阶段逻辑**：修改 `js/dashboard.js` 中的 `getPhase()` 方法
- **更换 OCR 语言**：修改 `js/ocr.js` 中 `Tesseract.createWorker` 的语言参数

---

## License

MIT — 自由使用、修改、部署。

> **免责声明**：本项目为个人备考辅助工具，与 CFA Institute 官方无关。AI 解析结果仅供参考，请始终以官方教材和考纲为准。
