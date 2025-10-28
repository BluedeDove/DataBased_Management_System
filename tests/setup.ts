// Vitest setup file
import { vi } from 'vitest'

// Mock Electron APIs
global.window = global.window || {}
;(global.window as any).api = {
  auth: {},
  book: {},
  reader: {},
  borrowing: {},
  ai: {}
}
