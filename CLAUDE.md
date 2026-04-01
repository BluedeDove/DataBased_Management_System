# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Node.js Version Requirements

**CRITICAL**: This project requires Node.js 20.20.2 (configured via Volta).

```bash
# Supported range
"node": ">=18.0.0 <24.0.0"

# Volta pinned version
"volta": { "node": "20.20.2", "npm": "10.9.7" }
```

Always use `volta run --node 20.20.2` when running scripts:
```bash
volta run --node 20.20.2 npx tsx scripts/generate-data-v2.ts
```

## Native Module: better-sqlite3

**IMPORTANT**: `better-sqlite3` is a native Node.js module. It must be rebuilt when Node.js version changes.

```bash
volta run --node 20.20.2 npm rebuild better-sqlite3
```

If you see `ERR_DLOPEN_FAILED` or `Could not locate the bindings file`, rebuild the module.

## Project Architecture

This is a **B/S Web Application** (Vue 3 + Express.js).

```
├── server/           # Express.js backend (Port 3001)
│   └── src/
│       ├── domains/  # Business logic (ai, auth, book, borrowing, reader, search)
│       ├── database/ # SQLite with better-sqlite3
│       ├── routes/   # REST API endpoints
│       ├── middleware/ # Auth, validation, rate-limit, audit
│       ├── config/   # Environment config
│       └── lib/      # JWT, error handler
│
├── web/              # Vue 3 frontend (Port 3000)
│   └── src/
│       ├── api/      # Axios HTTP client + domain API modules
│       ├── components/ # Layout.vue (floating glassmorphic sidebar)
│       ├── router/   # Vue Router (hash mode, auth guards)
│       ├── store/    # Pinia (user auth state)
│       ├── styles/   # Global CSS (Glassmorphism design system)
│       └── views/    # 9 page components
│
├── scripts/          # Database utilities
│   ├── generate-data-v2.ts  # Test data generation
│   └── clear-database.ts    # Clear database
│
└── data/             # SQLite database files
    └── library.db
```

## Common Commands

```bash
# Start both servers (Windows)
start.bat

# Or manually from project root:
npm run dev:server    # Backend via tsx watch
npm run dev:web       # Frontend via Vite

# Generate test data
npm run db:generate                              # Default: 300 books, 100 readers
npm run db:generate -- --books 500 --readers 200 # Custom amounts
npm run db:generate -- --dry-run                 # Preview without inserting
npm run db:generate -- --seed 12345              # Reproducible results

# Clear database
npm run db:clear          # Keep admin account
npm run db:clear:all      # Remove all data
```

## Frontend Structure

### Tech Stack
- **Vue 3** (Composition API, `<script setup>`)
- **Element Plus** (Chinese locale zh-cn)
- **Pinia** (state management)
- **Vue Router 4** (hash mode)
- **ECharts 5** (charts)
- **Axios** (HTTP client with JWT refresh)
- **marked + DOMPurify** (AI chat markdown rendering)

### Pages (views/)

| Page | Description | Roles |
|------|-------------|-------|
| Login.vue | Split-screen login with animated particles | Public |
| Register.vue | Registration (student/teacher/reader) | Public |
| Dashboard.vue | KPI cards, 30-day trend chart, hot books TOP 5 | All |
| Books.vue | Book CRUD, category filter, advanced search (regex/SQL/semantic), export | All |
| Readers.vue | Reader CRUD, search, renew card | admin, librarian |
| Borrowing.vue | Borrow/return/renew tabs, overdue warnings | All |
| Statistics.vue | Book/reader/borrowing analytics with ECharts | admin, librarian |
| AIAssistant.vue | Streaming chat, conversation history, book recommendations | All |
| Settings.vue | Categories, AI config, vector management | admin, librarian |

### Design System (Glassmorphism)

The UI uses a Glassmorphism design system with GDUT branding:
- Primary color: `#C8102E` (GDUT red), accent: `#7C3AED` (purple)
- Glassmorphic cards: `backdrop-filter: blur(18px) saturate(180%)`
- Background: `#DED7C8` with animated floating orbs
- Rounded corners: cards 20px, buttons 12px
- Micro-animations: float breathing, sheen sweep, page fade transitions
- Pill-style tabs with gradient active state
- Floating sidebar (72px) with icon navigation + tooltips

