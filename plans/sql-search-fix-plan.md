# SQL搜索模块修复计划

## 问题分析

根据用户反馈和代码分析，SQL搜索模块存在以下问题：

1. **数据结构不匹配问题**：
   - 后端`SqlSearchService.executeQuery()`返回`QueryResult`对象（包含`columns`、`rows`、`rowCount`）
   - 前端`Books.vue`期望`result.data`是图书数组
   - 导致前端无法正确显示SQL查询结果

2. **日志中文乱码问题**：
   - 日志显示"鎵цSQL鏌ヨ"（应为"执行SQL查询"）
   - 可能是编码问题或日志配置问题

## 修复方案

### 1. 修复数据结构不匹配问题

**修改文件**: `src/main/lib/ipcHandlers.ts`

**修改内容**:
```typescript
// 第771-778行，修改为：
ipcMain.handle('search:executeSql', async (_, query) => {
  try {
    const result = sqlSearchService.executeQuery(query)
    // 返回rows而不是整个QueryResult对象，以保持与其他搜索API的一致性
    return { success: true, data: result.rows } as SuccessResponse
  } catch (error) {
    return errorHandler.handle(error)
  }
})
```

**理由**: 保持与其他搜索API（正则搜索、语义搜索）的一致性，它们都直接返回数据数组。

### 2. 修复日志中文乱码问题

**修改文件**: `src/main/lib/logger.ts`

**可能的问题**:
- 日志系统可能没有正确配置UTF-8编码
- 可能需要检查日志输出配置

**解决方案**:
- 检查logger.ts中的编码配置
- 确保控制台输出使用正确的编码

### 3. 可选：增强前端错误处理

**修改文件**: `src/renderer/src/views/Books.vue`

**修改内容**:
- 在第242-253行添加更健壮的错误处理
- 确保即使数据结构变化也能正常显示

## 测试计划

1. 启动开发服务器
2. 测试SQL查询功能：
   - 输入: `SELECT * FROM books WHERE price > 50`
   - 预期: 正确显示查询结果
3. 测试其他搜索功能：
   - 正则搜索
   - 语义搜索
4. 检查日志输出：
   - 确保中文显示正常

## 风险与缓解

1. **风险**: 修改可能影响其他使用`search:executeSql`的功能
   **缓解**: 检查项目中是否有其他地方使用此API

2. **风险**: 日志乱码可能涉及系统级配置
   **缓解**: 先修复数据结构问题，日志问题作为次要问题处理

## 实施顺序

1. 切换到Code模式
2. 修改`ipcHandlers.ts`
3. 测试SQL搜索功能
4. 如有需要，修复日志问题
5. 验证所有修复