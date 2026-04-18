# 上线循环检测与 DEBUG 闭环

## 1. 目标

这套流程不是“口头说稳定”，而是把**启动链路、构建链路、核心业务链路、角色边界、线上/线下职责边界**全部串成可重复执行的发布闸门。  
目标是做到：**修一个问题，就用同一套命令再跑一遍；直到 0 个失败项，才允许上线/演示。**

---

## 2. 已新增的循环检测脚本

新增脚本：`scripts/windows/smoke-smart-library.ps1`

它现在具备这些能力：

- 支持 `-Cycles N` 多轮循环烟测，不是只跑一次。
- 每轮都会复制 `data/library.db` 到 `.runtime/smoke/`，避免污染正式数据。
- 每轮都会独立启动本地服务、跑检测、再自动停服。
- 自动输出：
  - `\.runtime\smoke\latest-smoke-report.json`
  - `\.runtime\smoke\latest-smoke-report.md`
  - `\.runtime\smoke\history\smoke-时间戳.json/.md`
- 支持 `-KeepArtifacts` 保留本轮数据库副本，便于复现。

---

## 3. 当前检测覆盖范围

### 3.1 静态职责边界扫描

- 学生/老师默认首页是否仍然进入 AI 页。
- 机器账号默认首页是否仍然进入机器终端。
- `borrow/return/renew` 是否仍然只允许管理员/馆员。
- 机器端接口是否仍然挂在机器角色权限后面。
- 联想搜索是否仍然挂在机器端。
- 图书状态判断是否仍然统一复用 `getBookStatusMeta`。

### 3.2 启动与资源链路

- 服务是否能成功启动。
- `/` 是否能返回 SPA。
- `/login` 是否能返回 SPA。
- 启动器预检是否通过：`start-smart-library.ps1 -ValidateOnly -NoBrowser`

### 3.3 账号与权限边界

- 管理员、机器账号、种子学生账号是否可登录。
- 新建烟测学生账号是否可注册并绑定读者。
- 学生是否被禁止线上直接借实体书。
- 学生是否被禁止访问机器专属接口。
- 机器账号是否不能创建读者预约。

### 3.4 借阅/预约主链路

- 健康读者是否可预约正常且有库存的图书。
- 重复预约是否被拒绝。
- 库存为 0 的图书是否被拒绝预约。
- 状态异常的图书是否被拒绝预约。
- 不可借读者是否仍会被错误放行预约。
- 机器端联想搜索是否可用。
- 机器端能否正确识别副本和读者。
- 机器端借书、还书、重复借、重复还的边界是否正确。
- 线上预约后，线下机器取书是否会自动把预约改成 `fulfilled`。

### 3.5 “传承笔记”闭环

- 未归还前是否禁止创建 `legacy` 笔记。
- 借书→还书后是否允许创建 `legacy` 笔记。
- 是否能按 `noteId` 和 `bookId` 找回传承笔记。
- 是否遵守“一次归还只允许沉淀一篇传承笔记”。

---

## 4. 建议执行顺序

### 快速排查命令

```powershell
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\smoke-smart-library.ps1 -Cycles 1 -SkipBuild -SkipTypeCheck -SkipLauncherValidate
```

适合：刚修完一个问题，先快速确认有没有继续翻车。

### 完整发布闸门命令

```powershell
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\smoke-smart-library.ps1 -Cycles 2
```

适合：准备演示、准备提交、准备上线前最后确认。

### 如需保留现场用于复现

```powershell
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\smoke-smart-library.ps1 -Cycles 1 -KeepArtifacts
```

---

## 5. 发布通过标准

至少同时满足下面 4 条，才算“可以上线/可以演示”：

1. `scripts/windows/start-smart-library.ps1 -ValidateOnly -NoBrowser` 通过。
2. `volta run --node 20.20.2 npx tsc -p server/tsconfig.json --noEmit` 通过。
3. `volta run --node 20.20.2 npm --prefix web run build` 通过。
4. `smoke-smart-library.ps1 -Cycles 2` 结果为 **0 fail**。

如果其中任意一条不过，就不算真正稳定。

---

## 6. 当前实测结果（2026-04-17）

已确认通过：

- 启动器预检通过。
- 后端 TypeScript 类型检查通过。
- 前端生产构建通过。
- 烟测脚本本身已能稳定跑通整条检测流程并输出报告。
- 完整发布闸门 `-Cycles 2` 已通过：`Passed: 95, Failed: 0, Warnings: 0, Skipped: 0`。

本轮已修复的真实失败项：

1. **库存为 0 的图书仍能成功预约**
   - 失败项：`Reservation boundary: zero-stock book is rejected`
   - 修复后：已拒绝，烟测通过

2. **不可借读者仍能继续创建预约**
   - 失败项：`Reservation boundary: blocked reader cannot keep reserving`
   - 修复后：已拒绝，烟测通过

这两个问题的根因是：**预约服务的后端校验不够完整**。现已在 `server/src/domains/reservation/reservation.service.ts` 补齐。

---

## 7. 已落地修复点

已修复位置：

- `server/src/domains/reservation/reservation.service.ts`

已补两类校验：

1. 预约前校验 `book.available_quantity > 0`
2. 预约前复用读者借阅资格判断，而不是只看 `reader.status`

更具体地说，应该复用：

- `server/src/domains/reader/reader.service.ts` 里的 `canBorrow(readerId)`

这样可以从根上解决“线上点了预约，但实际上不该成功”的尴尬问题。

---

## 8. 之后的标准闭环

以后每修完一批 bug，就固定走这套循环：

1. 修 bug
2. 运行快速烟测
3. 看 `latest-smoke-report.md`
4. 继续修剩余 fail
5. fail 清零后，跑完整 2 轮闸门
6. 2 轮都 0 fail，再上线/演示

这就是后面项目最稳的发布节奏。
