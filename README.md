# 智能图书管理系统

用一句话说：能管书、能借还、能统计，还能让 AI 帮你找书聊书。

---

## 能做什么

**基础业务**

- 图书增删改查、分类、库存状态、导出
- 读者档案、读者类别、有效期、续卡
- 借书、还书、续借、续借审批、逾期统计

**搜索**

- 普通关键词、正则、管理员直接跑 SQL、语义搜索

**AI 部分**

- 流式对话、历史会话、图书推荐、工具调用
- 没有配置 API Key 也没关系，基础功能照常跑

**其他**

- 个人读书笔记 + 公开广场，笔记可以关联到具体书
- JWT 认证、Token 刷新、角色权限、限流、审计日志、通知中心

---

## 技术栈

前端：Vue 3 + TypeScript + Element Plus + Pinia + ECharts
后端：Express.js + TypeScript
数据库：SQLite + better-sqlite3
AI 接入：兼容 OpenAI 协议的 API（国内服务商也行）
构建：Vite、tsx

---

## 本地跑起来

**Windows 开箱即用**

- 直接双击 `start.bat`
- 首次启动会自动准备 Node.js、校验依赖、按需构建前端
- 默认打开 `http://localhost:3000`，如果端口被占用会自动换到附近可用端口
- 需要停止时双击 `stop.bat`

**开发模式**

需要 Node.js 20.x，项目里用 Volta 锁了 20.20.2。

```bash
# 装依赖
npm install
cd web && npm install && cd ..

# 启动（两个终端分别跑）
npm run dev:server
npm run dev:web
```

开发模式下浏览器打开 `http://localhost:3000` 就行。

**AI 配置（可选）**

```bash
copy .env.example .env
# 然后填 OPENAI_API_KEY，不填也能用，AI 那块会提示未配置
```

---

## 账号

- 管理员：`admin / admin123`
- 跑完 `npm run db:generate` 会生成一批测试账号，比如 `teacher001 / 123456`、`student001 / 123456`
- 仓库里自带的 `data/library.db` 已经有演示数据了，直接开

**生成 / 清理测试数据**

```bash
npm run db:generate
npm run db:generate -- --books 500 --readers 200
npm run db:generate -- --seed 12345   # 固定随机种子

npm run db:clear      # 清业务数据
npm run db:clear:all  # 清所有数据
```

---

## 权限

四个角色：`admin` / `librarian` / `teacher` / `student

---

部署说明见 `DEPLOYMENT.md`。
