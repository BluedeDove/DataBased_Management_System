const fs = require('fs');
const path = require('path');
const os = require('os');

// 数据库路径
const userDataPath = process.env.APPDATA 
  ? path.join(process.env.APPDATA, 'electron-smart-library')
  : path.join(os.homedir(), '.electron-smart-library');
const dbPath = path.join(userDataPath, 'library.db');

console.log('数据库路径:', dbPath);
console.log('文件存在:', fs.existsSync(dbPath));

if (!fs.existsSync(dbPath)) {
  console.log('数据库文件不存在，请先运行应用或生成测试数据');
  process.exit(1);
}

// 尝试使用better-sqlite3
try {
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);
  
  console.log('\n=== 数据库表 ===');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  tables.forEach(t => console.log('  -', t.name));
  
  console.log('\n=== 读者数据（前5条）===');
  const readers = db.prepare('SELECT id, reader_no, name, status FROM readers LIMIT 5').all();
  readers.forEach(r => console.log(`  ID:${r.id} 编号:${r.reader_no} 姓名:${r.name} 状态:${r.status}`));
  
  console.log('\n=== 图书数据（前5条）===');
  const books = db.prepare('SELECT id, isbn, title, available_quantity FROM books LIMIT 5').all();
  books.forEach(b => console.log(`  ID:${b.id} ISBN:${b.isbn} 标题:${b.title} 可借:${b.available_quantity}`));
  
  console.log('\n=== 借阅记录（前5条）===');
  const borrowings = db.prepare(`
    SELECT br.id, r.reader_no, b.isbn, br.status, br.borrow_date
    FROM borrowing_records br
    JOIN readers r ON br.reader_id = r.id
    JOIN books b ON br.book_id = b.id
    LIMIT 5
  `).all();
  borrowings.forEach(br => console.log(`  记录ID:${br.id} 读者:${br.reader_no} 图书:${br.isbn} 状态:${br.status} 借书日期:${br.borrow_date}`));
  
  db.close();
} catch (error) {
  console.error('无法连接数据库:', error.message);
  console.log('请确保better-sqlite3已安装: npm install better-sqlite3');
}