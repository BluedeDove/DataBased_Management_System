# DEBUG 联调问题清单

联调时间：`2026-04-16`  
联调实例：`http://127.0.0.1:3004`

## 本轮使用账号

- 学生：`student024 / 123456`
- 教师：`teacher005 / 123456`
- 机器：`machine01 / machine123`

## 已验证通过

### 1. 角色边界基本成立

- 学生/教师登录后，代码层默认首页已切到 AI：`web/src/utils/homeRoute.ts:3`
- 机器账号默认首页已切到机器终端：`web/src/utils/homeRoute.ts:7`
- 学生账号直打线上借书/还书接口会被后端拒绝：
  - `POST /api/v1/borrowings` → `403`
  - `PUT /api/v1/borrowings/:id/return` → `403`
- 对应后端权限控制已加：`server/src/routes/borrowing.routes.ts:27`

### 2. AI“只预约、不线上借书”已跑通

- 实测 prompt：`Please help me reserve the physical book with ISBN 9787111588000 for pickup in library. Do not borrow it online.`
- AI 流式结果中依次触发：
  - `search_books`
  - `reserve_book`
- 成功生成预约：`RES-20260416-XNDL`
- 预约后仅新增 `reservations` 记录，没有新增该书的借阅记录
- 说明当前 AI 主路径已经符合“线上只预约、线下机器扫码借实体书”的目标

### 3. 机器借还主链路已跑通

- 测试书目：`book_id=303`《围城》
- 测试条码：`BK000303-0001`
- 测试读者：`STUDENT202603270024`
- 结果：
  - 学生先预约成功
  - 机器借书成功
  - 预约状态自动从 `pending` 变为 `fulfilled`
  - 机器还书成功
  - 条码状态恢复为 `available`

### 4. 传承笔记约束已跑通

- 对“未归还图书”创建 `legacy` 笔记会被拦截
- 对“已归还图书”首次创建 `legacy` 笔记成功
- 同一次借阅再次创建 `legacy` 笔记会被拦截
- 说明“传承笔记只能基于已归还图书，且一借一篇”的后端约束已生效

### 5. 重复预约防重已生效

- 对同一读者、同一本书重复发起预约：
  - `POST /api/v1/reservations`
  - 返回 `400`
  - 错误信息：`您已预约过这本书，请勿重复预约`

## 已确认问题

### 问题 1：Windows 启动脚本直接报错退出

- 复现：
  - 运行 `scripts/windows/start-smart-library.ps1`
- 实际结果：
  - 启动阶段报错：`Cannot overwrite variable Pid because it is read-only or constant.`
- 预期结果：
  - 正常写入启动状态并保持服务运行
- 影响：
  - 用户通过标准启动脚本无法稳定启动项目
- 疑似位置：
  - `scripts/windows/start-smart-library.ps1`

### 问题 2：启动链路在中文路径下可能导致首页 404

- 复现：
  - 带 `APP_ROOT=E:\个人项目\计算机程序设计大赛2026` 启动服务
  - `GET /health` 正常
  - `GET /` 返回 `404`
- 实际结果：
  - API 可用，但 SPA 首页未挂上
- 预期结果：
  - 首页正常返回 `web/dist/index.html`
- 影响：
  - 启动脚本即使绕过上一条报错，也可能出现“服务像起了，但网页打不开”
- 疑似位置：
  - `scripts/windows/start-smart-library.ps1`
  - `server/src/app.ts:174`

### 问题 3：图书状态、可预约性、机器借书提示三者不一致

- 复现样本：
  - `book_id=301`《深入理解计算机系统》
  - `status=damaged`
  - `available_quantity=3`
  - 可用条码：`BK000301-0001`
- 实际结果：
  - 学生预约该书：后端返回 `当前图书状态不可预约`
  - 机器查条码：仍返回 `suggested_action: "borrow"`
  - 前端预约按钮的禁用条件主要只看库存，未显式拦住 `damaged` 图书
- 预期结果：
  - 只要图书整体状态不可借/不可约，前端和机器端都应提前明确拦截，不应给出“可借/可预约”的错觉
- 影响：
  - 很容易再次出现“用户点了预约/借书，但后端又报错”的尴尬体验
- 疑似位置：
  - `web/src/views/Books.vue`
  - `web/src/views/AIAssistant.vue`
  - `web/src/views/MachineTerminal.vue`
  - `server/src/domains/borrowing/borrowing.service.ts:309`

### 问题 4：机器借书成功响应里的 `copy.status` 是旧值

- 复现：
  - `POST /api/v1/machine/borrow`
  - 样本：`readerNo=STUDENT202603270024`，`barcode=BK000303-0001`
- 实际结果：
  - 借书成功响应中，`data.copy.status` 仍是 `available`
  - 但紧接着再次查询同一条码，状态已变成 `borrowed`
- 预期结果：
  - 成功响应里就应该返回更新后的副本状态
- 影响：
  - 机器端成功提示区可能显示旧状态，造成“借出成功但状态看着没变”的错觉
- 疑似位置：
  - `server/src/domains/borrowing/borrowing.service.ts:175`

## 下阶段建议优先级

### P0：必须先修

- 修复启动脚本 `Pid` 变量冲突
- 修复中文路径 / `APP_ROOT` 导致首页 404
- 统一“图书状态 vs 前端按钮 vs 机器建议动作”的判断口径

### P1：本轮一起修更顺

- 修复机器借书成功响应中的 `copy.status` 旧值问题
- 顺手校验图书编辑后，`books.status` 与 `book_copies.status` / `available_quantity` 是否会继续失配

## 备注

- 这轮没有继续修 bug，只做了启动、接口、借还、AI、笔记几个关键链路的验证与收集。
- 如果下阶段开始修，我建议从“启动脚本 + 状态判断一致性”一起下手，因为这两类问题最容易在演示时翻车。

## 2026-04-17 烟测新增发现

新增检测脚本：`scripts/windows/smoke-smart-library.ps1`

本轮新增确认的失败项：

### 问题 5：库存为 0 的图书仍能成功预约

状态：已修复（2026-04-17）

- 来源：循环烟测 `Reservation boundary: zero-stock book is rejected`
- 实测结果：
  - 接口返回 `200`
  - 样本图书：`HTTP权威指南`
- 修复结果：
  - `server/src/domains/reservation/reservation.service.ts` 已新增 `available_quantity <= 0` 拦截
  - 完整发布闸门 `-Cycles 2` 已通过
- 预期结果：
  - 库存为 0 时必须直接拒绝预约
- 影响：
  - 会继续出现“线上点了预约，但实际无书可取”的体验问题
- 疑似位置：
  - `server/src/domains/reservation/reservation.service.ts`

### 问题 6：不可借读者仍能继续创建预约

状态：已修复（2026-04-17）

- 来源：循环烟测 `Reservation boundary: blocked reader cannot keep reserving`
- 实测结果：
  - 接口返回 `200`
  - 读者不可借原因：`已达到最大借阅数量（5本）`
- 修复结果：
  - `server/src/domains/reservation/reservation.service.ts` 已复用 `ReaderService.canBorrow(readerId)`
  - 完整发布闸门 `-Cycles 2` 已通过
- 预期结果：
  - 不可借读者应直接禁止继续预约
- 影响：
  - 会继续出现“系统口头说不能借，但操作又成功”的语义冲突
- 疑似位置：
  - `server/src/domains/reservation/reservation.service.ts`
  - 建议复用 `server/src/domains/reader/reader.service.ts` 的 `canBorrow(readerId)`
