# CareerDesk

本地运行的个人职业工作台。在自己的电脑上记录项目事实、对照岗位 JD，再导出投递简历。事实、JD 和简历都留在本机 SQLite 里。只有点击提炼、匹配或合并时，相关文本才会发往你配置的模型服务。

界面是中文。许可证是 MIT。

## 启动

需要 Node.js 20。

复制 `.env.example` 为 `.env.local`，然后执行：

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:3000 。第一次启动是空库，可以在项目页导入虚构示例。

Windows 上如果 `better-sqlite3` 编译失败，先安装 Visual Studio Build Tools 的“使用 C++ 的桌面开发”，再重新执行 `npm install`。

## 模型

默认对接 DeepSeek 的 OpenAI 兼容接口。在 `.env.local` 中填写：

```bash
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_API_KEY=你的 DeepSeek 密钥
OPENAI_MODEL=deepseek-chat
```

`OPENAI_BASE_URL` 可以写成 `https://api.deepseek.com` 或 `https://api.deepseek.com/v1`。未填写 `OPENAI_MODEL` 时使用 `deepseek-chat`。`deepseek-chat` 会要求模型返回 JSON；`deepseek-reasoner` 不使用 JSON 模式。

其他兼容 OpenAI Chat Completions 的服务，改这三项即可。不填写密钥时，看板、编辑、Markdown 导出和 PDF 打印仍然可用。提炼、关键词和合并候选句会提示未配置模型。

`AI_PROVIDER=fake` 使用本地假模型，不访问网络，只适合开发和测试。

## 数据

数据库文件在 `DATA_DIR`（默认 `./data`）下的 `careerdesk.sqlite`。侧栏可以导出或导入全量 JSON。

匹配分由规则计算：关键词是否出现在标签、事实或简历句里，再按项目状态加权（已完成 1、进行中 0.7、计划中 0.35）。模型不直接给出百分比。

## 测试

```bash
npm test
```

## 文档

- [产品需求](docs/requirements/product.md)
- [开源交付需求](docs/requirements/delivery.md)
- [技术方案](docs/careerdesk-mvp-design.md)
