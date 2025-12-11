// 测试借阅功能
console.log('=== 测试借阅功能 ===\n');

// 从数据库中获取一个读者和一个图书
const { execSync } = require('child_process');
const dbPath = 'C:\\Users\\ROG\\AppData\\Roaming\\electron-smart-library\\library.db';

// 获取一个活跃的读者
console.log('1. 获取一个活跃的读者:');
const reader = execSync(`sqlite3 "${dbPath}" "SELECT id, reader_no, name, status FROM readers WHERE status = 'active' LIMIT 1"`).toString().trim();
console.log('   读者:', reader);

// 获取一个有库存的图书
console.log('\n2. 获取一个有库存的图书:');
const book = execSync(`sqlite3 "${dbPath}" "SELECT id, isbn, title, available_quantity FROM books WHERE available_quantity > 0 AND status = 'normal' LIMIT 1"`).toString().trim();
console.log('   图书:', book);

// 解析数据
const [readerId, readerNo, readerName, readerStatus] = reader.split('|');
const [bookId, isbn, bookTitle, availableQuantity] = book.split('|');

console.log('\n3. 测试数据:');
console.log('   读者ID:', readerId);
console.log('   读者编号:', readerNo);
console.log('   读者姓名:', readerName);
console.log('   读者状态:', readerStatus);
console.log('   图书ID:', bookId);
console.log('   ISBN:', isbn);
console.log('   图书标题:', bookTitle);
console.log('   可借数量:', availableQuantity);

console.log('\n4. 测试建议:');
console.log('   在前端借阅页面输入:');
console.log('   - 读者编号:', readerNo);
console.log('   - 图书ISBN:', isbn);
console.log('\n   如果借阅成功，图书可借数量应该从', availableQuantity, '减少到', (parseInt(availableQuantity) - 1));

// 检查该读者是否已经借阅了这本书
console.log('\n5. 检查是否已借阅:');
const existing = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM borrowing_records WHERE reader_id = ${readerId} AND book_id = ${bookId} AND status IN ('borrowed', 'overdue')"`).toString().trim();
console.log('   已借阅记录数:', existing);
if (parseInt(existing) > 0) {
  console.log('   ⚠️  该读者已经借阅了这本书，不能重复借阅');
}

// 检查读者的借阅限制
console.log('\n6. 检查读者借阅限制:');
const readerCategory = execSync(`sqlite3 "${dbPath}" "SELECT rc.max_borrow_count FROM readers r JOIN reader_categories rc ON r.category_id = rc.id WHERE r.id = ${readerId}"`).toString().trim();
const currentBorrowCount = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM borrowing_records WHERE reader_id = ${readerId} AND status IN ('borrowed', 'overdue')"`).toString().trim();
console.log('   最大借阅数量:', readerCategory);
console.log('   当前借阅数量:', currentBorrowCount);
if (parseInt(currentBorrowCount) >= parseInt(readerCategory)) {
  console.log('   ⚠️  读者已达到最大借阅数量限制');
}

// 检查是否有逾期未还
console.log('\n7. 检查逾期记录:');
const overdueCount = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM borrowing_records WHERE reader_id = ${readerId} AND status = 'borrowed' AND due_date < date('now')"`).toString().trim();
console.log('   逾期未还数量:', overdueCount);
if (parseInt(overdueCount) > 0) {
  console.log('   ⚠️  读者有逾期未还的图书');
}

console.log('\n=== 测试完成 ===');