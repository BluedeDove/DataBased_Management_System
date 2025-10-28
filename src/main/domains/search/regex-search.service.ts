import { BookRepository, BookWithCategory } from '../book/book.repository'
import { ReaderRepository, ReaderWithCategory } from '../reader/reader.repository'
import { logger } from '../../lib/logger'
import { ValidationError } from '../../lib/errorHandler'

export class RegexSearchService {
  private bookRepository = new BookRepository()
  private readerRepository = new ReaderRepository()

  searchBooks(pattern: string, fields: string[] = ['title', 'author', 'description']): BookWithCategory[] {
    try {
      // Validate regex pattern
      const regex = new RegExp(pattern, 'i')

      logger.info('正则搜索图书', { pattern, fields })

      // Get all books
      const books = this.bookRepository.findAll()

      // Filter using regex
      const results = books.filter(book => {
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
      throw new ValidationError(`无效的正则表达式: ${error.message}`)
    }
  }

  searchReaders(pattern: string, fields: string[] = ['name', 'reader_no', 'phone']): ReaderWithCategory[] {
    try {
      const regex = new RegExp(pattern, 'i')

      logger.info('正则搜索读者', { pattern, fields })

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
      throw new ValidationError(`无效的正则表达式: ${error.message}`)
    }
  }
}
