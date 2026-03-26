import { ReaderRepository, Reader, ReaderCategory, ReaderWithCategory } from './reader.repository'
import { ValidationError, BusinessError, NotFoundError } from '../../lib/errorHandler'
import { logger } from '../../lib/logger'
import { db } from '../../database'

export class ReaderService {
  private readerRepository = new ReaderRepository()

  getAllCategories(): ReaderCategory[] {
    return this.readerRepository.findAllCategories()
  }

  getCategoryById(id: number): ReaderCategory {
    const category = this.readerRepository.findCategoryById(id)
    if (!category) throw new NotFoundError('读者种类')
    return category
  }

  createCategory(data: Omit<ReaderCategory, 'id' | 'created_at' | 'updated_at'>): ReaderCategory {
    if (!data.code || !data.name) throw new ValidationError('种类编码和名称不能为空')
    if (data.max_borrow_count < 1) throw new ValidationError('最大借阅数量必须大于0')
    if (data.max_borrow_days < 1) throw new ValidationError('最大借阅天数必须大于0')

    logger.info('创建读者种类', data.name)
    return this.readerRepository.createCategory(data)
  }

  updateCategory(id: number, updates: Partial<ReaderCategory>): ReaderCategory {
    this.getCategoryById(id)
    logger.info('更新读者种类')
    return this.readerRepository.updateCategory(id, updates)
  }

  getAllReaders(filters?: { status?: string; category_id?: number }): ReaderWithCategory[] {
    return this.readerRepository.findAll(filters)
  }

  getReaderById(id: number): ReaderWithCategory {
    const reader = this.readerRepository.findById(id)
    if (!reader) throw new NotFoundError('读者')
    return reader
  }

  getReaderByNo(readerNo: string): ReaderWithCategory {
    const reader = this.readerRepository.findByReaderNo(readerNo)
    if (!reader) throw new NotFoundError('读者')
    return reader
  }

  createReader(data: Omit<Reader, 'id' | 'created_at' | 'updated_at'>): ReaderWithCategory {
    logger.info('开始创建读者')

    if (!data.name || !data.category_id) {
      throw new ValidationError('姓名和种类不能为空')
    }

    const category = this.readerRepository.findCategoryById(data.category_id)
    if (!category) throw new NotFoundError('读者种类')

    if (!data.reader_no || data.reader_no.trim() === '' || data.reader_no.toUpperCase() === 'AUTO') {
      data.reader_no = this.readerRepository.generateNextReaderNo(data.category_id)
    } else {
      const existing = this.readerRepository.findByReaderNo(data.reader_no)
      if (existing) throw new BusinessError('读者编号已存在')
    }

    if (!data.expiry_date) {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + category.validity_days)
      data.expiry_date = expiryDate.toISOString().split('T')[0]
    }

    return this.readerRepository.create(data)
  }

  updateReader(id: number, updates: Partial<Reader>): Reader {
    const existing = this.getReaderById(id)

    if (updates.category_id && updates.category_id !== existing.category_id) {
      const category = this.readerRepository.findCategoryById(updates.category_id)
      if (!category) throw new NotFoundError('读者种类')
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + category.validity_days)
      updates.expiry_date = expiryDate.toISOString().split('T')[0]
    }

    logger.info('更新读者信息', existing.name)
    return this.readerRepository.update(id, updates)
  }

  searchReaders(keyword: string): ReaderWithCategory[] {
    if (!keyword || keyword.trim().length === 0) return this.getAllReaders()
    return this.readerRepository.search(keyword.trim())
  }

  suspendReader(id: number, reason?: string): Reader {
    logger.warn('挂失读者证', id, reason)
    return this.readerRepository.update(id, {
      status: 'suspended',
      notes: reason ? `挂失原因：${reason}` : '读者证已挂失'
    })
  }

  activateReader(id: number): Reader {
    const reader = this.getReaderById(id)
    if (reader.expiry_date && new Date(reader.expiry_date) < new Date()) {
      throw new BusinessError('读者证已过期，请先续期')
    }
    logger.info('激活读者证', id)
    return this.readerRepository.update(id, { status: 'active' })
  }

  renewReader(id: number, additionalDays: number): Reader {
    const reader = this.getReaderById(id)
    let newExpiryDate: Date
    if (reader.expiry_date && new Date(reader.expiry_date) > new Date()) {
      newExpiryDate = new Date(reader.expiry_date)
    } else {
      newExpiryDate = new Date()
    }
    newExpiryDate.setDate(newExpiryDate.getDate() + additionalDays)

    logger.info('读者续期', reader.name, additionalDays)
    return this.readerRepository.update(id, {
      expiry_date: newExpiryDate.toISOString().split('T')[0],
      status: 'active'
    })
  }

  canBorrow(readerId: number): { canBorrow: boolean; reason?: string } {
    const reader = this.readerRepository.findById(readerId)
    if (!reader) return { canBorrow: false, reason: '读者不存在' }
    if (reader.status !== 'active') return { canBorrow: false, reason: '读者证未激活或已挂失' }
    if (reader.expiry_date && new Date(reader.expiry_date) < new Date()) return { canBorrow: false, reason: '读者证已过期' }

    const currentBorrowCount = this.readerRepository.getBorrowingCount(readerId)
    if (currentBorrowCount >= reader.max_borrow_count) {
      return { canBorrow: false, reason: `已达到最大借阅数量（${reader.max_borrow_count}本）` }
    }
    if (this.readerRepository.hasOverdueBooks(readerId)) return { canBorrow: false, reason: '有图书逾期未还' }

    return { canBorrow: true }
  }

  getReaderStatistics(readerId: number): { totalBorrowed: number; currentBorrowing: number; overdueCount: number } {
    this.getReaderById(readerId)
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_borrowed,
        SUM(CASE WHEN status = 'borrowed' THEN 1 ELSE 0 END) as current_borrowing,
        SUM(CASE WHEN status = 'borrowed' AND due_date < date('now') THEN 1 ELSE 0 END) as overdue_count
      FROM borrowing_records WHERE reader_id = ?
    `).get(readerId) as any

    return {
      totalBorrowed: stats.total_borrowed || 0,
      currentBorrowing: stats.current_borrowing || 0,
      overdueCount: stats.overdue_count || 0
    }
  }

  deleteReader(id: number): void {
    const reader = this.getReaderById(id)

    const result = db.prepare(`
      SELECT COUNT(*) as count FROM borrowing_records
      WHERE reader_id = ? AND status IN ('borrowed', 'overdue') AND is_deleted = 0
    `).get(id) as { count: number }

    if (result.count > 0) {
      throw new BusinessError(`该读者还有${result.count}条未归还的借阅记录，无法删除`)
    }

    this.readerRepository.delete(id)
    logger.warn('软删除读者', { id, name: reader.name })
  }
}
