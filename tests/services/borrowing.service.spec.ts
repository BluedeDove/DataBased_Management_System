import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BorrowingService } from '../../../src/main/domains/borrowing/borrowing.service'
import { BorrowingRepository } from '../../../src/main/domains/borrowing/borrowing.repository'
import { BookRepository } from '../../../src/main/domains/book/book.repository'
import { ReaderRepository } from '../../../src/main/domains/reader/reader.repository'

// Mock repositories
vi.mock('../../../src/main/domains/borrowing/borrowing.repository')
vi.mock('../../../src/main/domains/book/book.repository')
vi.mock('../../../src/main/domains/reader/reader.repository')
vi.mock('../../../src/main/database', () => ({
  db: {
    transaction: (fn: Function) => fn,
    prepare: vi.fn(() => ({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn()
    }))
  }
}))

describe('BorrowingService', () => {
  let borrowingService: BorrowingService
  let mockBorrowingRepo: any
  let mockBookRepo: any
  let mockReaderRepo: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock instances
    mockBorrowingRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findActiveBorrowing: vi.fn(),
      update: vi.fn()
    }

    mockBookRepo = {
      findById: vi.fn(),
      decreaseAvailableQuantity: vi.fn(),
      increaseAvailableQuantity: vi.fn()
    }

    mockReaderRepo = {
      findById: vi.fn(),
      getBorrowingCount: vi.fn(),
      hasOverdueBooks: vi.fn()
    }

    // Setup service with mocked dependencies
    borrowingService = new BorrowingService()
    // @ts-ignore
    borrowingService.borrowingRepository = mockBorrowingRepo
    // @ts-ignore
    borrowingService.bookRepository = mockBookRepo
    // @ts-ignore
    borrowingService.readerRepository = mockReaderRepo
  })

  describe('borrowBook', () => {
    it('should successfully borrow a book when all conditions are met', async () => {
      // Arrange
      const readerId = 1
      const bookId = 1

      const mockReader = {
        id: 1,
        status: 'active',
        expiry_date: '2025-12-31',
        max_borrow_count: 5,
        max_borrow_days: 30
      }

      const mockBook = {
        id: 1,
        status: 'normal',
        available_quantity: 5
      }

      mockReaderRepo.findById.mockReturnValue(mockReader)
      mockReaderRepo.getBorrowingCount.mockReturnValue(2)
      mockReaderRepo.hasOverdueBooks.mockReturnValue(false)
      mockBookRepo.findById.mockReturnValue(mockBook)
      mockBorrowingRepo.findActiveBorrowing.mockReturnValue(null)
      mockBorrowingRepo.create.mockReturnValue({ id: 1 })

      // Act
      const result = await borrowingService.borrowBook(readerId, bookId)

      // Assert
      expect(result).toBeDefined()
      expect(mockBorrowingRepo.create).toHaveBeenCalled()
      expect(mockBookRepo.decreaseAvailableQuantity).toHaveBeenCalledWith(bookId, 1)
    })

    it('should throw error when reader status is not active', async () => {
      // Arrange
      const mockReader = {
        id: 1,
        status: 'suspended'
      }

      mockReaderRepo.findById.mockReturnValue(mockReader)

      // Act & Assert
      await expect(borrowingService.borrowBook(1, 1)).rejects.toThrow('读者证未激活或已挂失')
    })

    it('should throw error when book quantity is zero', async () => {
      // Arrange
      const mockReader = {
        id: 1,
        status: 'active',
        expiry_date: '2025-12-31',
        max_borrow_count: 5
      }

      const mockBook = {
        id: 1,
        status: 'normal',
        available_quantity: 0
      }

      mockReaderRepo.findById.mockReturnValue(mockReader)
      mockReaderRepo.getBorrowingCount.mockReturnValue(2)
      mockReaderRepo.hasOverdueBooks.mockReturnValue(false)
      mockBookRepo.findById.mockReturnValue(mockBook)

      // Act & Assert
      await expect(borrowingService.borrowBook(1, 1)).rejects.toThrow('暂无可借图书')
    })

    it('should throw error when borrowing limit is reached', async () => {
      // Arrange
      const mockReader = {
        id: 1,
        status: 'active',
        expiry_date: '2025-12-31',
        max_borrow_count: 5
      }

      mockReaderRepo.findById.mockReturnValue(mockReader)
      mockReaderRepo.getBorrowingCount.mockReturnValue(5) // Already at limit

      // Act & Assert
      await expect(borrowingService.borrowBook(1, 1)).rejects.toThrow('已达到最大借阅数量')
    })

    it('should throw error when reader has overdue books', async () => {
      // Arrange
      const mockReader = {
        id: 1,
        status: 'active',
        expiry_date: '2025-12-31',
        max_borrow_count: 5
      }

      mockReaderRepo.findById.mockReturnValue(mockReader)
      mockReaderRepo.getBorrowingCount.mockReturnValue(2)
      mockReaderRepo.hasOverdueBooks.mockReturnValue(true)

      // Act & Assert
      await expect(borrowingService.borrowBook(1, 1)).rejects.toThrow('您有图书逾期未还')
    })
  })

  describe('returnBook', () => {
    it('should successfully return a book', async () => {
      // Arrange
      const mockRecord = {
        id: 1,
        reader_id: 1,
        book_id: 1,
        status: 'borrowed',
        due_date: new Date().toISOString().split('T')[0]
      }

      mockBorrowingRepo.findById.mockReturnValue(mockRecord)
      mockBorrowingRepo.update.mockReturnValue({ ...mockRecord, status: 'returned' })

      // Act
      const result = await borrowingService.returnBook(1)

      // Assert
      expect(result.status).toBe('returned')
      expect(mockBorrowingRepo.update).toHaveBeenCalled()
      expect(mockBookRepo.increaseAvailableQuantity).toHaveBeenCalledWith(1, 1)
    })

    it('should calculate fine for overdue books', async () => {
      // Arrange
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10) // 10 days overdue

      const mockRecord = {
        id: 1,
        reader_id: 1,
        book_id: 1,
        status: 'borrowed',
        due_date: pastDate.toISOString().split('T')[0]
      }

      mockBorrowingRepo.findById.mockReturnValue(mockRecord)
      mockBorrowingRepo.calculateFine.mockReturnValue(1.0) // 0.1 * 10 days
      mockBorrowingRepo.update.mockReturnValue({
        ...mockRecord,
        status: 'returned',
        fine_amount: 1.0
      })

      // Act
      const result = await borrowingService.returnBook(1)

      // Assert
      expect(result.fine_amount).toBeGreaterThan(0)
    })
  })
})
