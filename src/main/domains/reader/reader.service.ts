import { ReaderRepository, Reader, ReaderCategory, ReaderWithCategory } from './reader.repository'
import { ValidationError, BusinessError, NotFoundError } from '../../lib/errorHandler'
import { logger } from '../../lib/logger'

export class ReaderService {
  private readerRepository = new ReaderRepository()

  // 读者种类管理
  getAllCategories(): ReaderCategory[] {
    return this.readerRepository.findAllCategories()
  }

  getCategoryById(id: number): ReaderCategory {
    const category = this.readerRepository.findCategoryById(id)
    if (!category) {
      throw new NotFoundError('读者种类')
    }
    return category
  }

  createCategory(data: Omit<ReaderCategory, 'id' | 'created_at' | 'updated_at'>): ReaderCategory {
    // 验证
    if (!data.code || !data.name) {
      throw new ValidationError('种类编码和名称不能为空')
    }
    if (data.max_borrow_count < 1) {
      throw new ValidationError('最大借阅数量必须大于0')
    }
    if (data.max_borrow_days < 1) {
      throw new ValidationError('最大借阅天数必须大于0')
    }

    logger.info('创建读者种类', data.name)
    return this.readerRepository.createCategory(data)
  }

  updateCategory(id: number, updates: Partial<ReaderCategory>): ReaderCategory {
    const existing = this.getCategoryById(id)
    logger.info('更新读者种类', existing.name)
    return this.readerRepository.updateCategory(id, updates)
  }

  // 读者管理
  getAllReaders(filters?: { status?: string; category_id?: number }): ReaderWithCategory[] {
    return this.readerRepository.findAll(filters)
  }

  getReaderById(id: number): ReaderWithCategory {
    const reader = this.readerRepository.findById(id)
    if (!reader) {
      throw new NotFoundError('读者')
    }
    return reader
  }

  getReaderByNo(readerNo: string): ReaderWithCategory {
    const reader = this.readerRepository.findByReaderNo(readerNo)
    if (!reader) {
      throw new NotFoundError('读者')
    }
    return reader
  }

  createReader(data: Omit<Reader, 'id' | 'created_at' | 'updated_at'>): Reader {
    logger.info('========== [后端] 开始创建读者 ==========')
    logger.info('[后端] 接收到的数据:', JSON.stringify(data, null, 2))

    // 验证
    logger.info('[后端] 开始验证数据...')
    if (!data.name || !data.category_id) {
      logger.error('[后端] 验证失败: 姓名或种类为空', { name: data.name, category_id: data.category_id })
      throw new ValidationError('姓名和种类不能为空')
    }
    logger.info('[后端] 数据验证通过')

    // 检查种类是否存在
    logger.info('[后端] 查找读者种类，ID:', data.category_id)
    const category = this.readerRepository.findCategoryById(data.category_id)
    if (!category) {
      logger.error('[后端] 读者种类不存在:', data.category_id)
      throw new NotFoundError('读者种类')
    }
    logger.info('[后端] 找到读者种类:', category.name)

    // 自动生成编号（如果为空或为 'AUTO'）
    logger.info('[后端] 检查读者编号:', { reader_no: data.reader_no, trimmed: data.reader_no?.trim(), upper: data.reader_no?.toUpperCase() })
    if (!data.reader_no || data.reader_no.trim() === '' || data.reader_no.toUpperCase() === 'AUTO') {
      logger.info('[后端] 需要自动生成编号')
      data.reader_no = this.readerRepository.generateNextReaderNo(data.category_id)
      logger.info('[后端] 自动生成读者编号:', data.reader_no)
    } else {
      // 检查读者编号是否已存在
      logger.info('[后端] 检查读者编号是否已存在:', data.reader_no)
      const existing = this.readerRepository.findByReaderNo(data.reader_no)
      if (existing) {
        logger.error('[后端] 读者编号已存在:', data.reader_no)
        throw new BusinessError('读者编号已存在')
      }
      logger.info('[后端] 读者编号可用')
    }

    // 计算有效期
    if (!data.expiry_date) {
      logger.info('[后端] 计算有效期，validity_days:', category.validity_days)
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + category.validity_days)
      data.expiry_date = expiryDate.toISOString().split('T')[0]
      logger.info('[后端] 计算出的有效期:', data.expiry_date)
    }

