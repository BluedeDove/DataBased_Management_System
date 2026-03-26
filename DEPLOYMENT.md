# 智能图书管理系统 - B/S Web应用

## 快速启动指南

### 环境要求
- Node.js 20.x 或更高版本
- npm 10.x 或更高版本

### Windows 用户

1. 双击运行 `start.bat`
2. 等待依赖安装和服务器启动
3. 浏览器将自动打开 http://localhost:3000

### Mac/Linux 用户

```bash
chmod +x start.sh
./start.sh
```

### 手动启动

```bash
# 1. 安装后端依赖并启动
cd server
npm install
npm run dev

# 2. 新开终端，安装前端依赖并启动
cd web
npm install
npm run dev

# 3. 访问 http://localhost:3000
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

## 常见问题

### Q: 登录后页面空白?
A: 检查浏览器控制台是否有CORS错误，确保后端服务正在运行。

### Q: 数据库在哪里?
A: SQLite数据库文件位于 `server/data/library.db`

### Q: 如何重置数据库?
A: 删除 `server/data/library.db` 文件，重启服务器会自动创建新数据库。

## 联系方式

如有问题，请联系开发者。
