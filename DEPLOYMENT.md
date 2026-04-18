# 智能图书管理系统 - B/S Web应用

## 快速启动指南

### 环境要求
- Windows 双击 `start.bat` 时可以不预装 Node.js，脚本会优先复用现有环境，必要时自动准备便携版 Node.js
- 如果要手动开发，建议 Node.js 20.x + npm 10.x

### Windows 用户

1. 双击运行 `start.bat`
2. 等待脚本校验依赖、按需构建前端并启动服务
3. 浏览器将自动打开 `http://localhost:3000`（如果 3000 被占用，会自动切换到附近空闲端口）
4. 需要关闭时双击 `stop.bat`

### Mac/Linux 用户

```bash
chmod +x start.sh
./start.sh
```

### 手动启动

```bash
# 1. 安装根依赖
npm install

# 2. 安装前端依赖
cd web
npm install
cd ..

# 3. 新开两个终端分别启动
npm run dev:server
npm run dev:web

# 4. 访问 http://localhost:3000
```

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 系统管理员 |
| librarian | lib123 | 图书管理员 |
| teacher | teach123 | 教师 |
| student | stu123 | 学生 |

## 项目结构

```
project/
├── server/          # 后端 Express.js 服务器
│   ├── src/
│   │   ├── app.ts         # Express 应用配置
│   │   ├── server.ts      # 服务器入口
│   │   ├── routes/        # API 路由
│   │   ├── controllers/   # 控制器
│   │   ├── middleware/    # 中间件 (JWT认证等)
│   │   ├── domains/       # 业务服务层
│   │   └── database/      # 数据库层
│   └── package.json
│
├── web/             # 前端 Vue 3 应用
│   ├── src/
│   │   ├── views/         # 页面组件
│   │   ├── components/    # 公共组件
│   │   ├── api/           # HTTP API 调用层
│   │   ├── store/         # Pinia 状态管理
│   │   └── router/        # 路由配置
│   └── package.json
│
├── start.bat        # Windows 启动脚本
├── start.sh         # Linux/Mac 启动脚本
└── DEPLOYMENT.md    # 本文档
```

## API 端点

| 模块 | 端点 | 描述 |
|------|------|------|
| 认证 | POST /api/v1/auth/login | 用户登录 |
| 认证 | POST /api/v1/auth/logout | 用户登出 |
| 认证 | GET /api/v1/auth/validate | 验证Token |
| 图书 | GET /api/v1/books | 获取图书列表 |
| 图书 | POST /api/v1/books | 创建图书 |
| 图书 | PUT /api/v1/books/:id | 更新图书 |
| 读者 | GET /api/v1/readers | 获取读者列表 |
| 借阅 | POST /api/v1/borrowings | 借书 |
| 借阅 | PUT /api/v1/borrowings/:id/return | 还书 |

## 生产部署

### 构建前端
```bash
cd web
npm run build
# 产物在 web/dist/ 目录
```

### 使用 PM2 部署后端
```bash
cd server
npm install --production
pm2 start dist/server.js --name library-api
```

### Nginx 配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }

    location / {
        root /var/www/library/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

## 内网穿透 (用于演示)

使用 ngrok 暴露本地服务:
```bash
ngrok http 3001
# 将生成的公网地址配置到 web/.env 的 VITE_API_BASE_URL
```

## 技术栈

- **前端**: Vue 3 + Vite + Element Plus + Pinia
- **后端**: Express.js + TypeScript
- **数据库**: SQLite (better-sqlite3)
- **认证**: JWT (JSON Web Token)
- **安全**: CORS, Helmet

---

