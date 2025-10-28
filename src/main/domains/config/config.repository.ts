import { db } from '../../database'
import { NotFoundError } from '../../lib/errorHandler'

export interface SystemSetting {
  id: number
  setting_key: string
  setting_value: string | null
  setting_type: 'string' | 'number' | 'boolean' | 'json'
  category: 'ai' | 'system' | 'business'
  description?: string
  is_encrypted: boolean
  created_at: string
  updated_at: string
}

export class ConfigRepository {
  getSetting(key: string): SystemSetting | undefined {
    const stmt = db.prepare('SELECT * FROM system_settings WHERE setting_key = ?')
    return stmt.get(key) as SystemSetting | undefined
  }

  getAllByCategory(category: string): SystemSetting[] {
    const stmt = db.prepare('SELECT * FROM system_settings WHERE category = ? ORDER BY setting_key')
    return stmt.all(category) as SystemSetting[]
  }

  setSetting(key: string, value: string, type: string, category: string, description?: string): void {
    const stmt = db.prepare(`
      INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = CURRENT_TIMESTAMP
    `)
    stmt.run(key, value, type, category, description)
  }

  updateSetting(key: string, value: string): void {
    const stmt = db.prepare(`
      UPDATE system_settings
      SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
      WHERE setting_key = ?
    `)
    const result = stmt.run(value, key)
    if (result.changes === 0) {
      throw new NotFoundError('设置项')
    }
  }
}
