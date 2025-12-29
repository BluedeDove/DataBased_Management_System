# 广工元素美化计划

## 项目概述
为智能图书管理系统添加广东工业大学（广工）相关元素，包括校徽图标和主题色，同时保持现有的毛玻璃风格和现代简约设计。

## 设计原则
- **保持现有风格**：不破坏现有的毛玻璃效果和现代简约设计
- **适度添加**：广工元素点缀，不过度使用
- **协调统一**：广工元素与现有UI风格自然融合

## 广工主题色
- 广工红：`#E60012`（主要强调色）
- 广工蓝：`#0056b3`（辅助色）
- 现有主色：`#6366f1`（Indigo，保留作为主色）

## 资源准备

### 1. 创建图片资源目录
```
public/images/
├── gdut-logo.jpg          # 广工校徽（原始尺寸）
├── gdut-logo-sm.jpg       # 广工校徽（小尺寸 32x32）
└── gdut-logo-xs.jpg       # 广工校徽（超小尺寸 24x24）
```

### 2. 广工校徽来源
- 原始链接：https://www.gdut.edu.cn/__local/3/C3/9F/801A80A5725DCD34C5E62C95E6B_E6F75E67_FEA5.jpg

## 修改计划

### 1. 全局样式 (src/renderer/src/styles/index.css)

#### 修改内容
```css
:root {
  /* 现有颜色保持不变 */
  --primary-color: #6366f1;
  --primary-hover: #4f46e5;
  --primary-light: #818cf8;

  /* 新增广工主题色 */
  --gdut-red: #E60012;
  --gdut-red-light: #ff3344;
  --gdut-red-dark: #cc000f;
  --gdut-blue: #0056b3;
  --gdut-blue-light: #3385d6;
}
```

#### 新增广工元素样式类
```css
/* 广工主题渐变 */
.gdut-gradient {
  background: linear-gradient(135deg, var(--gdut-red), var(--gdut-blue));
}

/* 广工装饰边框 */
.gdut-border {
  border-left: 3px solid var(--gdut-red);
}

/* 广工图标容器 */
.gdut-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(230, 0, 18, 0.1), rgba(0, 86, 179, 0.1));
  border-radius: 8px;
  padding: 8px;
}
```

---

### 2. 侧边栏布局 (src/renderer/src/components/Layout.vue)

#### 修改内容
- 在 `.logo-area` 中添加广工校徽图标
- 在应用名称旁添加"广工"字样

#### 模板修改
```vue
<div class="logo-area">
  <img src="/images/gdut-logo-sm.jpg" alt="广工校徽" class="gdut-logo" />
  <div class="brand-text">
    <span class="app-name">智能图书馆</span>
    <span class="gdut-badge">广工</span>
  </div>
</div>
```

#### 样式修改
```css
.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 16px;
}

.gdut-logo {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  object-fit: contain;
}

.brand-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.app-name {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.gdut-badge {
  font-size: 10px;
  color: var(--gdut-red);
  font-weight: 600;
  letter-spacing: 1px;
}
```

---

### 3. 登录页面 (src/renderer/src/views/Login.vue)

#### 修改内容
- 在 `.brand` 区域添加广工校徽
- 添加广工主题色装饰元素

#### 模板修改
```vue
<div class="login-left">
  <div class="brand">
    <img src="/images/gdut-logo.jpg" alt="广工校徽" class="gdut-logo-large" />
    <h1>LMS</h1>
    <p>智能图书管理系统</p>
    <div class="gdut-tagline">广东工业大学</div>
  </div>
</div>
```

#### 样式修改
```css
.gdut-logo-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.3);
  margin-bottom: 20px;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.1);
}

.gdut-tagline {
  margin-top: 16px;
  font-size: 14px;
  opacity: 0.9;
  font-weight: 500;
  letter-spacing: 2px;
}

/* 添加广工红装饰线条 */
.login-left::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: var(--gdut-red);
  border-radius: 2px;
}
```

---

### 4. 图书管理页面 (src/renderer/src/views/Books.vue)

#### 修改内容
- 将 `.book-cover-mock` 替换为广工校徽图标
- 在页面标题区域添加广工元素装饰

#### 模板修改
```vue
<div class="action-bar">
  <div class="title-group">
    <h2 class="page-title">图书库</h2>
    <div class="gdut-decoration"></div>
    <span class="sub-text">管理全馆 {{ total }} 本藏书</span>
  </div>
  <div class="actions">
    <!-- 按钮保持不变 -->
  </div>
</div>

<!-- 图书信息单元格 -->
<div class="book-info-cell">
  <img src="/images/gdut-logo-xs.jpg" alt="广工校徽" class="book-cover-icon" />
  <div>
    <div class="title" v-html="highlightText(row.book_title)"></div>
    <div class="isbn">ISBN: <span v-html="highlightText(row.isbn)"></span></div>
  </div>
</div>
```

