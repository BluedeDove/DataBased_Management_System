"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/generateTestData.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_path = __toESM(require("path"));
var import_fs = require("fs");
var import_os = __toESM(require("os"));
var import_bcryptjs = __toESM(require("bcryptjs"));
var userDataPath = process.env.APPDATA ? import_path.default.join(process.env.APPDATA, "electron-smart-library") : import_path.default.join(import_os.default.homedir(), ".electron-smart-library");
if (!(0, import_fs.existsSync)(userDataPath)) {
  (0, import_fs.mkdirSync)(userDataPath, { recursive: true });
}
var dbPath = import_path.default.join(userDataPath, "library.db");
var db = new import_better_sqlite3.default(dbPath);
db.pragma("foreign_keys = ON");
console.log("\u{1F5D1}\uFE0F  \u5220\u9664\u73B0\u6709\u8868\u7ED3\u6784...");
db.exec(`
  DROP TABLE IF EXISTS borrowing_records;
  DROP TABLE IF EXISTS books;
  DROP TABLE IF EXISTS book_categories;
  DROP TABLE IF EXISTS readers;
  DROP TABLE IF EXISTS reader_categories;
  DROP TABLE IF EXISTS users;
  DROP TABLE IF EXISTS role_permissions;
  DROP TABLE IF EXISTS system_settings;
`);
console.log("\u2705 \u73B0\u6709\u8868\u5DF2\u5220\u9664\n");
console.log("\u{1F527} \u521D\u59CB\u5316\u6570\u636E\u5E93\u8868\u7ED3\u6784...");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'librarian', 'teacher', 'student')),
    reader_id INTEGER,
    email TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE SET NULL
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS reader_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    max_borrow_count INTEGER NOT NULL DEFAULT 5,
    max_borrow_days INTEGER NOT NULL DEFAULT 30,
    validity_days INTEGER NOT NULL DEFAULT 365,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS readers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reader_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    user_id INTEGER,
    gender TEXT CHECK(gender IN ('male', 'female', 'other')),
    id_card TEXT UNIQUE,
    organization TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    registration_date DATE DEFAULT (date('now')),
    expiry_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'expired', 'pending')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES reader_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS book_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    keywords TEXT,
    parent_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES book_categories(id) ON DELETE SET NULL
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT NOT NULL,
    publish_date DATE,
    price REAL,
    pages INTEGER,
    keywords TEXT,
    description TEXT,
    cover_url TEXT,
    total_quantity INTEGER NOT NULL DEFAULT 1,
    available_quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'normal' CHECK(status IN ('normal', 'damaged', 'lost', 'destroyed')),
    registration_date DATE DEFAULT (date('now')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES book_categories(id) ON DELETE RESTRICT
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS borrowing_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reader_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    borrow_date DATE DEFAULT (date('now')),
    due_date DATE NOT NULL,
    return_date DATE,
    renewal_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'borrowed' CHECK(status IN ('borrowed', 'returned', 'overdue', 'lost')),
    fine_amount REAL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE RESTRICT,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK(role IN ('admin', 'librarian', 'teacher', 'student')),
    permission TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission)
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type TEXT NOT NULL CHECK(setting_type IN ('string', 'number', 'boolean', 'json')),
    category TEXT NOT NULL CHECK(category IN ('ai', 'system', 'business')),
    description TEXT,
    is_encrypted INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_readers_category ON readers(category_id);
  CREATE INDEX IF NOT EXISTS idx_readers_status ON readers(status);
  CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);
  CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
  CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
  CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
  CREATE INDEX IF NOT EXISTS idx_borrowing_reader ON borrowing_records(reader_id);
  CREATE INDEX IF NOT EXISTS idx_borrowing_book ON borrowing_records(book_id);
  CREATE INDEX IF NOT EXISTS idx_borrowing_status ON borrowing_records(status);
  CREATE INDEX IF NOT EXISTS idx_borrowing_dates ON borrowing_records(borrow_date, due_date);
