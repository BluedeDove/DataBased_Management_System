# Encoding Issues and Solutions

## Problem 1: Log Output Garbled Text (乱码)

### Issue
When running the application in Windows CMD, console logs appear garbled:
```
鉁?鍚戦噺琛ㄥ垵濮嬪寲瀹屾垚
搴旂敤鍚姩涓?..
```

Instead of:
```
✅ 向量表初始化完成
应用启动中...
```

### Root Cause
- Application code uses UTF-8 encoding for Chinese characters
- Windows CMD expects GBK/ANSI encoding
- Mismatch causes garbled text in console output

### Solutions

#### Option 1: Use PowerShell (Recommended)
PowerShell has better UTF-8 support. Run:
```powershell
# Set UTF-8 encoding for current session
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001

# Then run the app
.\start-dev.bat
```

#### Option 2: Change CMD Code Page
```cmd
chcp 65001
start-dev.bat
```

#### Option 3: Create PowerShell Launcher
Create `start-dev.ps1`:
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PATH = "$PSScriptRoot\.node\node20;$env:PATH"
$env:ELECTRON_MIRROR = "https://cdn.npmmirror.com/binaries/electron/"
npm run dev
```

Then run: `powershell -ExecutionPolicy Bypass -File start-dev.ps1`

#### Option 4: Use Git Bash
Git Bash has built-in UTF-8 support:
```bash
./start-dev.sh
```

### Note
The garbled text is **cosmetic only** and does not affect functionality. The application works correctly regardless of how the logs are displayed.

---

## Problem 2: Database Constraint Error

### Issue
```
SqliteError: CHECK constraint failed: role IN ('admin', 'librarian')
```

### Root Cause
Application was using old compiled code (`dist-electron/`) with outdated database schema.

### Solution
Delete old files and restart:
```bash
# Delete old compiled code
rm -rf dist-electron

# Delete old database
rm -f library.db library.db-journal

# Restart app - it will recompile and reinitialize
.\start-dev.bat
```

This forces the app to:
1. Recompile with latest source code
2. Create fresh database with updated schema (4 roles: admin, librarian, teacher, student)
3. Seed test users

---

## Summary

- **Garbled logs**: Cosmetic issue, use PowerShell or `chcp 65001` for proper display
- **Database errors**: Fixed by deleting old files before restart
- **Bat file encoding**: Already fixed (pure ASCII, no Chinese characters)

The application is fully functional. The garbled text only affects console readability.