    logger.info('[后端] 准备创建读者到数据库...')
    logger.info('[后端] 最终数据:', JSON.stringify(data, null, 2))
    const result = this.readerRepository.create(data)
    logger.info('[后端] 读者创建成功，ID:', result.id)
    logger.info('========== [后端] 读者创建结束 ==========\n')
    return result
  }

  updateReader(id: number, updates: Partial<Reader>): Reader {
    const existing = this.getReaderById(id)

    // 如果更新了种类，需要重新计算有效期
    if (updates.category_id && updates.category_id !== existing.category_id) {
      const category = this.readerRepository.findCategoryById(updates.category_id)
      if (!category) {
        throw new NotFoundError('读者种类')
      }
      // 从当前日期开始计算新的有效期
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + category.validity_days)
      updates.expiry_date = expiryDate.toISOString().split('T')[0]
    }

    logger.info('更新读者信息', existing.name)
    return this.readerRepository.update(id, updates)
  }

  searchReaders(keyword: string): ReaderWithCategory[] {
    if (!keyword || keyword.trim().length === 0) {
      return this.getAllReaders()
    }
    return this.readerRepository.search(keyword.trim())
  }

  // 挂失读者证（停用）
  suspendReader(id: number, reason?: string): Reader {
    logger.warn('挂失读者证', id, reason)
    return this.readerRepository.update(id, {
      status: 'suspended',
      notes: reason ? `挂失原因：${reason}` : '读者证已挂失'
    })
  }

  // 激活读者证
  activateReader(id: number): Reader {
    const reader = this.getReaderById(id)

    // 检查是否过期
    if (reader.expiry_date && new Date(reader.expiry_date) < new Date()) {
      throw new BusinessError('读者证已过期，请先续期')
    }

    logger.info('激活读者证', id)
    return this.readerRepository.update(id, { status: 'active' })
  }

  // 续期
  renewReader(id: number, additionalDays: number): Reader {
    const reader = this.getReaderById(id)

    let newExpiryDate: Date
    if (reader.expiry_date && new Date(reader.expiry_date) > new Date()) {
      // 如果还未过期，从原有效期延长
      newExpiryDate = new Date(reader.expiry_date)
    } else {
      // 如果已过期，从今天开始计算
      newExpiryDate = new Date()
    }

    newExpiryDate.setDate(newExpiryDate.getDate() + additionalDays)

    logger.info('读者续期', reader.name, additionalDays)
    return this.readerRepository.update(id, {
      expiry_date: newExpiryDate.toISOString().split('T')[0],
      status: 'active'
    })
  }

  // 检查读者是否可以借书
  canBorrow(readerId: number): { canBorrow: boolean; reason?: string } {
    const reader = this.readerRepository.findById(readerId)
    if (!reader) {
      return { canBorrow: false, reason: '读者不存在' }
    }

    if (reader.status !== 'active') {
      return { canBorrow: false, reason: '读者证未激活或已挂失' }
    }

    if (reader.expiry_date && new Date(reader.expiry_date) < new Date()) {
      return { canBorrow: false, reason: '读者证已过期' }
    }

    const currentBorrowCount = this.readerRepository.getBorrowingCount(readerId)
    if (currentBorrowCount >= reader.max_borrow_count) {
      return { canBorrow: false, reason: `已达到最大借阅数量（${reader.max_borrow_count}本）` }
    }

    if (this.readerRepository.hasOverdueBooks(readerId)) {
      return { canBorrow: false, reason: '有图书逾期未还' }
    }

    return { canBorrow: true }
  }

  // 获取读者借阅统计
  getReaderStatistics(readerId: number): {
    totalBorrowed: number
    currentBorrowing: number
    overdueCount: number
  } {
    // Validate reader exists
    this.getReaderById(readerId)

    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total_borrowed,
        SUM(CASE WHEN status = 'borrowed' THEN 1 ELSE 0 END) as current_borrowing,
        SUM(CASE WHEN status = 'borrowed' AND due_date < date('now') THEN 1 ELSE 0 END) as overdue_count
      FROM borrowing_records
      WHERE reader_id = ?
    `)

    const stats = stmt.get(readerId) as any
    return {
      totalBorrowed: stats.total_borrowed || 0,
      currentBorrowing: stats.current_borrowing || 0,
      overdueCount: stats.overdue_count || 0
    }
  }

  // 删除读者
  deleteReader(id: number): void {
    console.log('========== [Service] 开始删除读者 ==========')
    console.log('[Service] Reader ID:', id)

    const reader = this.getReaderById(id)
    console.log('[Service] 读者信息:', { name: reader.name, reader_no: reader.reader_no })

    // 检查是否有未归还的借阅记录
    console.log('[Service] 检查借阅记录...')
    const borrowingStmt = db.prepare(`
      SELECT COUNT(*) as count FROM borrowing_records
      WHERE reader_id = ? AND status IN ('borrowed', 'overdue')
    `)
    const result = borrowingStmt.get(id) as { count: number }
    console.log('[Service] 未归还借阅记录数:', result.count)

    if (result.count > 0) {
      console.error('[Service] 删除失败：该读者还有未归还的借阅记录')
      throw new BusinessError(`该读者还有${result.count}条未归还的借阅记录，无法删除`)
    }

    console.log('[Service] 调用repository.delete删除数据...')
    this.readerRepository.delete(id)
    logger.warn('删除读者', { id, name: reader.name, reader_no: reader.reader_no })
    console.log('========== [Service] 删除读者结束 ==========\n')
  }
}

// 导入 db 用于统计查询
import { db } from '../../database'
