# Phase 3.1 & 3.3 Implementation: Advanced Search Features

This document demonstrates the new conditional search and regex search features for books.

## Phase 3.1: Enhanced Conditional Search

The `advancedSearch` method in `BookRepository` has been enhanced with additional filter options:

### New Filter Fields

- `title`: Book title (partial match)
- `author`: Author name (partial match)
- `publisher`: Publisher name (partial match)
- `category_id`: Exact category ID match
- `publishDateFrom`: Minimum publish date
- `publishDateTo`: Maximum publish date
- `priceMin`: Minimum price
- `priceMax`: Maximum price
- `keyword`: Search across title, author, and keywords fields
- `status`: Book status (normal, damaged, lost, destroyed)

### Usage Example

```typescript
import { BookService } from '@/domains/book/book.service'

const bookService = new BookService()

// Search for books with multiple conditions
const results = bookService.advancedSearchBooks({
  author: 'Smith',
  publishDateFrom: '2020-01-01',
  publishDateTo: '2023-12-31',
  priceMin: 10,
  priceMax: 50,
  status: 'normal'
})

// Search with keyword across multiple fields
const keywordResults = bookService.advancedSearchBooks({
  keyword: 'science',
  category_id: 1
})
```

### Key Changes

1. **Removed hardcoded status filter**: The old implementation only searched for books with status='normal'. The new version allows filtering by any status or no status filter at all.

2. **Added price range filtering**: Support for `priceMin` and `priceMax` filters.

3. **Added keyword search**: The `keyword` parameter searches across title, author, and keywords fields simultaneously.

4. **Renamed date parameters**: Changed from `publish_date_start/end` to `publishDateFrom/To` for consistency.

5. **Changed WHERE clause**: Changed from `WHERE b.status = 'normal'` to `WHERE 1=1` to support optional status filtering.

## Phase 3.3: Regex Search Service

A new `RegexSearchService` has been created to support regular expression pattern matching.

### Features

- Search books using regex patterns
- Search readers using regex patterns
- Specify which fields to search
- Case-insensitive by default
- Error handling for invalid regex patterns

### Usage Example

```typescript
import { RegexSearchService } from '@/domains/search/regex-search.service'

const regexSearchService = new RegexSearchService()

// Search books with regex pattern
// Example: Find all books with titles starting with "The"
const books = regexSearchService.searchBooks('^The', ['title'])

// Example: Find books with authors containing "John" or "Jane"
const authorBooks = regexSearchService.searchBooks('Joh?n|Jane', ['author'])

// Example: Search across multiple fields
const multiFieldBooks = regexSearchService.searchBooks(
  'data|science|programming',
  ['title', 'author', 'description']
)

// Search readers with regex pattern
// Example: Find readers with phone numbers matching a pattern
const readers = regexSearchService.searchReaders('138\\d{8}', ['phone'])

// Example: Find readers with names containing Chinese characters
const chineseReaders = regexSearchService.searchReaders('[\\u4e00-\\u9fa5]+', ['name'])
```

### Common Regex Patterns

```typescript
// Find books published in the 2020s
regexSearchService.searchBooks('202\\d', ['publish_date'])

// Find books with ISBN starting with 978
regexSearchService.searchBooks('^978', ['isbn'])

// Find books with price ending in .99
regexSearchService.searchBooks('\\.99$', ['price'])

// Find emails with specific domain
regexSearchService.searchReaders('@example\\.com$', ['email'])

// Find phone numbers with specific area code
regexSearchService.searchReaders('^\\+86', ['phone'])
```

### Error Handling

The service validates regex patterns and throws a `ValidationError` if the pattern is invalid:

```typescript
try {
  const results = regexSearchService.searchBooks('[invalid(pattern', ['title'])
} catch (error) {
  // Error: 无效的正则表达式: Unterminated character class
  console.error(error.message)
}
```

## File Locations

- **Enhanced Repository**: `F:\coding\数据库课设\DataBased_Management_System\src\main\domains\book\book.repository.ts`
- **Enhanced Service**: `F:\coding\数据库课设\DataBased_Management_System\src\main\domains\book\book.service.ts`
- **New Regex Search Service**: `F:\coding\数据库课设\DataBased_Management_System\src\main\domains\search\regex-search.service.ts`
- **Search Module Index**: `F:\coding\数据库课设\DataBased_Management_System\src\main\domains\search\index.ts`

## Benefits

1. **Flexible Filtering**: Users can now combine multiple search criteria for precise results
2. **Price Range Search**: Find books within specific price ranges
3. **Status Filtering**: Search for books regardless of their status
4. **Pattern Matching**: Use powerful regex patterns for complex searches
5. **Logging**: All searches are logged for debugging and analytics
6. **Type Safety**: Full TypeScript support with proper type definitions
7. **Error Handling**: Proper validation and error messages for invalid inputs
