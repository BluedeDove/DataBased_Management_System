import OpenAI from 'openai'
import { db } from '../../database'
import { RegexSearchService } from '../search/regex-search.service'
import { BorrowingService } from '../borrowing/borrowing.service'
import { NoteRepository } from '../note/note.repository'
import { cosineSimilarity, getAIConfig } from './ai.service'

type SearchMode = 'keyword' | 'regex' | 'semantic'

interface BookRow {
  id: number
  title: string
  author: string
  isbn: string
  publisher: string
  publish_date?: string | null
  description?: string | null
  keywords?: string | null
  available_quantity: number
  total_quantity: number
  status: string
  category_name: string
}

interface BookCandidate {
  id: number
  title: string
  author: string
  isbn: string
  category_name: string
  available_quantity: number
  total_quantity: number
  status: string
}

interface BookResponse extends BookCandidate {
  publisher: string
  publish_date?: string | null
  description?: string | null
  keywords?: string | null
}

interface BookReferenceArgs {
  book_id?: number
  title?: string
  isbn?: string
}

type ResolvedBookReference =
  | { status: 'resolved'; book: BookRow }
  | { status: 'not_found' | 'ambiguous' | 'conflict'; message: string; candidates?: BookCandidate[] }

const BOOK_BASE_SELECT = `
  SELECT b.id, b.title, b.author, b.isbn, b.publisher, b.publish_date,
         b.description, b.keywords, b.available_quantity, b.total_quantity, b.status,
         bc.name AS category_name
  FROM books b
  JOIN book_categories bc ON b.category_id = bc.id
  WHERE b.is_deleted = 0
`

