import { BookRepository, BookWithCategory } from '../book/book.repository'
import { ReaderRepository, ReaderWithCategory } from '../reader/reader.repository'
import { logger } from '../../lib/logger'
import { ValidationError } from '../../lib/errorHandler'

export type SearchMode = 'contains' | 'exact' | 'startsWith' | 'endsWith' | 'regex'

export class RegexSearchService {
  private bookRepository = new BookRepository()
  private readerRepository = new ReaderRepository()

  private buildRegex(pattern: string, mode: SearchMode, caseSensitive: boolean = false): RegExp {
    let regexPattern = pattern
    switch (mode) {
      case 'exact': regexPattern = `^${this.escapeRegex(pattern)}$`; break
      case 'startsWith': regexPattern = `^${this.escapeRegex(pattern)}`; break
      case 'endsWith': regexPattern = `${this.escapeRegex(pattern)}$`; break
      case 'contains': regexPattern = this.escapeRegex(pattern); break
      case 'regex': regexPattern = pattern; break
    }
    return new RegExp(regexPattern, caseSensitive ? 'g' : 'gi')
  }

  private escapeRegex(pattern: string): string { return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

  private validateRegex(pattern: string): { valid: boolean; error?: string } {
    try { new RegExp(pattern); return { valid: true } }
    catch (error: any) { return { valid: false, error: error.message } }
  }

  searchBooks(pattern: string, fields: string[] = ['title', 'author', 'description'], categoryId?: number, searchMode: SearchMode = 'contains'): BookWithCategory[] {
    try {
      if (searchMode === 'regex') { const validation = this.validateRegex(pattern); if (!validation.valid) throw new ValidationError(`无效的正则表达式: ${validation.error}`) }
      const regex = this.buildRegex(pattern, searchMode, false)
      logger.info('正则搜索图书', { pattern, fields, categoryId, searchMode })
      const books = this.bookRepository.findAll()
      const results = books.filter(book => {
        if (categoryId !== null && categoryId !== undefined && book.category_id !== categoryId) return false
        return fields.some(field => { const value = book[field as keyof BookWithCategory]; return typeof value === 'string' && regex.test(value) })
      })
      logger.info('正则搜索完成', { resultCount: results.length })
      return results
    } catch (error: any) {
      logger.error('正则搜索失败', error)
      if (error instanceof ValidationError) throw error
      throw new ValidationError(`搜索失败: ${error.message}`)
    }
  }

  searchReaders(pattern: string, fields: string[] = ['name', 'reader_no', 'phone'], searchMode: SearchMode = 'contains'): ReaderWithCategory[] {
    try {
      if (searchMode === 'regex') { const validation = this.validateRegex(pattern); if (!validation.valid) throw new ValidationError(`无效的正则表达式: ${validation.error}`) }
      const regex = this.buildRegex(pattern, searchMode, false)
      logger.info('正则搜索读者', { pattern, fields, searchMode })
      const readers = this.readerRepository.findAll()
      const results = readers.filter(reader => fields.some(field => { const value = reader[field as keyof ReaderWithCategory]; return typeof value === 'string' && regex.test(value) }))
      logger.info('正则搜索完成', { resultCount: results.length })
      return results
    } catch (error: any) {
      logger.error('正则搜索失败', error)
      if (error instanceof ValidationError) throw error
      throw new ValidationError(`搜索失败: ${error.message}`)
    }
  }
}
