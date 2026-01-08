# 使用 Pandoc 将数据库课程设计报告的 Markdown 文件整合并生成 PDF
# 使用方法: .\scripts\generate-pdf-pandoc.ps1

$ErrorActionPreference = "Stop"

# 配置
$REPORT_DIR = "database-course-design-report"
$OUTPUT_FILE = "database-course-design-report.pdf"
$TEMP_MD_FILE = "$REPORT_DIR\combined.md"

# 定义章节和文件顺序
$CHAPTERS = @(
    @{ id = "chapter1"; title = "第1章 项目概述与背景"; files = @(
        "1.1-project-background.md",
        "1.2-project-objectives.md",
        "1.3-technology-selection.md",
        "1.4-development-environment.md"
    )},
    @{ id = "chapter2"; title = "第2章 系统架构设计"; files = @(
        "2.1-overall-architecture.md"
    )},
    @{ id = "chapter3"; title = "第3章 数据库设计"; files = @(
        "3.1-database-selection.md",
        "3.2-conceptual-design.md",
        "3.3-logical-design.md",
        "3.4-physical-design.md",
        "3.5-index-design.md",
        "3.6-data-integrity.md",
        "3.7-summary.md"
    )},
    @{ id = "chapter4"; title = "第4章 核心功能实现"; files = @(
        "4.1-authentication.md",
        "4.2-book-management.md",
        "4.3-reader-management.md",
        "4.4-borrowing-management.md",
        "4.5-data-export.md",
        "4.6-summary.md"
    )},
    @{ id = "chapter5"; title = "第5章 AI功能实现"; files = @(
        "5.1-ai-overview.md",
        "5.2-ai-chat.md",
        "5.3-semantic-search.md",
        "5.4-book-recommendation.md",
        "5.5-summary.md"
    )},
    @{ id = "chapter6"; title = "第6章 前端设计与实现"; files = @(
        "6.1-frontend-overview.md"
    )},
    @{ id = "chapter7"; title = "第7章 安全机制"; files = @(
        "7.1-authentication-security.md",
        "7.2-authorization.md",
        "7.3-soft-delete.md",
        "7.4-optimistic-lock.md",
        "7.5-summary.md"
    )},
    @{ id = "chapter8"; title = "第8章 测试与部署"; files = @(
        "8.1-testing-overview.md",
        "8.2-unit-testing.md",
        "8.3-integration-testing.md",
        "8.4-e2e-testing.md",
        "8.5-deployment.md",
        "8.6-summary.md"
    )},
    @{ id = "chapter9"; title = "第9章 项目特色与创新点"; files = @(
        "9.1-architecture-innovation.md",
        "9.2-technology-innovation.md",
        "9.3-feature-innovation.md",
        "9.4-summary.md"
    )},
    @{ id = "chapter10"; title = "第10章 总结与展望"; files = @(
        "10.1-project-summary.md",
        "10.2-project-outlook.md",
        "10.3-summary.md"
    )},
    @{ id = "appendixA"; title = "附录A 数据库表结构与ER图"; files = @(
        "A-database-schema.md"
    )},
    @{ id = "appendixB"; title = "附录B API文档"; files = @(
        "B-api-documentation.md"
    )},
    @{ id = "appendixC"; title = "附录C 配置文件"; files = @(
        "C-config-files.md"
    )},
    @{ id = "appendixD"; title = "附录D Git提交历史"; files = @(
        "D-git-history.md"
    )}
)

# 读取 Markdown 文件内容
function Read-MarkdownFile {
    param([string]$FilePath)

    if (-not (Test-Path $FilePath)) {
        Write-Warning "文件不存在: $FilePath"
        return ""
    }

    return Get-Content $FilePath -Raw -Encoding UTF8
}

# 生成目录
function Generate-TOC {
    $toc = @"

# 目录

"@

    foreach ($chapter in $CHAPTERS) {
        $toc += "- [$($chapter.title)](#$($chapter.id))`n"
    }

    return $toc
}

# 生成合并的 Markdown 文件
function Generate-CombinedMarkdown {
    $content = @"

# 智能图书馆管理系统 - 数据库课程设计报告

---

$(Generate-TOC)

---

"@

    foreach ($chapter in $CHAPTERS) {
        $content += @"

<a id="$($chapter.id)"></a>

# $($chapter.title)

---

"@

        foreach ($file in $chapter.files) {
            $filePath = Join-Path $REPORT_DIR $chapter.id $file
            $fileContent = Read-MarkdownFile $filePath

            if ($fileContent) {
                $content += $fileContent + "`n`n---`n`n"
            }
        }
    }

    return $content
}

# 主函数
function Main {
    Write-Host "开始生成 PDF..." -ForegroundColor Green

    # 检查 Pandoc 是否安装
    try {
        $pandocVersion = pandoc --version 2>&1 | Select-Object -First 1
        Write-Host "检测到 Pandoc: $pandocVersion" -ForegroundColor Cyan
    }
    catch {
        Write-Error "未检测到 Pandoc，请先安装 Pandoc: https://pandoc.org/installing.html"
        exit 1
    }

    # 生成合并的 Markdown 文件
    Write-Host "正在合并 Markdown 文件..." -ForegroundColor Yellow
    $combinedMarkdown = Generate-CombinedMarkdown
    $combinedMarkdown | Out-File -FilePath $TEMP_MD_FILE -Encoding UTF8 -NoNewline
    Write-Host "合并完成: $TEMP_MD_FILE" -ForegroundColor Green

    # 使用 Pandoc 生成 PDF
    Write-Host "正在使用 Pandoc 生成 PDF..." -ForegroundColor Yellow

    $pandocArgs = @(
        $TEMP_MD_FILE,
        "-o", $OUTPUT_FILE,
        "--pdf-engine=xelatex",
        "-V", "mainfont=Microsoft YaHei",
        "-V", "sansfont=Microsoft YaHei",
        "-V", "CJKmainfont=Microsoft YaHei",
        "-V", "geometry:margin=2.5cm",
        "-V", "fontsize=12pt",
        "-V", "linestretch=1.5",
        "-V", "colorlinks=true",
        "-V", "linkcolor=blue",
        "-V", "urlcolor=blue",
        "-V", "toc",
        "-V", "toc-title=目录",
        "-V", "toc-depth=2",
        "--number-sections",
        "--highlight-style=tango",
        "-f", "markdown",
        "-t", "pdf"
    )

    & pandoc @pandocArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host "PDF 生成成功: $OUTPUT_FILE" -ForegroundColor Green

        # 清理临时文件
        Remove-Item $TEMP_MD_FILE -Force
        Write-Host "临时文件已清理" -ForegroundColor Cyan
    }
    else {
        Write-Error "PDF 生成失败"
        exit 1
    }
}

# 执行主函数
Main
