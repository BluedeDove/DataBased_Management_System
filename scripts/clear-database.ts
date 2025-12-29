/**
 * 数据库清理脚本
 * 
 * 功能：
 * - 删除所有表中的数据（保留表结构）
 * - 删除整个数据库文件（可选）
 * 
 * 使用方法：
 *   npm run db:clear          # 仅删除数据，保留表结构
 *   npm run db:clear:all      # 删除整个数据库文件
 * 
 * 注意：此脚本仅用于演示，不考虑安全性
 */

import Database from 'better-sqlite3'
import path from 'path'
import { existsSync, unlinkSync } from 'fs'
import os from 'os'

// 获取数据库路径
const userDataPath = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'electron-smart-library')
  : path.join(os.homedir(), '.electron-smart-library')

const dbPath = path.join(userDataPath, 'library.db')

// 解析命令行参数
const args = process.argv.slice(2)
const deleteAll = args.includes('--all') || args.includes('-a')

console.log('🗑️  数据库清理脚本\n')
console.log(`📁 数据库路径: ${dbPath}`)

if (!existsSync(dbPath)) {
  console.log('⚠️  数据库文件不存在，无需清理')
  process.exit(0)
}

if (deleteAll) {
  // 删除整个数据库文件
  console.log('\n🔥 删除整个数据库文件...')
  try {
    unlinkSync(dbPath)
    console.log('✅ 数据库文件已删除')
    console.log('\n💡 提示: 下次启动应用时会自动创建新的数据库')
  } catch (error) {
    console.error('❌ 删除数据库文件失败:', error)
    process.exit(1)
  }
} else {
  // 仅删除数据，保留表结构
  console.log('\n🧹 清理数据库数据（保留表结构）...')
  
  const db = new Database(dbPath)
  db.pragma('foreign_keys = OFF') // 暂时关闭外键约束以便删除数据
  
  try {
    // 获取所有表名
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as { name: string }[]
    
    console.log(`\n找到 ${tables.length} 个表:`)
    tables.forEach(t => console.log(`  - ${t.name}`))
    
    // 删除每个表的数据
    tables.forEach(table => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number }
      if (count.count > 0) {
        db.exec(`DELETE FROM ${table.name}`)
        console.log(`✅ 已删除 ${table.name} 表的 ${count.count} 条记录`)
      }
    })
    
    // 重置自增ID
    tables.forEach(table => {
      try {
        db.exec(`DELETE FROM sqlite_sequence WHERE name='${table.name}'`)
      } catch (error) {
        // 某些表可能没有自增ID，忽略错误
      }
    })
    
    console.log('\n✅ 数据清理完成')
    console.log('💡 提示: 表结构已保留，可以重新生成测试数据')
    
    // 显示当前数据统计
    console.log('\n📊 当前数据统计:')
    tables.forEach(table => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number }
      console.log(`  ${table.name}: ${count.count} 条`)
    })
    
  } catch (error) {
    console.error('❌ 清理数据失败:', error)
    process.exit(1)
  } finally {
    db.close()
  }
}

console.log('\n🎉 清理操作完成')
process.exit(0)
