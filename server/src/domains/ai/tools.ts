import OpenAI from 'openai'
import { db } from '../../database'
import { RegexSearchService } from '../search/regex-search.service'
import { BorrowingService } from '../borrowing/borrowing.service'
import { NoteRepository } from '../note/note.repository'
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
  },
  {
    type: 'function',
    function: {
      name: 'search_notes',
      description: '搜索公共读书笔记/心得。支持按关键词搜索，可按图书过滤。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
          book_id: { type: 'number', description: '按图书ID过滤（可选）' },
          limit: { type: 'number', description: '返回结果数量上限，默认5', default: 5 }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'publish_note',
      description: '以当前用户身份发布一条公开读书笔记。',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '笔记标题（必填）' },
          content: { type: 'string', description: '笔记内容（必填）' },
          book_id: { type: 'number', description: '关联的图书ID（可选）' }
        },
        required: ['title', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_my_borrowings',
      description: '查看当前用户的借阅记录，包括在借和逾期的图书。',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_popular_books',
      description: '获取热门图书排行（按近期借阅量统计）。',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: '返回数量，默认5', default: 5 },
          category: { type: 'string', description: '按图书类别过滤（可选）' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_reader_info',
      description: '查看当前读者的个人信息，包括借阅上限、到期时间等。',
      parameters: {
        type: 'object',
        properties: {}
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
          WHERE bv.embedding_model = ? AND bv.vector != '[]' AND b.is_deleted = 0
        `).all(embeddingModel) as any[]

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

function executeSearchNotes(args: { query: string; book_id?: number; limit?: number }): any {
  const { query, book_id, limit = 5 } = args
  const repo = new NoteRepository()
  const result = repo.findPlaza({
    keyword: query,
    bookId: book_id,
    page: 1,
    pageSize: limit,
    orderBy: 'newest'
  })
  return {
    total: result.total,
    notes: result.items.map(n => ({
      id: n.id,
      title: n.title,
      author_name: n.author_name,
      book_title: n.book_title,
      content: n.content.length > 100 ? n.content.slice(0, 100) + '...' : n.content,
      view_count: n.view_count,
      created_at: n.created_at
    }))
  }
}

function executePublishNote(args: { title: string; content: string; book_id?: number }, context: ToolContext): any {
  if (!context.userId) {
    return { success: false, message: '请先登录后再发布笔记。' }
  }
  try {
    const repo = new NoteRepository()
    const note = repo.create({
      user_id: context.userId,
      title: args.title,
      content: args.content,
      book_id: args.book_id,
      visibility: 'public'
    })
    return { success: true, note_id: note.id, title: note.title }
  } catch (err: any) {
    return { success: false, message: err?.message || '发布笔记失败' }
  }
}

function executeGetMyBorrowings(context: ToolContext): any {
  if (!context.readerId) {
    return { success: false, message: '您的账号未关联读者信息，无法查看借阅记录。' }
  }
  const records = db.prepare(`
    SELECT b.title as book_title, br.borrow_date, br.due_date, br.status,
           br.renewal_count,
           CASE WHEN br.status = 'overdue' THEN CAST(julianday('now') - julianday(br.due_date) AS INTEGER) ELSE 0 END as overdue_days
    FROM borrowing_records br
    JOIN books b ON br.book_id = b.id
    WHERE br.reader_id = ? AND br.status IN ('borrowed', 'overdue') AND br.is_deleted = 0
    ORDER BY br.due_date ASC
  `).all(context.readerId) as any[]

  return {
    success: true,
    count: records.length,
    records
  }
}

function executeGetPopularBooks(args: { limit?: number; category?: string }): any {
  const { limit = 5, category } = args

  let query = `
    SELECT b.id, b.title, b.author, bc.name as category_name,
           b.available_quantity,
           COUNT(br.id) as borrow_count
    FROM borrowing_records br
    JOIN books b ON br.book_id = b.id
    JOIN book_categories bc ON b.category_id = bc.id
    WHERE br.is_deleted = 0 AND b.is_deleted = 0
      AND br.borrow_date >= date('now', '-30 days')
  `
  const params: any[] = []

  if (category) {
    query += ` AND bc.name LIKE ?`
    params.push(`%${category}%`)
  }

  query += `
    GROUP BY b.id
    ORDER BY borrow_count DESC
    LIMIT ?
  `
  params.push(limit)

  const books = db.prepare(query).all(...params) as any[]
  return { total: books.length, books }
}

function executeGetReaderInfo(context: ToolContext): any {
  if (!context.readerId) {
    return { success: false, message: '您的账号未关联读者信息。' }
  }

  const reader = db.prepare(`
    SELECT r.id, r.name, r.reader_no, r.status, r.expiry_date,
           rc.name as category_name, rc.max_borrow_count, rc.max_borrow_days
    FROM readers r
    JOIN reader_categories rc ON r.category_id = rc.id
    WHERE r.id = ? AND r.is_deleted = 0
  `).get(context.readerId) as any

  if (!reader) {
    return { success: false, message: '未找到读者信息。' }
  }

  const stats = db.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'borrowed' THEN 1 END) as current_borrowings,
      COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
    FROM borrowing_records
    WHERE reader_id = ? AND is_deleted = 0 AND status IN ('borrowed', 'overdue')
  `).get(context.readerId) as any

  return {
    success: true,
    reader: {
      ...reader,
      current_borrowings: stats.current_borrowings,
      overdue_count: stats.overdue_count
    }
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

    case 'search_notes':
      return { result: executeSearchNotes(args as any) }

    case 'publish_note':
      return { result: executePublishNote(args as any, context) }

    case 'get_my_borrowings':
      return { result: executeGetMyBorrowings(context) }

    case 'get_popular_books':
      return { result: executeGetPopularBooks(args as any) }

    case 'get_reader_info':
      return { result: executeGetReaderInfo(context) }

    default:
      return { result: { error: `未知工具: ${name}` } }
  }
}