`);
console.log("\u{1F4DD} \u63D2\u5165\u9ED8\u8BA4\u6570\u636E\uFF08\u7528\u6237\u3001\u6743\u9650\u3001\u7C7B\u522B\uFF09...");
var adminExists = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const salt = import_bcryptjs.default.genSaltSync(10);
  const hashedPassword = import_bcryptjs.default.hashSync("admin123", salt);
  db.prepare(`
    INSERT INTO users (username, password, name, role, email)
    VALUES (?, ?, ?, ?, ?)
  `).run("admin", hashedPassword, "\u7CFB\u7EDF\u7BA1\u7406\u5458", "admin", "admin@library.com");
}
db.exec(`
  INSERT OR IGNORE INTO role_permissions (role, permission) VALUES
    ('admin', '*'),
    ('librarian', 'books:*'),
    ('librarian', 'readers:*'),
    ('librarian', 'borrowing:*'),
    ('librarian', 'statistics:read'),
    ('teacher', 'books:read'),
    ('teacher', 'borrowing:read'),
    ('teacher', 'borrowing:borrow'),
    ('teacher', 'statistics:read'),
    ('student', 'books:read'),
    ('student', 'borrowing:read'),
    ('student', 'borrowing:borrow')
`);
var readerCategoriesCount = db.prepare("SELECT COUNT(*) as count FROM reader_categories").get();
if (readerCategoriesCount.count === 0) {
  const insertReaderCategory = db.prepare(`
    INSERT INTO reader_categories (code, name, max_borrow_count, max_borrow_days, validity_days)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertReaderCategory.run("STUDENT", "\u5B66\u751F", 5, 30, 365);
  insertReaderCategory.run("TEACHER", "\u6559\u5E08", 10, 60, 1095);
  insertReaderCategory.run("STAFF", "\u804C\u5DE5", 8, 45, 730);
}
var bookCategoriesCount = db.prepare("SELECT COUNT(*) as count FROM book_categories").get();
if (bookCategoriesCount.count === 0) {
  const insertBookCat = db.prepare(`
    INSERT INTO book_categories (code, name, keywords)
    VALUES (?, ?, ?)
  `);
  insertBookCat.run("TP", "\u8BA1\u7B97\u673A\u79D1\u5B66", "\u7F16\u7A0B,\u7B97\u6CD5,\u8F6F\u4EF6,\u786C\u4EF6");
  insertBookCat.run("I", "\u6587\u5B66", "\u5C0F\u8BF4,\u8BD7\u6B4C,\u6563\u6587,\u620F\u5267");
  insertBookCat.run("K", "\u5386\u53F2\u5730\u7406", "\u5386\u53F2,\u5730\u7406,\u8003\u53E4");
  insertBookCat.run("O", "\u6570\u7406\u79D1\u5B66", "\u6570\u5B66,\u7269\u7406,\u5316\u5B66");
  insertBookCat.run("J", "\u827A\u672F", "\u97F3\u4E50,\u7F8E\u672F,\u8BBE\u8BA1,\u6444\u5F71");
}
console.log("\u2705 \u6570\u636E\u5E93\u521D\u59CB\u5316\u5B8C\u6210\n");
console.log("\u{1F4CA} \u5F00\u59CB\u751F\u6210\u6D4B\u8BD5\u6570\u636E...\n");
console.log("\u{1F9F9} \u6E05\u7406\u73B0\u6709\u6570\u636E...");
db.exec("DELETE FROM borrowing_records");
db.exec("DELETE FROM books WHERE id > 0");
db.exec("DELETE FROM users WHERE id > 1");
db.exec("DELETE FROM readers WHERE id > 0");
console.log("\u2705 \u6E05\u7406\u5B8C\u6210\n");
console.log("\u{1F4DA} \u751F\u6210\u56FE\u4E66\u6570\u636E...");
var bookCategories = db.prepare("SELECT * FROM book_categories").all();
var bookNames = [
  // 计算机科学
  "\u6DF1\u5165\u7406\u89E3\u8BA1\u7B97\u673A\u7CFB\u7EDF",
  "JavaScript\u9AD8\u7EA7\u7A0B\u5E8F\u8BBE\u8BA1",
  "Python\u7F16\u7A0B\u4ECE\u5165\u95E8\u5230\u5B9E\u8DF5",
  "Java\u6838\u5FC3\u6280\u672F",
  "\u7B97\u6CD5\u5BFC\u8BBA",
  "\u8BBE\u8BA1\u6A21\u5F0F",
  "\u91CD\u6784",
  "\u4EE3\u7801\u5927\u5168",
  "\u4EBA\u5DE5\u667A\u80FD\u5BFC\u8BBA",
  "\u673A\u5668\u5B66\u4E60\u5B9E\u6218",
  "C++ Primer",
  "Effective Java",
  "Clean Code",
  "\u8BA1\u7B97\u673A\u7F51\u7EDC\uFF1A\u81EA\u9876\u5411\u4E0B\u65B9\u6CD5",
  "\u73B0\u4EE3\u64CD\u4F5C\u7CFB\u7EDF",
  "\u7F16\u8BD1\u539F\u7406",
  "\u6570\u636E\u5E93\u7CFB\u7EDF\u6982\u5FF5",
  "HTTP\u6743\u5A01\u6307\u5357",
  "\u9E1F\u54E5\u7684Linux\u79C1\u623F\u83DC",
  "\u9ED1\u5BA2\u4E0E\u753B\u5BB6",
  "\u4EBA\u6708\u795E\u8BDD",
  "\u7F16\u7A0B\u73E0\u7391",
  "\u6DF1\u5EA6\u5B66\u4E60",
  "\u7EDF\u8BA1\u5B66\u4E60\u65B9\u6CD5",
  "Python\u6570\u636E\u5206\u6790",
  "Vue.js\u6743\u5A01\u6307\u5357",
  "React\u8FDB\u9636\u4E4B\u8DEF",
  "Node.js\u5B9E\u6218",
  "Go\u8BED\u8A00\u5B9E\u6218",
  "Rust\u7F16\u7A0B\u4E4B\u9053",
  // 文学
  "\u5E73\u51E1\u7684\u4E16\u754C",
  "\u6D3B\u7740",
  "\u56F4\u57CE",
  "\u767D\u591C\u884C",
  "\u767E\u5E74\u5B64\u72EC",
  "\u8FFD\u98CE\u7B5D\u7684\u4EBA",
  "\u4E09\u4F53",
  "1984",
  "\u7EA2\u697C\u68A6",
  "\u4E09\u56FD\u6F14\u4E49",
  "\u6C34\u6D52\u4F20",
  "\u897F\u6E38\u8BB0",
  "\u5450\u558A",
  "\u5F77\u5FA8",
  "\u671D\u82B1\u5915\u62FE",
  "\u9A86\u9A7C\u7965\u5B50",
  "\u56DB\u4E16\u540C\u5802",
  "\u8FB9\u57CE",
  "\u547C\u5170\u6CB3\u4F20",
  "\u503E\u57CE\u4E4B\u604B",
  "\u8001\u4EBA\u4E0E\u6D77",
  "\u4E86\u4E0D\u8D77\u7684\u76D6\u8328\u6BD4",
  "\u9EA6\u7530\u91CC\u7684\u5B88\u671B\u8005",
  "\u6740\u6B7B\u4E00\u53EA\u77E5\u66F4\u9E1F",
  "\u50B2\u6162\u4E0E\u504F\u89C1",
  "\u7B80\u7231",
  "\u547C\u5578\u5C71\u5E84",
  "\u590D\u6D3B",
  "\u6218\u4E89\u4E0E\u548C\u5E73",
  "\u7F6A\u4E0E\u7F5A",
  // 历史地理/社科
  "\u4E2D\u56FD\u901A\u53F2",
  "\u660E\u671D\u90A3\u4E9B\u4E8B\u513F",
  "\u4E07\u5386\u5341\u4E94\u5E74",
  "\u4EBA\u7C7B\u7B80\u53F2",
  "\u672A\u6765\u7B80\u53F2",
  "\u5168\u7403\u901A\u53F2",
  "\u67AA\u70AE\u3001\u75C5\u83CC\u4E0E\u94A2\u94C1",
  "\u4E4C\u5408\u4E4B\u4F17",
  "\u793E\u4F1A\u5951\u7EA6\u8BBA",
  "\u7406\u60F3\u56FD",
  "\u541B\u4E3B\u8BBA",
  "\u56FD\u5BCC\u8BBA",
  "\u8D44\u672C\u8BBA",
  "\u68A6\u7684\u89E3\u6790",
  "\u5B58\u5728\u4E0E\u65F6\u95F4",
  "\u82CF\u83F2\u7684\u4E16\u754C",
  "\u4E2D\u56FD\u5730\u7406",
  "\u4E16\u754C\u5730\u7406",
  "\u56FD\u5BB6\u5730\u7406\u767E\u79D1",
  "\u7F8E\u4E3D\u4E2D\u56FD",
  // 数理科学
  "\u7EBF\u6027\u4EE3\u6570",
  "\u6982\u7387\u8BBA\u4E0E\u6570\u7406\u7EDF\u8BA1",
  "\u9AD8\u7B49\u6570\u5B66",
  "\u79BB\u6563\u6570\u5B66",
  "\u6570\u5B66\u5206\u6790",
  "\u5FAE\u79EF\u5206\u4E4B\u5C60\u9F99\u5B9D\u5200",
  "\u4EC0\u4E48\u662F\u6570\u5B66",
  "\u6570\u5B66\u4E4B\u7F8E",
  "\u7269\u7406\u5B66\u7684\u8FDB\u5316",
  "\u65F6\u95F4\u7B80\u53F2",
  "\u679C\u58F3\u4E2D\u7684\u5B87\u5B99",
  "\u4ECE\u4E00\u5230\u65E0\u7A77\u5927",
  "\u5316\u5B66\u539F\u7406",
  "\u666E\u901A\u751F\u7269\u5B66",
  "\u5929\u6587\u5B66\u6982\u8BBA",
  // 艺术
  "\u827A\u672F\u7684\u6545\u4E8B",
  "\u7F8E\u672F\u9274\u8D4F",
  "\u97F3\u4E50\u6B23\u8D4F",
  "\u8BBE\u8BA1\u5FC3\u7406\u5B66",
  "\u5199\u7ED9\u5927\u5BB6\u770B\u7684\u8BBE\u8BA1\u4E66",
  "\u914D\u8272\u8BBE\u8BA1\u539F\u7406",
  "\u7535\u5F71\u827A\u672F",
  "\u897F\u65B9\u7F8E\u672F\u53F2",
  "\u4E2D\u56FD\u7F8E\u672F\u53F2",
  "\u5EFA\u7B51\u5F62\u5F0F\u8BED\u8A00"
];
var authors = [
  "\u5F20\u4E09",
  "\u674E\u56DB",
  "\u738B\u4E94",
  "\u8D75\u516D",
  "\u94B1\u4E03",
  "\u5B59\u516B",
  "\u5468\u4E5D",
  "\u5434\u5341",
  "John Smith",
  "Jane Doe",
  "Robert Brown",
  "Mary Johnson"
];
var publishers = [
  "\u4EBA\u6C11\u51FA\u7248\u793E",
  "\u6E05\u534E\u5927\u5B66\u51FA\u7248\u793E",
  "\u673A\u68B0\u5DE5\u4E1A\u51FA\u7248\u793E",
  "\u7535\u5B50\u5DE5\u4E1A\u51FA\u7248\u793E",
  "\u5317\u4EAC\u5927\u5B66\u51FA\u7248\u793E",
  "\u4E2D\u4FE1\u51FA\u7248\u793E",
  "\u5546\u52A1\u5370\u4E66\u9986",
  "\u4E0A\u6D77\u8BD1\u6587\u51FA\u7248\u793E"
];
var insertBook = db.prepare(`
  INSERT INTO books (isbn, title, author, publisher, category_id, publish_date, price, pages,
                     keywords, description, cover_url, total_quantity, available_quantity, status, registration_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', date('now'))
`);
var insertBookTransaction = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const category = bookCategories[i % bookCategories.length];
    const isbn = `978-7-111-${String(1e4 + i).padStart(5, "0")}-${Math.floor(Math.random() * 10)}`;
    const title = bookNames[i % bookNames.length] + (i >= bookNames.length ? ` (\u7B2C${Math.floor(i / bookNames.length) + 1}\u7248)` : "");
    const author = authors[Math.floor(Math.random() * authors.length)];
    const publisher = publishers[Math.floor(Math.random() * publishers.length)];
    const publishDate = `202${Math.floor(Math.random() * 5)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`;
    const price = (Math.random() * 150 + 30).toFixed(2);
    const pages = Math.floor(Math.random() * 500) + 100;
    const quantity = Math.floor(Math.random() * 5) + 1;
    const keywords = `${category.name},${author},\u70ED\u95E8`;
    const description = `\u8FD9\u662F\u4E00\u672C\u5173\u4E8E${category.name}\u7684\u4F18\u79C0\u56FE\u4E66\uFF0C\u7531${author}\u64B0\u5199\uFF0C${publisher}\u51FA\u7248\u3002`;
    const coverUrl = Math.random() < 0.3 ? `https://picsum.photos/seed/${i}/300/400` : null;
    insertBook.run(
      isbn,
      title,
      author,
      publisher,
      category.id,
      publishDate,
      price,
      pages,
      keywords,
      description,
      coverUrl,
      quantity,
      quantity
    );
  }
});
insertBookTransaction(200);
console.log("\u2705 \u751F\u6210\u4E86 200 \u672C\u56FE\u4E66\n");
console.log("\u{1F465} \u751F\u6210\u8BFB\u8005\u548C\u7528\u6237\u6570\u636E...");
var readerCategories = db.prepare("SELECT * FROM reader_categories").all();
var surnames = ["\u5F20", "\u674E", "\u738B", "\u8D75", "\u94B1", "\u5B59", "\u5468", "\u5434", "\u90D1", "\u51AF", "\u9648", "\u891A", "\u536B", "\u848B", "\u6C88", "\u97E9", "\u6768"];
var names = ["\u4F1F", "\u82B3", "\u5A1C", "\u79C0\u82F1", "\u654F", "\u9759", "\u4E3D", "\u5F3A", "\u78CA", "\u519B", "\u6D0B", "\u52C7", "\u8273", "\u6770", "\u6D9B", "\u660E", "\u8D85", "\u5A1F"];
var organizations = ["\u8BA1\u7B97\u673A\u5B66\u9662", "\u8F6F\u4EF6\u5B66\u9662", "\u6570\u5B66\u5B66\u9662", "\u7269\u7406\u5B66\u9662", "\u6587\u5B66\u9662", "\u5386\u53F2\u5B66\u9662", "\u5316\u5B66\u5B66\u9662", "\u751F\u547D\u79D1\u5B66\u5B66\u9662"];
var insertReader = db.prepare(`
  INSERT INTO readers (reader_no, name, category_id, user_id, gender, id_card, organization,
                       phone, email, address, status, registration_date, expiry_date, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', date('now'), date('now', '+1 year'), ?)
`);
var insertUser = db.prepare(`
  INSERT INTO users (username, password, name, role, reader_id, email, phone)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
var updateReaderUserId = db.prepare(`
  UPDATE readers SET user_id = ? WHERE id = ?
`);
var generateReaderNo = (categoryCode, sequence) => {
  const today = /* @__PURE__ */ new Date();
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
  return `${categoryCode}${dateStr}${sequence.toString().padStart(4, "0")}`;
};
var insertReaderAndUserTransaction = db.transaction((count) => {
  let teacherSeq = 1;
  let studentSeq = 1;
  for (let i = 0; i < count; i++) {
    const category = readerCategories[i % readerCategories.length];
    const isTeacher = category.code === "TEACHER";
    const isStudent = category.code === "STUDENT";
    let role;
    let readerNoPrefix;
    let sequence;
    if (isTeacher) {
      role = "teacher";
      readerNoPrefix = "T";
      sequence = teacherSeq++;
    } else if (isStudent) {
      role = "student";
      readerNoPrefix = "S";
      sequence = studentSeq++;
    } else {
      role = "student";
      readerNoPrefix = "S";
      sequence = studentSeq++;
    }
    const readerNo = generateReaderNo(readerNoPrefix, sequence);
    const name = surnames[Math.floor(Math.random() * surnames.length)] + names[Math.floor(Math.random() * names.length)] + names[Math.floor(Math.random() * names.length)];
    const username = `${role}${String(i + 1).padStart(3, "0")}`;
    const password = import_bcryptjs.default.hashSync("123456", 10);
    const gender = Math.random() > 0.5 ? "male" : "female";
    const idCard = `${110101}${1990 + Math.floor(Math.random() * 15)}${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 1e3)).padStart(3, "0")}X`;
    const organization = isTeacher ? "\u6559\u804C\u5DE5" : organizations[Math.floor(Math.random() * organizations.length)];
    const phone = `138${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
    const email = `${username}@example.com`;
    const address = `\u5317\u4EAC\u5E02\u6D77\u6DC0\u533A\u4E2D\u5173\u6751\u5927\u8857${Math.floor(Math.random() * 200) + 1}\u53F7`;
    const notes = `${category.name}\u8BFB\u8005`;
    const readerResult = insertReader.run(
      readerNo,
      name,
      category.id,
      null,
      gender,
      idCard,
      organization,
      phone,
      email,
      address,
      notes
    );
    const readerId = readerResult.lastInsertRowid;
    const userResult = insertUser.run(
      username,
      password,
      name,
      role,
      readerId,
      email,
      phone
    );
    const userId = userResult.lastInsertRowid;
    updateReaderUserId.run(userId, readerId);
  }
});
insertReaderAndUserTransaction(50);
console.log("\u2705 \u751F\u6210\u4E86 50 \u4E2A\u8BFB\u8005\u548C\u7528\u6237\uFF08\u53CC\u5411\u5173\u8054\uFF09");
console.log("   - \u9ED8\u8BA4\u5BC6\u7801: 123456");
console.log("   - \u7528\u6237\u540D\u683C\u5F0F: teacher001, student001, etc.\n");
console.log("\u{1F4D6} \u751F\u6210\u501F\u9605\u8BB0\u5F55...");
var readers = db.prepare("SELECT * FROM readers").all();
var books = db.prepare("SELECT * FROM books").all();
var insertBorrowing = db.prepare(`
  INSERT INTO borrowing_records (reader_id, book_id, borrow_date, due_date, return_date,
                                  renewal_count, status, fine_amount)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
var updateBookQuantity = db.prepare(`
  UPDATE books SET available_quantity = available_quantity - 1 WHERE id = ?
`);
var insertBorrowingTransaction = db.transaction((count) => {
  const usedPairs = /* @__PURE__ */ new Set();
  for (let i = 0; i < count; i++) {
    let reader, book, pairKey;
    let attempts = 0;
    do {
      reader = readers[Math.floor(Math.random() * readers.length)];
      book = books[Math.floor(Math.random() * books.length)];
      pairKey = `${reader.id}-${book.id}`;
      attempts++;
      if (attempts > 50) break;
    } while (usedPairs.has(pairKey));
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);
    const readerCategory = readerCategories.find((c) => c.id === reader.category_id);
    const borrowDays = readerCategory.max_borrow_days;
    const daysAgo = Math.floor(Math.random() * 90);
    const borrowDate = /* @__PURE__ */ new Date();
    borrowDate.setDate(borrowDate.getDate() - daysAgo);
    const borrowDateStr = borrowDate.toISOString().split("T")[0];
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + borrowDays);
    const dueDateStr = dueDate.toISOString().split("T")[0];
    const rand = Math.random();
    let status, returnDate, renewalCount, fineAmount;
    if (rand < 0.4) {
      status = "returned";
      const returnDay = Math.floor(Math.random() * borrowDays);
      const returnDateObj = new Date(borrowDate);
      returnDateObj.setDate(returnDateObj.getDate() + returnDay);
      returnDate = returnDateObj.toISOString().split("T")[0];
      renewalCount = Math.floor(Math.random() * 2);
      fineAmount = 0;
    } else if (rand < 0.6) {
      status = "returned";
      const overdueDays = Math.floor(Math.random() * 15) + 1;
      const returnDateObj = new Date(dueDate);
      returnDateObj.setDate(returnDateObj.getDate() + overdueDays);
      returnDate = returnDateObj.toISOString().split("T")[0];
      renewalCount = Math.floor(Math.random() * 3);
      fineAmount = overdueDays * 0.1;
    } else if (rand < 0.8) {
      status = "borrowed";
      returnDate = null;
      renewalCount = Math.floor(Math.random() * 2);
      fineAmount = 0;
      updateBookQuantity.run(book.id);
    } else {
      status = "overdue";
      returnDate = null;
      renewalCount = Math.floor(Math.random() * 3);
      const overdueDays = Math.max(0, Math.floor((/* @__PURE__ */ new Date() - dueDate) / (1e3 * 60 * 60 * 24)));
      fineAmount = overdueDays * 0.1;
      updateBookQuantity.run(book.id);
    }
    insertBorrowing.run(
      reader.id,
      book.id,
      borrowDateStr,
      dueDateStr,
      returnDate,
      renewalCount,
      status,
      fineAmount
    );
  }
});
insertBorrowingTransaction(150);
console.log("\u2705 \u751F\u6210\u4E86 150 \u6761\u501F\u9605\u8BB0\u5F55");
console.log("   - \u6B63\u5E38\u5F52\u8FD8: ~60 \u6761");
console.log("   - \u903E\u671F\u5F52\u8FD8: ~30 \u6761");
console.log("   - \u501F\u9605\u4E2D: ~30 \u6761");
console.log("   - \u903E\u671F\u672A\u8FD8: ~30 \u6761\n");
console.log("\u{1F4CA} \u6570\u636E\u7EDF\u8BA1:");
var totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get();
var totalBooks = db.prepare("SELECT COUNT(*) as count FROM books").get();
var totalReaders = db.prepare("SELECT COUNT(*) as count FROM readers").get();
var totalBorrowings = db.prepare("SELECT COUNT(*) as count FROM borrowing_records").get();
var activeBorrowings = db.prepare("SELECT COUNT(*) as count FROM borrowing_records WHERE status = 'borrowed' OR status = 'overdue'").get();
var overdueBorrowings = db.prepare("SELECT COUNT(*) as count FROM borrowing_records WHERE status = 'overdue'").get();
var totalFine = db.prepare("SELECT SUM(fine_amount) as total FROM borrowing_records").get();
console.log(`   \u7528\u6237\u603B\u6570: ${totalUsers.count}`);
console.log(`   \u56FE\u4E66\u603B\u6570: ${totalBooks.count}`);
console.log(`   \u8BFB\u8005\u603B\u6570: ${totalReaders.count}`);
console.log(`   \u501F\u9605\u8BB0\u5F55: ${totalBorrowings.count}`);
console.log(`   \u8FDB\u884C\u4E2D: ${activeBorrowings.count}`);
console.log(`   \u903E\u671F\u672A\u8FD8: ${overdueBorrowings.count}`);
console.log(`   \u603B\u7F5A\u6B3E: \xA5${(totalFine.total || 0).toFixed(2)}`);
console.log("\n\u2705 \u6D4B\u8BD5\u6570\u636E\u751F\u6210\u5B8C\u6210\uFF01");
console.log("\u{1F4A1} \u63D0\u793A: \u73B0\u5728\u53EF\u4EE5\u91CD\u542F\u5E94\u7528\u67E5\u770B\u751F\u6210\u7684\u6570\u636E");
db.close();
process.exit(0);