### API Layer (web/src/api/)

- `index.ts` - Axios instance with JWT auto-attach, token refresh queue, 409 conflict handling
- `auth.api.ts` - Login, register, token validation
- `book.api.ts` - Book CRUD, category stats
- `reader.api.ts` - Reader CRUD, search, renew
- `borrowing.api.ts` - Borrow, return, renew, statistics
- `ai.api.ts` - Chat stream, conversations, semantic search, embeddings
- `other.api.ts` - Search (regex/SQL), export, config, reader categories

## Backend Structure (Domain-Driven)

```
server/src/domains/
├── ai/          # OpenAI integration, embeddings, vector search
├── auth/        # JWT auth, registration, password change
├── book/        # Book CRUD, category management
├── borrowing/   # Borrow/return/renew operations
├── reader/      # Reader management
└── search/      # Regex, SQL, semantic search
```

Each domain contains:
- `*.service.ts` - Business logic
- `*.repository.ts` - Data access
- Routes defined in `server/src/routes/`

## Database

- **Type**: SQLite via `better-sqlite3`
- **Location**: `data/library.db`
- **Features**: Optimistic locking (version field), soft delete, audit logging

### Key Tables
- `users` - Authentication (roles: admin/librarian/teacher/student)
- `books` / `book_categories` - Book inventory
- `readers` / `reader_categories` - Reader profiles
- `borrowing_records` - Borrowing transactions
- `ai_conversations` - AI chat history
- `operation_logs` / `audit_logs` - Audit trail

## Authentication

- JWT-based with token refresh mechanism
- Roles: `admin`, `librarian`, `teacher`, `student`
- Route guards: auth check + role-based access control
- Default accounts: `admin/admin123`, `librarian/lib123`
- Register page validates: username (alphanumeric + underscore), phone (`/^1[3-9]\d{9}$/`), email format

## Role-Based Navigation

The sidebar (`Layout.vue`) filters nav items by role:
- **All roles**: Dashboard, Books, Borrowing, AI Assistant
- **admin / librarian only**: Readers, Statistics, Settings
- Non-staff clicking restricted routes are redirected to `/dashboard`

## AI Configuration

AI config is stored in the **database** (`system_settings` table, `category='ai'`), not environment variables.
- `ai.routes.ts` reads DB on every request via `getAIConfig()` helper
- `config.routes.ts` also reads from DB for test connection
- Changes in Settings page take effect immediately (no restart needed)
- Required keys: `ai.openai.apiKey`, `ai.openai.baseURL`, `ai.openai.chatModel`

## Rate Limits (relaxed for development)

Configured in `server/src/middleware/rateLimit.middleware.ts`:
- Global: 1000 req / 15min
- API: 300 req / min
- Login: 20 attempts / 15min
- Register: 20 / hr
- AI chat: 30 / min

## Error Handling Patterns

Axios errors wrap backend messages at `error.response.data.error.message`.
Always extract errors as:
```ts
const msg = error?.response?.data?.error?.message || error?.message || '默认错误提示'
```

## Public Sharing via ngrok

To share the app over the internet (e.g. for demos):

**Files:**
- `ngrok.exe` - placed in project root (not committed to git)
- `ngrok.yml` - ngrok config (tunnels port 3000 only)
- `share.bat` - one-click share script

**Why only port 3000?**
Vite dev server proxies `/api/*` → `localhost:3001` server-side, so ngrok only needs to expose port 3000. The backend never needs to be publicly reachable.

**Usage:**
```bash
# 1. Start the app normally
start.bat

# 2. In a new PowerShell window, run the share script
.\share.bat
```

Copy the `https://xxxx.ngrok-free.app` URL from the ngrok output and share it.

**ngrok token setup (one-time):**
```powershell
# Run in PowerShell (not Claude Code terminal)
.\ngrok.exe config add-authtoken <your-token>
```

## Data Generation Script

The `scripts/generate-data-v2.ts` script generates realistic test data:
- Chinese names, phone numbers, ID cards
- Real book data (380+ titles)
- Boundary test cases (overdue, max borrowings, zero stock)

When modifying this script:
1. Use `--dry-run` to test without database writes
2. Generator files are in `scripts/generators/`
3. The script initializes database tables if needed
