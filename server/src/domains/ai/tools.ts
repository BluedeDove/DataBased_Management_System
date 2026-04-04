import OpenAI from 'openai'
import { db } from '../../database'
import { RegexSearchService } from '../search/regex-search.service'
import { BorrowingService } from '../borrowing/borrowing.service'
import { cosineSimilarity, getAIConfig } from './ai.service'

// ── Tool definitions (OpenAI function calling format) ──

export const toolDefinitions: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_books',
      description: '搜索图书馆中的图书。支持关键词、正则表达式和语义三种搜索模式。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索查询内容' },
          mode: {
            type: 'string',
            enum: ['keyword', 'regex', 'semantic'],
            description: '搜索模式：keyword(关键词，默认)、regex(正则表达式)、semantic(语义向量)'
          },
          limit: { type: 'number', description: '返回结果数量上限，默认10', default: 10 }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'recommend_books',
      description: '根据主题、类型或关键词推荐图书。返回热门且匹配的图书列表。',
      parameters: {
        type: 'object',
        properties: {
          genre: { type: 'string', description: '推荐主题/类型，如"算法"、"Python"、"人工智能"' },
          count: { type: 'number', description: '推荐数量，默认5', default: 5 }
        },
        required: ['genre']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_book_details',
      description: '查看某本图书的详细信息和当前借阅状态。可通过book_id或书名查找。',
      parameters: {
        type: 'object',
        properties: {
          book_id: { type: 'number', description: '图书ID' },
          title: { type: 'string', description: '图书标题（模糊匹配）' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_borrowing_status',
      description: '查询某本书当前的借阅状态，包括可借数量和在借读者列表。',
      parameters: {
        type: 'object',
        properties: {
          book_id: { type: 'number', description: '图书ID（必填）' }
        },
        required: ['book_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'borrow_book',
      description: '帮用户借阅图书。需要用户提供读者身份。仅在用户明确要求借阅时调用此工具。',
      parameters: {
        type: 'object',
        properties: {
          book_id: { type: 'number', description: '要借阅的图书ID（必填）' }
        },
        required: ['book_id']
      }
    }
  }
]

// ── Tool execution ──

export interface ToolContext {
  userId: number
  readerId?: number | null
}

export interface ToolResult {
  result: any
  sideEffect?: { type: 'recommend'; books: any[] }
}

async function executeSearchBooks(args: { query: string; mode?: string; limit?: number }): Promise<any[]> {
  const { query, mode = 'keyword', limit = 10 } = args

  if (mode === 'regex') {
    const service = new RegexSearchService()
    const results = service.searchBooks(query, ['title', 'author', 'description', 'keywords'], undefined, 'regex')
    return results.slice(0, limit).map(b => ({
      id: b.id, title: b.title, author: b.author,
      category_name: b.category_name,
      available_quantity: b.available_quantity,
      total_quantity: b.total_quantity
    }))
  }

  if (mode === 'semantic') {
    const { apiKey, baseURL, embeddingModel } = getAIConfig()
    if (apiKey) {
      try {
        const rows = db.prepare(`
          SELECT bv.book_id, bv.vector, b.*, bc.name as category_name
          FROM book_vectors bv
          JOIN books b ON bv.book_id = b.id
          JOIN book_categories bc ON b.category_id = bc.id
          WHERE bv.vector != '[]' AND b.is_deleted = 0
        `).all() as any[]

        if (rows.length > 0) {
          const client = new OpenAI({ apiKey, baseURL })
          const qResp = await client.embeddings.create({ model: embeddingModel, input: query })
          const qVec = qResp.data[0].embedding
          return rows
            .map(r => {
              const vec: number[] = JSON.parse(r.vector)
              const sim = cosineSimilarity(vec, qVec)
              const { vector, ...book } = r
              return { ...book, similarity: parseFloat(sim.toFixed(4)) }
            })
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
        }
      } catch { /* fall through to keyword */ }
    }
  }

  // keyword mode (default / fallback)
  const books = db.prepare(`
    SELECT b.id, b.title, b.author, b.isbn, b.publisher, b.publish_date,
           b.description, b.keywords, b.available_quantity, b.total_quantity, b.status,
           bc.name as category_name
    FROM books b
    JOIN book_categories bc ON b.category_id = bc.id
    WHERE b.is_deleted = 0
      AND (b.title LIKE ? OR b.author LIKE ? OR b.description LIKE ? OR b.keywords LIKE ?)
    ORDER BY b.available_quantity DESC
    LIMIT ?
  `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit) as any[]

  return books
}

function executeRecommendBooks(args: { genre: string; count?: number }): { books: any[] } {
  const { genre, count = 5 } = args
  const q = `%${genre}%`

  // First try category + keyword match, then fall back to keyword only
  let books = db.prepare(`
    SELECT b.id, b.title, b.author, b.isbn, b.publisher, b.publish_date,
           b.description, b.keywords, b.available_quantity, b.total_quantity, b.status,
           bc.name as category_name
    FROM books b
    JOIN book_categories bc ON b.category_id = bc.id
    WHERE b.is_deleted = 0
      AND (b.title LIKE ? OR b.author LIKE ? OR b.keywords LIKE ? OR b.description LIKE ? OR bc.name LIKE ?)
    ORDER BY b.total_quantity DESC, b.available_quantity DESC
    LIMIT ?
  `).all(q, q, q, q, q, count) as any[]

  // If too few results, supplement with popular books
  if (books.length < count) {
    const existingIds = new Set(books.map(b => b.id))
    const extra = db.prepare(`
      SELECT b.id, b.title, b.author, b.isbn, b.publisher, b.publish_date,
             b.description, b.keywords, b.available_quantity, b.total_quantity, b.status,
             bc.name as category_name
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.is_deleted = 0 AND b.id NOT IN (${existingIds.size > 0 ? Array.from(existingIds).join(',') : '0'})
      ORDER BY b.total_quantity DESC
      LIMIT ?
    `).all(count - books.length) as any[]
    books = [...books, ...extra]
  }

  return { books }
}

function executeGetBookDetails(args: { book_id?: number; title?: string }): any {
  let book: any = null

  if (args.book_id) {
    book = db.prepare(`
      SELECT b.*, bc.name as category_name
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.id = ? AND b.is_deleted = 0
    `).get(args.book_id)
  }

  if (!book && args.title) {
    book = db.prepare(`
      SELECT b.*, bc.name as category_name
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.is_deleted = 0 AND b.title LIKE ?
      LIMIT 1
    `).get(`%${args.title}%`)
  }

  if (!book) return { found: false }

  // Get borrowing status
  const borrowers = db.prepare(`
    SELECT r.name as reader_name, br.due_date, br.status
    FROM borrowing_records br
    JOIN readers r ON br.reader_id = r.id
    WHERE br.book_id = ? AND br.status = 'borrowed' AND br.is_deleted = 0
    ORDER BY br.due_date
  `).all(book.id) as any[]

  return {
    found: true,
    ...book,
    borrowing_status: {
      available_quantity: book.available_quantity,
      total_quantity: book.total_quantity,
      current_borrowers: borrowers
    }
  }
}

function executeGetBorrowingStatus(args: { book_id: number }): any {
  const book = db.prepare(`
    SELECT b.id, b.title, b.available_quantity, b.total_quantity
    FROM books b WHERE b.id = ? AND b.is_deleted = 0
  `).get(args.book_id) as any

  if (!book) return { found: false }

  const borrowers = db.prepare(`
    SELECT r.name as reader_name, r.reader_no, br.borrow_date, br.due_date, br.status
    FROM borrowing_records br
    JOIN readers r ON br.reader_id = r.id
    WHERE br.book_id = ? AND br.status = 'borrowed' AND br.is_deleted = 0
    ORDER BY br.due_date
  `).all(args.book_id) as any[]

  return {
    found: true,
    book_title: book.title,
    available_quantity: book.available_quantity,
    total_quantity: book.total_quantity,
    borrowed_count: borrowers.length,
    current_borrowers: borrowers
  }
}

async function executeBorrowBook(args: { book_id: number }, context: ToolContext): Promise<any> {
  if (!context.readerId) {
    return { success: false, message: '您的账号未关联读者信息，无法执行借阅操作。请联系管理员。' }
  }

  try {
    const service = new BorrowingService()
    const record = await service.borrowBook(context.readerId, args.book_id)
    return {
      success: true,
      message: '借阅成功',
      due_date: record.due_date
    }
  } catch (err: any) {
    return { success: false, message: err?.message || '借阅失败' }
  }
}

export async function executeTool(
  name: string,
  args: Record<string, any>,
  context: ToolContext
): Promise<ToolResult> {
  switch (name) {
    case 'search_books':
      return { result: await executeSearchBooks(args as any) }

    case 'recommend_books': {
      const recResult = executeRecommendBooks(args as any)
      return {
        result: recResult.books,
        sideEffect: { type: 'recommend', books: recResult.books }
      }
    }

    case 'get_book_details':
      return { result: executeGetBookDetails(args as any) }

    case 'get_borrowing_status':
      return { result: executeGetBorrowingStatus(args as any) }

    case 'borrow_book':
      return { result: await executeBorrowBook(args as any, context) }

    default:
      return { result: { error: `未知工具: ${name}` } }
  }
}
