import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

// 配置
const REPORT_DIR = path.join(__dirname, '..', 'database-course-design-report');
const OUTPUT_FILE = path.join(__dirname, '..', 'database-course-design-report.pdf');

// 章节定义
const CHAPTERS = [
  { id: 'chapter1', title: '第1章 项目概述与背景', files: ['1.1-project-background.md', '1.2-project-objectives.md', '1.3-technology-selection.md', '1.4-development-environment.md'] },
  { id: 'chapter2', title: '第2章 系统架构设计', files: ['2.1-overall-architecture.md'] },
  { id: 'chapter3', title: '第3章 数据库设计', files: ['3.1-database-selection.md', '3.2-conceptual-design.md', '3.3-logical-design.md', '3.4-physical-design.md', '3.5-index-design.md', '3.6-data-integrity.md', '3.7-summary.md'] },
  { id: 'chapter4', title: '第4章 核心功能实现', files: ['4.1-authentication.md', '4.2-book-management.md', '4.3-reader-management.md', '4.4-borrowing-management.md', '4.5-data-export.md', '4.6-summary.md'] },
  { id: 'chapter5', title: '第5章 AI功能实现', files: ['5.1-ai-overview.md', '5.2-ai-chat.md', '5.3-semantic-search.md', '5.4-book-recommendation.md', '5.5-summary.md'] },
  { id: 'chapter6', title: '第6章 前端设计与实现', files: ['6.1-frontend-overview.md'] },
  { id: 'chapter7', title: '第7章 安全机制', files: ['7.1-authentication-security.md', '7.2-authorization.md', '7.3-soft-delete.md', '7.4-optimistic-lock.md', '7.5-summary.md'] },
  { id: 'chapter8', title: '第8章 测试与部署', files: ['8.1-testing-overview.md', '8.2-unit-testing.md', '8.3-integration-testing.md', '8.4-e2e-testing.md', '8.5-deployment.md', '8.6-summary.md'] },
  { id: 'chapter9', title: '第9章 项目特色与创新点', files: ['9.1-architecture-innovation.md', '9.2-technology-innovation.md', '9.3-feature-innovation.md', '9.4-summary.md'] },
  { id: 'chapter10', title: '第10章 总结与展望', files: ['10.1-project-summary.md', '10.2-project-outlook.md', '10.3-summary.md'] },
  { id: 'appendixA', title: '附录A 数据库表结构与ER图', files: ['A-database-schema.md'] },
  { id: 'appendixB', title: '附录B API文档', files: ['B-api-documentation.md'] },
  { id: 'appendixC', title: '附录C 配置文件', files: ['C-config-files.md'] },
  { id: 'appendixD', title: '附录D Git提交历史', files: ['D-git-history.md'] },
];

// 读取Markdown文件
function readMarkdownFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error);
    return '';
  }
}

// Markdown转HTML
function markdownToHtml(markdown: string): string {
  let html = markdown;
  
  // 标题转换
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // 代码块转换
  html = html.replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  
  // 行内代码转换
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // 粗体转换
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // 斜体转换
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // 表格转换（简单处理）
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
  });
  
  // 列表转换
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // 段落转换
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  return html;
}

// 生成HTML
function generateHtml(): string {
  let html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>智能图书馆管理系统 - 数据库课程设计报告</title>
  <style>
    body {
      font-family: 'Microsoft YaHei', 'SimHei', Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      font-size: 12px;
    }
    h1 {
      font-size: 24px;
      color: #333;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-top: 30px;
    }
    h2 {
      font-size: 18px;
      color: #444;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
      margin-top: 25px;
    }
    h3 {
      font-size: 14px;
      color: #555;
      margin-top: 20px;
    }
    p {
      margin: 10px 0;
      text-align: justify;
    }
    pre {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 5px;
      overflow-x: auto;
      font-size: 10px;
      line-height: 1.4;
    }
    code {
      background: #f0f0f0;
      padding: 2px 5px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 11px;
    }
    pre code {
      background: none;
      padding: 0;
    }
    ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    li {
      margin: 5px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 11px;
    }
    td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    .toc {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .toc h2 {
      margin-top: 0;
      border: none;
    }
    .toc ul {
      list-style-type: none;
      padding-left: 0;
    }
    .toc li {
      margin: 5px 0;
    }
    .toc a {
      color: #0066cc;
      text-decoration: none;
    }
    .toc a:hover {
      text-decoration: underline;
    }
    .chapter {
      page-break-after: always;
    }
    .image-placeholder {
      border: 2px dashed #ccc;
      padding: 20px;
      text-align: center;
      margin: 20px 0;
      background: #f9f9f9;
    }
    .image-placeholder-text {
      color: #999;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>智能图书馆管理系统 - 数据库课程设计报告</h1>
  
  <div class="toc">
    <h2>目录</h2>
    <ul>
`;

  // 添加目录
  for (const chapter of CHAPTERS) {
    html += `      <li><a href="#${chapter.id}">${chapter.title}</a></li>\n`;
  }

  html += `    </ul>
  </div>
`;

  // 添加章节内容
  for (const chapter of CHAPTERS) {
    html += `  <div class="chapter" id="${chapter.id}">\n`;
    html += `    <h2>${chapter.title}</h2>\n`;
    
    for (const file of chapter.files) {
      const filePath = path.join(REPORT_DIR, chapter.id, file);
      const markdown = readMarkdownFile(filePath);
      
      if (markdown) {
        html += `    ${markdownToHtml(markdown)}\n`;
      }
    }
    
    html += `  </div>\n`;
  }

  html += `
</body>
</html>
`;

  return html;
}

// 创建PDF
async function createPDF(): Promise<void> {
  console.log('开始生成PDF...');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const html = generateHtml();
  
  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: OUTPUT_FILE,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px',
    },
  });

  await browser.close();

  console.log(`PDF生成完成: ${OUTPUT_FILE}`);
}

// 主函数
async function main(): Promise<void> {
  try {
    await createPDF();
  } catch (error) {
    console.error('生成PDF失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main();