#### 样式修改
```css
.title-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gdut-decoration {
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, var(--gdut-red), var(--gdut-blue));
  border-radius: 2px;
}

.book-cover-icon {
  width: 48px;
  height: 64px;
  border-radius: 6px;
  object-fit: contain;
  padding: 8px;
  background: linear-gradient(135deg, rgba(230, 0, 18, 0.05), rgba(0, 86, 179, 0.05));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
```

---

### 5. 仪表板页面 (src/renderer/src/views/Dashboard.vue)

#### 修改内容
- 在页面标题旁添加广工元素装饰
- 在统计卡片中添加广工色点缀

#### 模板修改
```vue
<div class="page-header">
  <div class="header-content">
    <h2 class="page-title">{{ dashboardTitle }}</h2>
    <div class="gdut-accent"></div>
  </div>
  <p class="text-secondary">欢迎回来，每一天都是阅读的好日子。</p>
</div>
```

#### 样式修改
```css
.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.gdut-accent {
  width: 4px;
  height: 32px;
  background: linear-gradient(180deg, var(--gdut-red), var(--gdut-blue));
  border-radius: 2px;
}
```

---

### 6. 统计分析页面 (src/renderer/src/views/Statistics.vue)

#### 修改内容
- 在页面标题区域添加广工元素
- 统计卡片使用广工色点缀

#### 模板修改
```vue
<div class="page-header">
  <div class="title-wrapper">
    <h1 class="page-title">统计分析</h1>
    <div class="gdut-line"></div>
  </div>
  <p class="page-description">查看图书馆运营数据和分析报告</p>
</div>
```

#### 样式修改
```css
.title-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gdut-line {
  width: 30px;
  height: 3px;
  background: var(--gdut-red);
  border-radius: 2px;
}
```

---

### 7. 读者管理页面 (src/renderer/src/views/Readers.vue)

#### 修改内容
- 在页面标题区域添加广工元素

#### 模板修改
```vue
<div class="page-header">
  <div class="header-group">
    <h1 class="page-title">读者管理</h1>
    <div class="gdut-dot"></div>
  </div>
  <p class="page-description">管理读者信息和读者证</p>
</div>
```

#### 样式修改
```css
.header-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gdut-dot {
  width: 8px;
  height: 8px;
  background: var(--gdut-red);
  border-radius: 50%;
}
```

---

### 8. 借阅管理页面 (src/renderer/src/views/Borrowing.vue)

#### 修改内容
- 在页面标题区域添加广工元素

#### 模板修改
```vue
<div class="page-header">
  <div class="title-container">
    <h1 class="page-title">{{ pageTitle }}</h1>
    <div class="gdut-bar"></div>
  </div>
  <p class="page-description">{{ pageDescription }}</p>
</div>
```

#### 样式修改
```css
.title-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gdut-bar {
  width: 3px;
  height: 24px;
  background: linear-gradient(180deg, var(--gdut-red), var(--gdut-blue));
  border-radius: 2px;
}
```

---

## 实施步骤

1. **创建资源目录**
   - 创建 `public/images/` 目录
   - 下载广工校徽图片并生成不同尺寸版本

2. **修改全局样式**
   - 在 `index.css` 中添加广工主题色变量
   - 添加广工元素样式类

3. **修改各页面组件**
   - 按顺序修改 Layout.vue、Login.vue、Books.vue、Dashboard.vue、Statistics.vue、Readers.vue、Borrowing.vue

4. **测试验证**
   - 启动应用检查各页面广工元素显示效果
   - 确保不影响原有功能

---

## 注意事项

1. **功能保持不变**：所有修改仅涉及样式和UI元素，不修改任何业务逻辑
2. **响应式设计**：广工元素在不同屏幕尺寸下应保持良好显示效果
3. **图片加载**：确保校徽图片正确加载，提供fallback样式
4. **颜色协调**：广工红与现有Indigo色系和谐搭配
5. **适度原则**：广工元素作为点缀，不过度使用

---

## 预期效果

- 侧边栏显示广工校徽和"广工"标识
- 登录页面展示广工校徽和校名
- 图书列表使用广工校徽作为图书图标
- 各页面标题区域添加广工色装饰线条/圆点
- 整体风格保持现代简约，广工元素自然融入
