import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import mermaid from 'mermaid';

// 配置
const REPORT_DIR = path.join(__dirname, '..', 'database-course-design-report');
const OUTPUT_FILE = path.join(__dirname, '..', 'database-course-design-report.pdf');
const TEMP_MD_FILE = path.join(__dirname, '..', 'database-course-design-report', 'combined.md');
const IMAGES_DIR = path.join(__dirname, '..', 'database-course-design-report', 'images');

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

// 初始化 Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

// Mermaid 图表计数器
let mermaidCounter = 0;

// 读取Markdown文件
function readMarkdownFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error);
    return '';
  }
}

// 处理 Mermaid 图表
async function processMermaidDiagrams(markdown: string, chapterId: string): Promise<string> {
  // 匹配 ```mermaid ... ``` 代码块
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;

  let processedMarkdown = markdown;
  let match;

  while ((match = mermaidRegex.exec(markdown)) !== null) {
    mermaidCounter++;
    const diagramCode = match[1];
    const diagramId = `mermaid-${chapterId}-${mermaidCounter}`;
    const imagePath = path.join(IMAGES_DIR, `${diagramId}.svg`);

    try {
      // 生成 SVG
      const { svg } = await mermaid.render(diagramId, diagramCode);

      // 确保图片目录存在
      if (!fs.existsSync(IMAGES_DIR)) {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
      }

      // 保存 SVG 文件
      fs.writeFileSync(imagePath, svg, 'utf-8');

      // 替换 Mermaid 代码块为图片引用
      const relativeImagePath = `./images/${diagramId}.svg`;
      processedMarkdown = processedMarkdown.replace(match[0], `
![Mermaid图表](${relativeImagePath})
`);

      console.log(`已生成 Mermaid 图表: ${diagramId}`);
    } catch (error) {
      console.error(`生成 Mermaid 图表失败 (${diagramId}):`, error);
      // 如果失败，保留原始代码块
    }
  }

  return processedMarkdown;
}

// 生成目录
function generateTOC(): string {
  let toc = '\n# 目录\n\n';

  for (const chapter of CHAPTERS) {
    toc += `- [${chapter.title}](#${chapter.id})\n`;
  }

  return toc;
}

// 生成合并的Markdown文件
async function generateCombinedMarkdown(): Promise<string> {
  let content = `# 智能图书馆管理系统 - 数据库课程设计报告

---

${generateTOC()}

---
`;

  for (const chapter of CHAPTERS) {
    content += `\n<a id="${chapter.id}"></a>\n\n# ${chapter.title}\n\n---\n\n`;

    for (const file of chapter.files) {
      const filePath = path.join(REPORT_DIR, chapter.id, file);
      let fileContent = readMarkdownFile(filePath);

      if (fileContent) {
        // 处理 Mermaid 图表
        fileContent = await processMermaidDiagrams(fileContent, chapter.id);
        content += fileContent + '\n\n---\n\n';
      }
    }
  }

  return content;
}

// 使用Pandoc生成PDF
async function generatePDFWithPandoc(): Promise<void> {
  console.log('开始生成PDF...');

  // 检查Pandoc是否安装
  try {
    execSync('pandoc --version', { stdio: 'pipe' });
    console.log('检测到 Pandoc');
  } catch (error) {
    console.error('未检测到 Pandoc，请先安装 Pandoc: https://pandoc.org/installing.html');
    process.exit(1);
  }

  // 生成合并的Markdown文件
  console.log('正在合并 Markdown 文件...');
  const combinedMarkdown = await generateCombinedMarkdown();
  fs.writeFileSync(TEMP_MD_FILE, combinedMarkdown, 'utf-8');
  console.log('合并完成:', TEMP_MD_FILE);

  // 使用Pandoc生成PDF
  console.log('正在使用 Pandoc 生成 PDF...');

  const pandocArgs = [
    `"${TEMP_MD_FILE}"`,
    `-o "${OUTPUT_FILE}"`,
    `--pdf-engine=xelatex`,
    `-V mainfont="Microsoft YaHei"`,
    `-V sansfont="Microsoft YaHei"`,
    `-V CJKmainfont="Microsoft YaHei"`,
    `-V geometry:margin=2.5cm`,
    `-V fontsize=12pt`,
    `-V linestretch=1.5`,
    `-V colorlinks=true`,
    `-V linkcolor=blue`,
    `-V urlcolor=blue`,
    `-V toc`,
    `-V toc-title=目录`,
    `-V toc-depth=2`,
    `--number-sections`,
    `--highlight-style=tango`,
    `-f markdown`,
    `-t pdf`,
  ].join(' ');

  try {
    execSync(`pandoc ${pandocArgs}`, { stdio: 'inherit' });
    console.log(`PDF 生成成功: ${OUTPUT_FILE}`);

    // 清理临时文件
    fs.unlinkSync(TEMP_MD_FILE);
    console.log('临时文件已清理');
  } catch (error) {
    console.error('PDF 生成失败:', error);
    process.exit(1);
  }
}

// 主函数
async function main(): Promise<void> {
  try {
    await generatePDFWithPandoc();
  } catch (error) {
    console.error('生成PDF失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main();
