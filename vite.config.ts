import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'
import { builtinModules } from 'node:module'
import type { Plugin } from 'vite'
// 读取 package.json，用于自动排除依赖
import pkg from './package.json'

// 自定义插件：修复 electron 模块的导入问题
function fixElectronImport(): Plugin {
  return {
    name: 'fix-electron-import',
    generateBundle(options, bundle) {
      const fileName = 'index.js'
      const file = bundle[fileName]
      if (file && file.type === 'chunk' && typeof file.code === 'string') {
        // 不需要添加任何 electron 导入
        // vite-plugin-electron 会自动处理 electron 模块的加载
        // 在 Electron 环境中，require("electron") 会返回正确的 API 对象
        
        // 移除文件以避免 ESLint 错误
        // file.code = file.code
      }
    }
  }
}

export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        entry: 'src/main/index.ts',
        vite: {
          plugins: [fixElectronImport()],
          build: {
            outDir: 'dist-electron/main',
            sourcemap: true,
            minify: false,
            rollupOptions: {
              external: [
                'electron',
                ...builtinModules,
                ...Object.keys(pkg.dependencies || {}),
              ],
            },
          },
        },
      },
      {
        entry: 'src/preload/index.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            sourcemap: true,
            minify: false,
            rollupOptions: {
              external: ['electron', ...builtinModules],
            },
          },
        },
      },
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@main': resolve(__dirname, 'src/main')
    }
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist-renderer'
  }
})
