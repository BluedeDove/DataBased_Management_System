# PDF生成脚本

## 使用说明

1. 将此文件重命名为 `generate-pdf.ts`
2. 安装依赖：`npm install pdf-lib markdown-it jsdom @types/node`
3. 运行脚本：`npm run generate-pdf`

## 脚本代码

```typescript
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import markdownToHtml from 'markdown-it';
import { JSDOM } from 'jsdom';

// 配置
const REPORT_DIR = path.join(__dirname, '..', 'database-course-design-report');
const OUTPUT_FILE = path.join(__dirname, '..', 'database-course-design-report.pdf');
const FONTS_DIR = path.join(__dirname, '..', 'fonts');

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

// Markdown转HTML
const md = markdownToHtml();

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
  return md.render(markdown);
}

// 创建PDF文档
async function createPDF(): Promise<void> {
  console.log('开始生成PDF...');

  // 创建PDF文档
  const pdfDoc = await PDFDocument.create();
  const pageWidth = 595.28; // A4宽度
  const pageHeight = 841.89; // A4高度
  const margin = 50;

  // 加载字体
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontChinese = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  // 添加标题
  const title = '智能图书馆管理系统 - 数据库课程设计报告';
  const titleSize = 24;
  const titleWidth = fontBold.widthOfTextAtSize(title, titleSize).width;
  const titleX = (pageWidth - titleWidth) / 2;
  
  currentPage.drawText(title, {
    x: titleX,
    y: yPosition,
    size: titleSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  yPosition -= 40;

  // 添加目录
  yPosition = await addTableOfContents(pdfDoc, currentPage, yPosition, margin, font, fontBold);  
  if (yPosition < margin) {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - margin;
  }

  // 添加章节内容
  for (const chapter of CHAPTERS) {
    yPosition = await addChapter(pdfDoc, currentPage, yPosition, margin, font, fontBold, chapter);
    
    if (yPosition < margin) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }
  }

  // 保存PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(OUTPUT_FILE, pdfBytes);

  console.log(`PDF生成完成: ${OUTPUT_FILE}`);
}

// 添加目录
async function addTableOfContents(
  pdfDoc: any,
  currentPage: any,
  yPosition: number,
  margin: number,
  font: any,
  fontBold: any
): Promise<number> {
  // 添加目录标题
  currentPage.drawText('目录', {
    x: margin,
    y: yPosition,
    size: 18,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  yPosition -= 30;

  // 添加目录项
  const fontSize = 12;
  const lineHeight = 20;

  for (const chapter of CHAPTERS) {
    currentPage.drawText(`${chapter.title}`, {
      x: margin + 20,
      y: yPosition,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    yPosition -= lineHeight;

    if (yPosition < margin) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }
  }

  return yPosition - 20;
}

// 添加章节
async function addChapter(
  pdfDoc: any,
  currentPage: any,
  yPosition: number,
  margin: number,
  font: any,
  fontBold: any,
  chapter: any
): Promise<number> {
  // 添加章节标题
  currentPage.drawText(chapter.title, {
    x: margin,
    y: yPosition,
    size: 16,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  yPosition -= 25;

  // 添加章节内容
  for (const file of chapter.files) {
    const filePath = path.join(REPORT_DIR, chapter.id, file);
    const markdown = readMarkdownFile(filePath);
    
    if (markdown) {
      const html = markdownToHtml(markdown);
      yPosition = await addHtmlContent(pdfDoc, currentPage, yPosition, margin, font, html);
    }
  }

  return yPosition - 20;
}

// 添加HTML内容
async function addHtmlContent(
  pdfDoc: any,
  currentPage: any,
  yPosition: number,
  margin: number,
  font: any,
  html: string
): Promise<number> {
  // 使用JSDOM解析HTML
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // 提取文本内容
  const text = document.body?.textContent || '';
  const lines = text.split('\n');

  const fontSize = 11;
  const lineHeight = 16;

  for (const line of lines) {
    if (line.trim()) {
      currentPage.drawText(line, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      yPosition -= lineHeight;

      if (yPosition < margin) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }
    }
  }

  return yPosition;
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
```

## package.json配置

需要在`package.json`中添加以下脚本：

```json
{
  "scripts": {
    "generate-pdf": "ts-node scripts/generate-pdf.ts"
  }
}
```

## 依赖安装

```bash
npm install pdf-lib markdown-it jsdom @types/node
```

## 运行脚本

```bash
npm run generate-pdf
```

## 功能说明

1. **自动读取章节**：自动读取`database-course-design-report`文件夹中的所有章节文件
2. **生成目录**：自动生成目录，包含所有章节标题
3. **添加章节内容**：自动添加每个章节的内容
4. **分页处理**：自动处理分页，确保内容不会超出页面边界
5. **生成PDF**：生成A4格式的PDF文件

## 输出文件

生成的PDF文件将保存在项目根目录下的`database-course-design-report.pdf`。

## 注意事项

1. 确保所有章节文件都存在
2. 确保所有章节文件都是UTF-8编码
3. 确保已安装所有依赖
4. 如果生成失败，检查控制台错误信息
