import { bookApi, type Book } from '@/api/book.api'
import { readerApi, type Reader } from '@/api/reader.api'

export interface BookSuggestionItem {
  value: string
  id: number
  title: string
  author: string
  isbn: string
  status: string
  availableQuantity: number
}

export interface ReaderSuggestionItem {
  value: string
  id: number
  name: string
  readerNo: string
  categoryName: string
  status: string
}

function rankBookSuggestions(items: Book[], keyword: string): Book[] {
  const normalizedKeyword = keyword.trim().toLowerCase()

  return [...items].sort((left, right) => {
    const leftExact = left.isbn === keyword || left.title.toLowerCase() === normalizedKeyword
    const rightExact = right.isbn === keyword || right.title.toLowerCase() === normalizedKeyword

    if (leftExact !== rightExact) return leftExact ? -1 : 1
    if (left.available_quantity !== right.available_quantity) {
      return right.available_quantity - left.available_quantity
    }

    return left.title.localeCompare(right.title, 'zh-CN')
  })
}

function rankReaderSuggestions(items: Reader[], keyword: string): Reader[] {
  const normalizedKeyword = keyword.trim().toLowerCase()

  return [...items].sort((left, right) => {
    const leftExact = left.reader_no.toLowerCase() === normalizedKeyword || left.name === keyword
    const rightExact = right.reader_no.toLowerCase() === normalizedKeyword || right.name === keyword

    if (leftExact !== rightExact) return leftExact ? -1 : 1
    return left.reader_no.localeCompare(right.reader_no, 'en')
  })
}

export async function fetchBookSuggestions(keyword: string, limit = 6): Promise<BookSuggestionItem[]> {
  const query = keyword.trim()
  if (query.length < 2) return []

  const result = await bookApi.getAll({ keyword: query })
  if (!result.success || !result.data) return []

  return rankBookSuggestions(result.data, query)
    .slice(0, limit)
    .map(book => ({
      value: book.title,
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      status: book.status,
      availableQuantity: book.available_quantity
    }))
}

export async function fetchReaderSuggestions(keyword: string, limit = 6): Promise<ReaderSuggestionItem[]> {
  const query = keyword.trim()
  if (query.length < 2) return []

  const result = await readerApi.search(query)
  if (!result.success || !result.data) return []

  return rankReaderSuggestions(result.data, query)
    .slice(0, limit)
    .map(reader => ({
      value: reader.reader_no,
      id: reader.id,
      name: reader.name,
      readerNo: reader.reader_no,
      categoryName: reader.category_name,
      status: reader.status
    }))
}
