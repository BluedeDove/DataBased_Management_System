import { db } from '../../database'
import { NotFoundError } from '../../lib/errorHandler'

export interface User {
  id: number
  username: string
  password: string
  name: string
  role: 'admin' | 'librarian'
  email?: string
  phone?: string
  created_at: string
  updated_at: string
}

export class UserRepository {
  findByUsername(username: string): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?')
    return stmt.get(username) as User | undefined
  }

  findById(id: number): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
    return stmt.get(id) as User | undefined
  }

  create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    const stmt = db.prepare(`
      INSERT INTO users (username, password, name, role, email, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(user.username, user.password, user.name, user.role, user.email, user.phone)

    const created = this.findById(result.lastInsertRowid as number)
    if (!created) {
      throw new NotFoundError('用户')
    }
    return created
  }

  update(id: number, updates: Partial<User>): User {
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.email !== undefined) {
      fields.push('email = ?')
      values.push(updates.email)
    }
    if (updates.phone !== undefined) {
      fields.push('phone = ?')
      values.push(updates.phone)
    }
    if (updates.password !== undefined) {
      fields.push('password = ?')
      values.push(updates.password)
    }

    if (fields.length === 0) {
      const user = this.findById(id)
      if (!user) throw new NotFoundError('用户')
      return user
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)

    const updated = this.findById(id)
    if (!updated) throw new NotFoundError('用户')
    return updated
  }

  findAll(): User[] {
    const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC')
    return stmt.all() as User[]
  }
}
