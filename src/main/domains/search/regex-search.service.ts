import { BookRepository, BookWithCategory } from '../book/book.repository'
import { ReaderRepository, ReaderWithCategory } from '../reader/reader.repository'
import { logger } from '../../lib/logger'
import { ValidationError } from '../../lib/errorHandler'

export type SearchMode = 'contains' | 'exact' | 'startsWith' | 'endsWith' | 'regex'

export class RegexSearchService {
  private bookRepository = new BookRepository()
  private readerRepository = new ReaderRepository()

  /**
   * 根据搜索模式构建正则表达式
   */
  private buildRegex(pattern: string, mode: SearchMode, caseSensitive: boolean = false): RegExp {
    let regexPattern = pattern

    // 根据模式调整正则表达式
    switch (mode) {
      case 'exact':
        regexPattern = `^${this.escapeRegex(pattern)}$`
        break
      case 'startsWith':
        regexPattern = `^${this.escapeRegex(pattern)}`
        break
      case 'endsWith':
        regexPattern = `${this.escapeRegex(pattern)}$`
        break
      case 'contains':
        // 转义特殊字符，但保持包含匹配
        regexPattern = this.escapeRegex(pattern)
        break
      case 'regex':
        // 原始正则表达式，不转义
        regexPattern = pattern
        break
    }

    const flags = caseSensitive ? 'g' : 'gi'
    return new RegExp(regexPattern, flags)
  }

  /**
   * 转义正则表达式中的特殊字符
   */
  private escapeRegex(pattern: string): string {
    return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * 验证正则表达式语法
   */
  private validateRegex(pattern: string): { valid: boolean; error?: string } {
    try {
      new RegExp(pattern)
      return { valid: true }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }

  searchBooks(
    pattern: string,
    fields: string[] = ['title', 'author', 'description'],
    categoryId?: number,
    searchMode: SearchMode = 'contains'
  ): BookWithCategory[] {
    try {
      // 对于原始正则模式，先验证语法
      if (searchMode === 'regex') {
        const validation = this.validateRegex(pattern)
        if (!validation.valid) {
          throw new ValidationError(`无效的正则表达式: ${validation.error}`)
        }
      }

      // 构建正则表达式
      const regex = this.buildRegex(pattern, searchMode, false)

      logger.info('正则搜索图书', { pattern, fields, categoryId, searchMode })

      // Get all books
      const books = this.bookRepository.findAll()

      // Filter using regex and category
      const results = books.filter(book => {
        // First filter by category if specified
        if (categoryId !== null && categoryId !== undefined && book.category_id !== categoryId) {
          return false
        }
        
        // Then filter by regex
        return fields.some(field => {
          const value = book[field as keyof BookWithCategory]
          if (typeof value === 'string') {
            return regex.test(value)
          }
          return false
        })
      })

      logger.info('正则搜索完成', { resultCount: results.length })
      return results
    } catch (error: any) {
      logger.error('正则搜索失败', error)
      if (error instanceof ValidationError) {
        throw error
      }
      throw new ValidationError(`搜索失败: ${error.message}`)
    }
  }

  searchReaders(
    pattern: string,
    fields: string[] = ['name', 'reader_no', 'phone'],
    searchMode: SearchMode = 'contains'
  ): ReaderWithCategory[] {
    try {
      // 对于原始正则模式，先验证语法
      if (searchMode === 'regex') {
        const validation = this.validateRegex(pattern)
        if (!validation.valid) {
          throw new ValidationError(`无效的正则表达式: ${validation.error}`)
        }
      }

      // 构建正则表达式
      const regex = this.buildRegex(pattern, searchMode, false)

      logger.info('正则搜索读者', { pattern, fields, searchMode })

      const readers = this.readerRepository.findAll()

      const results = readers.filter(reader => {
        return fields.some(field => {
          const value = reader[field as keyof ReaderWithCategory]
          if (typeof value === 'string') {
            return regex.test(value)
          }
          return false
        })
      })

      logger.info('正则搜索完成', { resultCount: results.length })
      return results
    } catch (error: any) {
      logger.error('正则搜索失败', error)
      if (error instanceof ValidationError) {
        throw error
      }
      throw new ValidationError(`搜索失败: ${error.message}`)
    }
  }
}
