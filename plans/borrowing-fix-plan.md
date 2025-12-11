# 图书馆借阅功能修复计划

## 问题描述
用户报告图书馆管理系统的借阅功能有问题：点击借书按钮后显示成功消息，但数据库中没有记录，图书数量也没有减少。用户特别强调："我不希望用户点击借阅按钮的时候是借阅已提交 直接改成成功借阅然后写入数据库 不然你提交了我管理员也没办法同意啊"。

## 问题分析

### 1. 当前系统状态
- 借阅功能已经是直接完成的，不需要管理员批准
- 前端显示"借书成功"消息
- 后端使用事务处理借阅操作
- 数据库表结构正确，没有"pending"状态

### 2. 发现的问题
1. **并发控制不足**：`decreaseAvailableQuantity` 方法没有防止 `available_quantity` 变成负数的检查
2. **错误处理不完善**：某些错误可能没有被正确捕获和报告
3. **数据一致性风险**：在多用户并发情况下可能发生超借
4. **用户反馈不匹配**：前端显示成功但数据库可能没有写入

### 3. 根本原因
- `book.repository.ts` 中的 `decreaseAvailableQuantity` 方法使用简单的 UPDATE 语句，没有检查数量是否足够
- 虽然借阅服务在事务前检查了 `available_quantity`，但在并发情况下，两个用户可能同时通过检查
- 事务处理正确，但如果 `decreaseAvailableQuantity` 失败，错误信息可能不够清晰

## 修复方案

### 1. 修复 `decreaseAvailableQuantity` 方法
**文件**: `src/main/domains/book/book.repository.ts`
**修改内容**:
```typescript
decreaseAvailableQuantity(id: number, amount: number = 1): void {
  const stmt = db.prepare(`
    UPDATE books
    SET available_quantity = available_quantity - ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND available_quantity >= ?
  `)
  const result = stmt.run(amount, id, amount)
  
  if (result.changes === 0) {
    throw new Error(`图书可借数量不足，无法减少 ${amount} 本`)
  }
}
```

### 2. 修复 `increaseAvailableQuantity` 方法（一致性）
**文件**: `src/main/domains/book/book.repository.ts`
**修改内容**:
```typescript
increaseAvailableQuantity(id: number, amount: number = 1): void {
  const stmt = db.prepare(`
    UPDATE books
    SET available_quantity = available_quantity + ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)
  const result = stmt.run(amount, id)
  
  if (result.changes === 0) {
    throw new Error(`图书不存在，ID: ${id}`)
  }
}
```

### 3. 增强借阅服务错误处理
**文件**: `src/main/domains/borrowing/borrowing.service.ts`
**修改内容**:
- 在事务中添加更详细的日志
- 确保所有错误都被正确捕获和记录
- 添加事务执行后的验证

### 4. 改进 IPC 错误处理
**文件**: `src/main/lib/ipcHandlers.ts`
**修改内容**:
- 在 `borrowing:borrow` 处理器中添加更详细的错误信息
- 确保错误信息能正确传递到前端

### 5. 前端错误显示改进
**文件**: `src/renderer/src/views/Borrowing.vue`
**修改内容**:
- 确保错误消息能正确显示
- 添加重试机制或更明确的错误提示

## 实施步骤

### 阶段1：修复核心问题
1. 修复 `book.repository.ts` 中的数量更新方法
2. 测试修复后的数据库操作

### 阶段2：增强错误处理
1. 改进借阅服务的错误处理
2. 增强 IPC 处理器的错误信息

### 阶段3：前端改进
1. 改进前端错误显示
2. 添加用户友好的错误提示

### 阶段4：测试验证
1. 运行现有测试
2. 添加并发测试场景
3. 手动测试借阅功能

## 预期效果

### 修复后：
1. **借阅操作原子性**：借阅记录创建和图书数量减少是原子操作
2. **防止超借**：`available_quantity` 不会变成负数
3. **更好的错误处理**：用户能看到明确的错误信息
4. **数据一致性**：数据库状态始终保持一致
5. **用户反馈准确**：前端显示的消息与实际操作结果一致

### 验证方法：
1. 测试正常借阅流程
2. 测试并发借阅同一本书
3. 测试借阅数量不足的情况
4. 测试各种错误场景

## 风险与缓解

### 风险1：数据库迁移
- **风险**：修改数据库操作方法可能影响现有数据
- **缓解**：新方法保持向后兼容，只添加额外检查

### 风险2：性能影响
- **风险**：额外的检查可能影响性能
- **缓解**：检查在 WHERE 子句中完成，性能影响最小

### 风险3：测试覆盖
- **风险**：现有测试可能不覆盖并发场景
- **缓解**：添加新的测试用例，特别是并发测试

## 时间安排
建议立即开始实施，预计需要 2-3 小时完成所有修复和测试。

## 相关人员
- 开发人员：实施代码修复
- 测试人员：验证修复效果
- 用户：提供反馈和验收测试