export const toolDefinitions: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_books',
      description: '搜索馆藏图书。支持 keyword / regex / semantic 三种模式；如果后续要操作某一本书，应先用它拿到唯一的 book_id、ISBN 或完整书名。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索词，可以是书名、作者、ISBN、关键词等' },
          mode: {
            type: 'string',
            enum: ['keyword', 'regex', 'semantic'],
            description: '搜索模式：keyword（默认）、regex（正则）、semantic（向量语义）'
          },
          limit: { type: 'number', description: '返回数量上限，默认 10', default: 10 }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'recommend_books',
      description: '根据主题、类型或关键词推荐图书。',
      parameters: {
        type: 'object',
        properties: {
          genre: { type: 'string', description: '推荐主题/类型，如“算法”“Python”“人工智能”' },
          count: { type: 'number', description: '推荐数量，默认 5', default: 5 }
        },
        required: ['genre']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_book_details',
      description: '查看某一本图书的详细信息。优先传 book_id；也可传 title 或 isbn。若 title 不唯一，工具会返回候选列表，不能自行猜测。',
      parameters: {
        type: 'object',
        properties: {
          book_id: { type: 'number', description: '图书 ID，最稳妥的唯一标识' },
          title: { type: 'string', description: '完整书名；仅当能唯一确认时使用' },
          isbn: { type: 'string', description: 'ISBN；若已知，优先使用' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_borrowing_status',
      description: '查询某一本图书的借阅状态。优先传 book_id；也可传 title 或 isbn。若无法唯一确认，工具会返回候选列表。',
      parameters: {
        type: 'object',
        properties: {
          book_id: { type: 'number', description: '图书 ID，最稳妥的唯一标识' },
          title: { type: 'string', description: '完整书名；仅当能唯一确认时使用' },
          isbn: { type: 'string', description: 'ISBN；若已知，优先使用' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'borrow_book',
      description: '为当前登录读者借阅图书。优先传 book_id，并同时补充 title 或 isbn 以便系统校验，避免借错书。',
      parameters: {
        type: 'object',
        properties: {
          book_id: { type: 'number', description: '图书 ID；若来自搜索结果，建议同时传 title 或 isbn 做校验' },
          title: { type: 'string', description: '用户明确提到的完整书名；与 book_id 配合可做精确校验' },
          isbn: { type: 'string', description: '用户明确提到的 ISBN；与 book_id 配合可做精确校验' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_notes',
      description: '搜索公开读书笔记/心得，可按关键词和图书过滤。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
          book_id: { type: 'number', description: '按图书 ID 过滤（可选）' },
          limit: { type: 'number', description: '返回数量上限，默认 5', default: 5 }
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
          content: { type: 'string', description: '笔记正文（必填）' },
          book_id: { type: 'number', description: '关联图书 ID（可选）' }
        },
        required: ['title', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_my_borrowings',
      description: '查看当前用户的借阅记录，包括在借和逾期图书。',
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
      description: '获取近 30 天热门图书排行。',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: '返回数量，默认 5', default: 5 },
          category: { type: 'string', description: '按图书类别过滤（可选）' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_reader_info',
      description: '查看当前读者的个人信息、借阅上限和有效期。',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
]

export interface ToolContext {
  userId: number
  readerId?: number | null
}

export interface ToolResult {
  result: any
  sideEffect?: { type: 'recommend'; books: any[] }
}

function normalizeBookTitle(value?: string | null): string {
  return (value || '')
    .toLowerCase()
    .replace(/[\s《》"'“”‘’·•:：()（）\-_，,。.!！？?]/g, '')
}

function normalizeIsbn(value?: string | null): string {
  return (value || '').replace(/[^0-9xX]/g, '').toUpperCase()
}

function mapBookCandidate(book: Pick<BookRow, keyof BookCandidate>): BookCandidate {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    category_name: book.category_name,
    available_quantity: book.available_quantity,
    total_quantity: book.total_quantity,
    status: book.status
  }
}

function toBookResponse(book: BookRow, extra: Record<string, any> = {}): BookResponse & Record<string, any> {
  return {
    ...mapBookCandidate(book),
    publisher: book.publisher,
    publish_date: book.publish_date,
    description: book.description,
    keywords: book.keywords,
    ...extra
  }
}

function getBookById(bookId: number): BookRow | undefined {
  return db.prepare(`${BOOK_BASE_SELECT} AND b.id = ?`).get(bookId) as BookRow | undefined
}

function listBookCandidatesByQuery(query: string, limit = 5): BookRow[] {
  const q = `%${query.trim()}%`
  return db.prepare(`
    ${BOOK_BASE_SELECT}
      AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.description LIKE ? OR b.keywords LIKE ?)
    ORDER BY b.available_quantity DESC, b.id ASC
    LIMIT ?
  `).all(q, q, q, q, q, limit) as BookRow[]
}

function rankKeywordBook(book: BookRow, query: string) {
  const normalizedQuery = normalizeBookTitle(query)
  const normalizedIsbnQuery = normalizeIsbn(query)
  const normalizedTitle = normalizeBookTitle(book.title)
  const normalizedAuthor = normalizeBookTitle(book.author)
  const normalizedKeywords = normalizeBookTitle(book.keywords || '')
  const normalizedDescription = normalizeBookTitle(book.description || '')
  const normalizedPublisher = normalizeBookTitle(book.publisher || '')
  const normalizedIsbn = normalizeIsbn(book.isbn)

  let score = 0
  let matchType = 'keyword'
  let exactMatch = false

  if (normalizedIsbnQuery && normalizedIsbn === normalizedIsbnQuery) {
    score = 1000
    matchType = 'isbn_exact'
    exactMatch = true
  } else if (normalizedQuery && normalizedTitle === normalizedQuery) {
    score = 900
    matchType = 'title_exact'
    exactMatch = true
  } else if (normalizedQuery && normalizedTitle.startsWith(normalizedQuery)) {
    score = 700
    matchType = 'title_prefix'
  } else if (normalizedQuery && normalizedTitle.includes(normalizedQuery)) {
    score = 600
    matchType = 'title_contains'
  } else if (normalizedQuery && normalizedAuthor.includes(normalizedQuery)) {
    score = 500
    matchType = 'author_contains'
  } else if (normalizedQuery && normalizedKeywords.includes(normalizedQuery)) {
    score = 400
    matchType = 'keywords_contains'
  } else if (normalizedQuery && normalizedPublisher.includes(normalizedQuery)) {
    score = 300
    matchType = 'publisher_contains'
  } else if (normalizedQuery && normalizedDescription.includes(normalizedQuery)) {
    score = 200
    matchType = 'description_contains'
  }

  score += Math.min(Math.max(book.available_quantity, 0), 50) / 100

  return { score, matchType, exactMatch }
}

function listExactTitleMatches(title: string): BookRow[] {
  const query = title.trim()
  const candidates = db.prepare(`
    ${BOOK_BASE_SELECT}
      AND b.title LIKE ?
    ORDER BY b.available_quantity DESC, b.id ASC
    LIMIT 20
  `).all(`%${query}%`) as BookRow[]

  const normalizedTitle = normalizeBookTitle(query)
  const directMatches = candidates.filter(book => normalizeBookTitle(book.title) === normalizedTitle)
  if (directMatches.length > 0) return directMatches

  return (db.prepare(`${BOOK_BASE_SELECT}`).all() as BookRow[])
    .filter(book => normalizeBookTitle(book.title) === normalizedTitle)
}

function resolveBookReference(args: BookReferenceArgs): ResolvedBookReference {
  const hasBookId = typeof args.book_id === 'number' && Number.isFinite(args.book_id)
  const normalizedTitle = normalizeBookTitle(args.title)
  const normalizedIsbnValue = normalizeIsbn(args.isbn)

  if (hasBookId) {
    const book = getBookById(args.book_id as number)
    if (!book) {
      return { status: 'not_found', message: '未找到对应的图书 ID。' }
    }

    if (normalizedIsbnValue && normalizeIsbn(book.isbn) !== normalizedIsbnValue) {
      return {
        status: 'conflict',
        message: 'book_id 与 ISBN 不一致，请重新确认具体图书。',
        candidates: [mapBookCandidate(book)]
      }
    }

    if (normalizedTitle && normalizeBookTitle(book.title) !== normalizedTitle) {
      return {
        status: 'conflict',
        message: 'book_id 与书名不一致，请重新确认具体图书。',
        candidates: [mapBookCandidate(book)]
      }
    }

    return { status: 'resolved', book }
  }

  if (normalizedIsbnValue) {
    const matches = db.prepare(`
      ${BOOK_BASE_SELECT}
        AND REPLACE(REPLACE(UPPER(b.isbn), '-', ''), ' ', '') = ?
      ORDER BY b.id ASC
    `).all(normalizedIsbnValue) as BookRow[]

    if (matches.length === 1) {
      return { status: 'resolved', book: matches[0] }
    }

    if (matches.length > 1) {
      return {
        status: 'ambiguous',
        message: '该 ISBN 对应多本图书，请先确认具体图书。',
        candidates: matches.slice(0, 5).map(mapBookCandidate)
      }
    }

    return { status: 'not_found', message: '未找到对应 ISBN 的图书。' }
  }

  if (normalizedTitle) {
    const exactMatches = listExactTitleMatches(args.title!)

    if (exactMatches.length === 1) {
      return { status: 'resolved', book: exactMatches[0] }
    }

    if (exactMatches.length > 1) {
      return {
        status: 'ambiguous',
        message: '找到多本同名图书，请根据 book_id 或 ISBN 进一步确认。',
        candidates: exactMatches.slice(0, 5).map(mapBookCandidate)
      }
    }

    const fuzzyCandidates = listBookCandidatesByQuery(args.title!, 5)
    return {
      status: 'not_found',
      message: fuzzyCandidates.length > 0
        ? '没有找到唯一精确匹配的书名，请从候选图书中确认。'
        : '没有找到匹配的图书，请尝试更完整的书名、ISBN 或先调用 search_books。',
      candidates: fuzzyCandidates.map(mapBookCandidate)
    }
  }

  return {
    status: 'not_found',
    message: '缺少图书标识，请至少提供 book_id、isbn 或 title。'
  }
}

function buildLookupFailure(result: Exclude<ResolvedBookReference, { status: 'resolved' }>) {
  return {
    found: false,
    reason: result.status,
    message: result.message,
    candidates: result.candidates || []
  }
}

function buildBorrowFailure(result: Exclude<ResolvedBookReference, { status: 'resolved' }>) {
  return {
    success: false,
    reason: result.status,
    message: result.message,
    candidates: result.candidates || []
  }
}

async function executeSearchBooks(args: { query: string; mode?: SearchMode; limit?: number }): Promise<any[]> {
  const { query, mode = 'keyword', limit = 10 } = args

  if (mode === 'regex') {
    const service = new RegexSearchService()
    const results = service.searchBooks(query, ['title', 'author', 'description', 'keywords', 'isbn'], undefined, 'regex')
    return results.slice(0, limit).map(book => ({
      ...mapBookCandidate(book),
      match_type: 'regex'
    }))
  }

  if (mode === 'semantic') {
    const { apiKey, baseURL, embeddingModel } = getAIConfig()
    if (apiKey) {
      try {
        const rows = db.prepare(`
          SELECT bv.book_id, bv.vector,
                 b.id, b.title, b.author, b.isbn, b.publisher, b.publish_date,
                 b.description, b.keywords, b.available_quantity, b.total_quantity, b.status,
                 bc.name AS category_name
          FROM book_vectors bv
          JOIN books b ON bv.book_id = b.id
          JOIN book_categories bc ON b.category_id = bc.id
          WHERE bv.embedding_model = ? AND bv.vector != '[]' AND b.is_deleted = 0
        `).all(embeddingModel) as Array<BookRow & { book_id: number; vector: string }>

        if (rows.length > 0) {
          const client = new OpenAI({ apiKey, baseURL })
          const qResp = await client.embeddings.create({ model: embeddingModel, input: query })
          const qVec = qResp.data[0].embedding

          return rows
            .map(row => ({
              ...toBookResponse(row, {
                similarity: parseFloat(cosineSimilarity(JSON.parse(row.vector), qVec).toFixed(4)),
                match_type: 'semantic'
              })
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
        }
      } catch {
        // fall through to keyword mode
      }
    }
  }

  const q = `%${query}%`
  const books = db.prepare(`
    ${BOOK_BASE_SELECT}
      AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.description LIKE ? OR b.keywords LIKE ? OR b.publisher LIKE ?)
    LIMIT 50
  `).all(q, q, q, q, q, q) as BookRow[]

  return books
    .map(book => {
      const ranked = rankKeywordBook(book, query)
      return {
        ...toBookResponse(book, {
          match_type: ranked.matchType,
          exact_match: ranked.exactMatch,
          _score: ranked.score
        })
      }
    })
    .sort((a, b) => b._score - a._score || b.available_quantity - a.available_quantity || a.id - b.id)
    .slice(0, limit)
    .map(({ _score, ...book }) => book)
}

function executeRecommendBooks(args: { genre: string; count?: number }): { books: any[] } {
  const { genre, count = 5 } = args
  const q = `%${genre}%`

  let books = db.prepare(`
    ${BOOK_BASE_SELECT}
      AND (b.title LIKE ? OR b.author LIKE ? OR b.keywords LIKE ? OR b.description LIKE ? OR bc.name LIKE ?)
    ORDER BY b.total_quantity DESC, b.available_quantity DESC
    LIMIT ?
  `).all(q, q, q, q, q, count) as BookRow[]

  if (books.length < count) {
    const existingIds = books.map(book => book.id)
    const placeholders = existingIds.map(() => '?').join(', ')
    const extra = db.prepare(`
      ${BOOK_BASE_SELECT}
      ${existingIds.length > 0 ? `AND b.id NOT IN (${placeholders})` : ''}
      ORDER BY b.total_quantity DESC, b.id ASC
      LIMIT ?
    `).all(...existingIds, count - books.length) as BookRow[]
    books = [...books, ...extra]
  }

  return { books: books.map(book => toBookResponse(book)) }
}

function executeGetBookDetails(args: BookReferenceArgs): any {
  const resolved = resolveBookReference(args)
  if (resolved.status !== 'resolved') {
    return buildLookupFailure(resolved)
  }

  const book = resolved.book
  const borrowers = db.prepare(`
    SELECT r.name AS reader_name, r.reader_no, br.borrow_date, br.due_date, br.status
    FROM borrowing_records br
    JOIN readers r ON br.reader_id = r.id
    WHERE br.book_id = ? AND br.status = 'borrowed' AND br.is_deleted = 0
    ORDER BY br.due_date ASC
  `).all(book.id) as any[]

  return {
    found: true,
    ...toBookResponse(book),
    borrowing_status: {
      available_quantity: book.available_quantity,
      total_quantity: book.total_quantity,
      borrowed_count: borrowers.length,
      current_borrowers: borrowers
    }
  }
}

function executeGetBorrowingStatus(args: BookReferenceArgs): any {
  const resolved = resolveBookReference(args)
  if (resolved.status !== 'resolved') {
    return buildLookupFailure(resolved)
  }

  const book = resolved.book
  const borrowers = db.prepare(`
    SELECT r.name AS reader_name, r.reader_no, br.borrow_date, br.due_date, br.status
    FROM borrowing_records br
    JOIN readers r ON br.reader_id = r.id
    WHERE br.book_id = ? AND br.status = 'borrowed' AND br.is_deleted = 0
    ORDER BY br.due_date ASC
  `).all(book.id) as any[]

  return {
    found: true,
    book: mapBookCandidate(book),
    available_quantity: book.available_quantity,
    total_quantity: book.total_quantity,
    borrowed_count: borrowers.length,
    current_borrowers: borrowers
  }
}

async function executeBorrowBook(args: BookReferenceArgs, context: ToolContext): Promise<any> {
  if (!context.readerId) {
    return {
      success: false,
      message: '您的账号未关联读者信息，无法执行借阅操作，请联系管理员。'
    }
  }

  const resolved = resolveBookReference(args)
  if (resolved.status !== 'resolved') {
    return buildBorrowFailure(resolved)
  }

  try {
    const service = new BorrowingService()
    const record = await service.borrowBook(context.readerId, resolved.book.id)
    return {
      success: true,
      message: `借阅成功：${resolved.book.title}`,
      book: mapBookCandidate(resolved.book),
      due_date: record.due_date
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || '借阅失败',
      book: mapBookCandidate(resolved.book)
    }
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
    notes: result.items.map(note => ({
      id: note.id,
      title: note.title,
      author_name: note.author_name,
      book_title: note.book_title,
      content: note.content.length > 100 ? `${note.content.slice(0, 100)}...` : note.content,
      view_count: note.view_count,
      created_at: note.created_at
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
  } catch (error: any) {
    return { success: false, message: error?.message || '发布笔记失败' }
  }
}

function executeGetMyBorrowings(context: ToolContext): any {
  if (!context.readerId) {
    return {
      success: false,
      message: '您的账号未关联读者信息，无法查看借阅记录。'
    }
  }

  const records = db.prepare(`
    SELECT b.title AS book_title, br.borrow_date, br.due_date, br.status,
           br.renewal_count,
           CASE
             WHEN br.status = 'overdue' THEN CAST(julianday('now') - julianday(br.due_date) AS INTEGER)
             ELSE 0
           END AS overdue_days
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
    SELECT b.id, b.title, b.author, b.isbn, bc.name AS category_name,
           b.available_quantity,
           COUNT(br.id) AS borrow_count
    FROM borrowing_records br
    JOIN books b ON br.book_id = b.id
    JOIN book_categories bc ON b.category_id = bc.id
    WHERE br.is_deleted = 0 AND b.is_deleted = 0
      AND br.borrow_date >= date('now', '-30 days')
  `
  const params: any[] = []

  if (category) {
    query += ' AND bc.name LIKE ?'
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
           rc.name AS category_name, rc.max_borrow_count, rc.max_borrow_days
    FROM readers r
    JOIN reader_categories rc ON r.category_id = rc.id
    WHERE r.id = ? AND r.is_deleted = 0
  `).get(context.readerId) as any

  if (!reader) {
    return { success: false, message: '未找到读者信息。' }
  }

  const stats = db.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'borrowed' THEN 1 END) AS current_borrowings,
      COUNT(CASE WHEN status = 'overdue' THEN 1 END) AS overdue_count
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
      return { result: await executeSearchBooks(args as { query: string; mode?: SearchMode; limit?: number }) }

    case 'recommend_books': {
      const recResult = executeRecommendBooks(args as { genre: string; count?: number })
      return {
        result: recResult.books,
        sideEffect: { type: 'recommend', books: recResult.books }
      }
    }

    case 'get_book_details':
      return { result: executeGetBookDetails(args as BookReferenceArgs) }

    case 'get_borrowing_status':
      return { result: executeGetBorrowingStatus(args as BookReferenceArgs) }

    case 'borrow_book':
      return { result: await executeBorrowBook(args as BookReferenceArgs, context) }

    case 'search_notes':
      return { result: executeSearchNotes(args as { query: string; book_id?: number; limit?: number }) }

    case 'publish_note':
      return { result: executePublishNote(args as { title: string; content: string; book_id?: number }, context) }

    case 'get_my_borrowings':
      return { result: executeGetMyBorrowings(context) }

    case 'get_popular_books':
      return { result: executeGetPopularBooks(args as { limit?: number; category?: string }) }

    case 'get_reader_info':
      return { result: executeGetReaderInfo(context) }

    default:
      return { result: { error: `未知工具: ${name}` } }
  }
}
