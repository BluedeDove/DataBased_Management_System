import { app, BrowserWindow } from 'electron'
import path from 'path'
import { setupDatabase } from './database'
import { registerIpcHandlers } from './lib/ipcHandlers'
import { logger } from './lib/logger'

// 开发环境检测
const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    frame: true,
    show: false,
    backgroundColor: '#f5f7fa'
  })

  // 窗口准备好后再显示，避免闪烁
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    // 开发环境打开开发工具
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist-renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Electron 应用就绪
app.whenReady().then(() => {
  logger.info('应用启动中...')

  // 初始化数据库
  try {
    setupDatabase()
  } catch (error) {
    logger.error('数据库初始化失败', error)
    app.quit()
    return
  }

  // 注册 IPC 处理器
  registerIpcHandlers()

  // 创建主窗口
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  logger.info('应用启动成功')
})

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前清理
app.on('before-quit', () => {
  logger.info('应用正在退出...')
})
