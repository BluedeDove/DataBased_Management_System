<template>
  <div class="notes-page">
    <!-- Left: Note List Panel -->
    <aside class="notes-sidebar">
      <!-- Tabs: My Notes / Plaza -->
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: activeTab === 'my' }" @click="switchTab('my')">我的笔记</button>
        <button class="tab-btn" :class="{ active: activeTab === 'plaza' }" @click="switchTab('plaza')">公开广场</button>
      </div>

      <!-- Search + Filter row -->
      <div class="sidebar-toolbar">
        <div class="search-bar">
          <el-icon class="search-icon"><Search /></el-icon>
          <input v-model="searchKeyword" placeholder="搜索笔记…" @keydown.enter="loadNotes" />
        </div>
        <template v-if="activeTab === 'my'">
          <el-select v-model="visibilityFilter" size="small" style="width: 96px" @change="loadNotes">
            <el-option label="全部" value="" />
            <el-option label="私有" value="private" />
            <el-option label="公开" value="public" />
            <el-option label="传承" value="legacy" />
          </el-select>
        </template>
        <template v-else>
          <el-select v-model="plazaOrderBy" size="small" style="width: 80px" @change="loadNotes">
            <el-option label="最新" value="newest" />
            <el-option label="最热" value="hottest" />
          </el-select>
        </template>
      </div>

      <!-- New note button (my tab only) -->
      <button v-if="activeTab === 'my'" class="new-note-btn" @click="createNewNote">
        <el-icon><Plus /></el-icon> 新建笔记
      </button>

      <!-- Note list -->
      <div class="note-list" v-loading="listLoading">
        <div
          v-for="note in noteList"
          :key="note.id"
          class="note-item"
          :class="{ active: selectedNote?.id === note.id }"
          @click="selectNote(note)"
        >
          <div class="note-item-header">
            <span class="note-title">{{ note.title || '无标题' }}</span>
            <span class="note-vis-badge" :class="note.visibility">{{ visLabel(note.visibility) }}</span>
          </div>
          <div class="note-meta">
            <span v-if="activeTab === 'plaza'" class="note-author">{{ note.author_name }}</span>
            <span v-if="note.book_title" class="note-book">📖 {{ note.book_title }}</span>
            <span class="note-time">{{ formatDate(note.updated_at) }}</span>
          </div>
          <div class="note-excerpt">{{ stripMarkdown(note.content) }}</div>
          <div v-if="activeTab === 'plaza'" class="note-views">
            <el-icon><View /></el-icon> {{ note.view_count }}
          </div>
        </div>
        <div v-if="!listLoading && noteList.length === 0" class="note-empty">
          <el-icon style="font-size: 36px; opacity: 0.25"><EditPen /></el-icon>
          <p>{{ activeTab === 'my' ? '还没有笔记，点击"新建笔记"开始' : '广场暂无公开笔记' }}</p>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="total > pageSize" class="sidebar-pagination">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          small
          @current-change="loadNotes"
        />
      </div>
    </aside>

    <!-- Right: Editor / Viewer -->
    <main class="note-editor-area">
      <!-- Placeholder when nothing selected -->
      <div v-if="!selectedNote && !isCreating" class="editor-empty">
        <el-icon style="font-size: 60px; opacity: 0.15"><EditPen /></el-icon>
        <p>从左侧选择一篇笔记，或点击"新建笔记"</p>
      </div>

      <!-- Editor / Viewer -->
      <template v-else>
        <!-- Toolbar -->
        <div class="editor-toolbar">
          <div class="editor-toolbar-left">
            <input
              v-model="editTitle"
              class="title-input"
              placeholder="笔记标题…"
              :disabled="isReadOnly"
            />
          </div>
          <div class="editor-toolbar-right">
            <!-- Visibility selector (own notes only) -->
            <template v-if="!isReadOnly">
              <el-select v-model="editVisibility" size="small" style="width: 100px">
                <el-option label="🔒 私有" value="private" />
                <el-option label="🌐 公开" value="public" />
                <el-option label="📖 传承" value="legacy" />
              </el-select>
              <!-- Book association -->
              <el-tooltip
                v-if="editVisibility === 'legacy' && activeBorrowedBooks.length === 0"
                content="传承笔记需先借阅图书"
                placement="bottom"
              >
                <el-select
                  v-model="editBookId"
                  size="small"
                  style="width: 160px"
                  clearable
                  filterable
                  :placeholder="editVisibility === 'legacy' ? '选择借阅中的图书' : '关联图书（可选）'"
                  :disabled="editVisibility === 'legacy' && activeBorrowedBooks.length === 0"
                >
                  <el-option
                    v-for="book in currentBookOptions"
                    :key="book.id"
                    :label="book.title"
                    :value="book.id"
                  />
                </el-select>
              </el-tooltip>
              <el-select
                v-else
                v-model="editBookId"
                size="small"
                style="width: 160px"
                clearable
                filterable
                :placeholder="editVisibility === 'legacy' ? '选择借阅中的图书' : '关联图书（可选）'"
              >
                <el-option
                  v-for="book in currentBookOptions"
                  :key="book.id"
                  :label="book.title"
                  :value="book.id"
                />
              </el-select>
              <!-- Legacy hint -->
              <span v-if="editVisibility === 'legacy' && activeBorrowedBooks.length === 0" class="legacy-hint">
                ⚠ 请先借阅图书
              </span>
              <!-- Preview toggle -->
              <button class="toolbar-btn" :class="{ active: showPreview }" @click="showPreview = !showPreview" title="预览">
                <el-icon><View /></el-icon>
              </button>
              <!-- Save button -->
              <button class="save-btn" :disabled="saving" @click="saveNote">
                <el-icon><Check /></el-icon> {{ saving ? '保存中…' : '保存' }}
              </button>
              <!-- Delete (own notes in my tab) -->
              <button v-if="selectedNote && activeTab === 'my'" class="delete-btn" @click="confirmDelete">
                <el-icon><Delete /></el-icon>
              </button>
            </template>
            <template v-else>
              <span class="note-vis-badge" :class="selectedNote?.visibility">{{ visLabel(selectedNote?.visibility) }}</span>
            </template>
          </div>
        </div>

        <!-- Editor body: split or single -->
        <div class="editor-body" :class="{ split: showPreview && !isReadOnly }">
          <!-- Markdown textarea (edit mode) -->
          <div v-if="!isReadOnly" class="editor-pane">
            <el-input
              v-model="editContent"
              type="textarea"
              :autosize="false"
              placeholder="支持 Markdown 语法…"
              class="md-textarea"
            />
          </div>
          <!-- Preview / Read-only -->
          <div
            class="preview-pane"
            :class="{ readonly: isReadOnly }"
            v-html="renderedContent"
          />
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search, Plus, EditPen, View, Check, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useUserStore } from '@/store/user'
import { notesApi, type Note } from '../api/notes.api'
import apiClient from '../api/index'

const userStore = useUserStore()

// ── State ──────────────────────────────────────────────────────
const activeTab = ref<'my' | 'plaza'>('my')
const searchKeyword = ref('')
const visibilityFilter = ref('')
const plazaOrderBy = ref<'newest' | 'hottest'>('newest')

const noteList = ref<Note[]>([])
const listLoading = ref(false)
const page = ref(1)
const pageSize = 20
const total = ref(0)

const selectedNote = ref<Note | null>(null)
const isCreating = ref(false)

const editTitle = ref('')
const editContent = ref('')
const editVisibility = ref<'private' | 'public' | 'legacy'>('private')
const editBookId = ref<number | null>(null)
const showPreview = ref(false)
const saving = ref(false)

const activeBorrowedBooks = ref<{ id: number; title: string }[]>([])
const bookOptions = ref<{ id: number; title: string }[]>([])

// ── Computed ───────────────────────────────────────────────────
const isReadOnly = computed(() => {
  if (isCreating.value) return false
  if (!selectedNote.value) return false
  // plaza tab is always read-only; my tab is editable (own notes)
  if (activeTab.value === 'plaza') return true
  return selectedNote.value.user_id !== userStore.user?.id
})

// 传承模式只能选择当前借阅中的书；其他模式显示全部图书
const currentBookOptions = computed(() => {
  if (editVisibility.value === 'legacy') return activeBorrowedBooks.value
  return bookOptions.value
})

const renderedContent = computed(() => {
  const src = isReadOnly.value ? (selectedNote.value?.content ?? '') : editContent.value
  if (!src) return '<p style="color:var(--text-muted);font-size:13px">预览区域</p>'
  return DOMPurify.sanitize(marked(src) as string)
})

// ── Helpers ────────────────────────────────────────────────────
const visLabel = (v?: string) => ({ private: '私有', public: '公开', legacy: '传承' }[v ?? ''] ?? v ?? '')

const formatDate = (s: string) => {
  const d = new Date(s)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const stripMarkdown = (s: string) => s.replace(/[#*`_~>\[\]!]/g, '').slice(0, 60)

// ── Data loading ───────────────────────────────────────────────
const loadNotes = async () => {
  listLoading.value = true
  try {
    let result: any
    if (activeTab.value === 'my') {
      result = await notesApi.getMyNotes({ visibility: visibilityFilter.value || undefined, page: page.value, pageSize })
    } else {
      result = await notesApi.getPlazaNotes({ keyword: searchKeyword.value || undefined, page: page.value, pageSize, orderBy: plazaOrderBy.value })
    }
    if (result.success) {
      noteList.value = result.data.items
      total.value = result.data.total
    }
  } catch { ElMessage.error('加载笔记失败') }
  finally { listLoading.value = false }
}

const loadBookOptions = async () => {
  try {
    // 获取当前用户的借阅中图书（用于传承笔记，包含借阅中和逾期）
    const r = await apiClient.get('/borrowings/my')
    if (r.data.success) {
      activeBorrowedBooks.value = r.data.data.items
        .filter((b: any) => b.status === 'borrowed' || b.status === 'overdue')
        .map((b: any) => ({ id: b.book_id, title: b.book_title }))
    }
  } catch {}
  try {
    // 获取全部图书（用于普通关联）
    const r2 = await apiClient.get('/books', { params: { page: 1, pageSize: 200 } })
    if (r2.data.success) {
      bookOptions.value = r2.data.data.items.map((b: any) => ({ id: b.id, title: b.title }))
    }
  } catch {}
}

// ── Actions ────────────────────────────────────────────────────
const switchTab = (tab: 'my' | 'plaza') => {
  activeTab.value = tab
  page.value = 1
  searchKeyword.value = ''
  selectedNote.value = null
  isCreating.value = false
  loadNotes()
}

const selectNote = async (note: Note) => {
  isCreating.value = false
  selectedNote.value = note
  editTitle.value = note.title
  editContent.value = note.content
  editVisibility.value = note.visibility
  editBookId.value = note.book_id
  showPreview.value = false

  // If plaza note, fetch fresh (increments view count)
  if (activeTab.value === 'plaza') {
    try {
      const r = await notesApi.getNoteById(note.id)
      if (r.success) selectedNote.value = r.data
    } catch {}
  }
}

const createNewNote = () => {
  selectedNote.value = null
  isCreating.value = true
  editTitle.value = ''
  editContent.value = ''
  editVisibility.value = 'private'
  editBookId.value = null
  showPreview.value = false
}

const saveNote = async () => {
  if (!editTitle.value.trim() && !editContent.value.trim()) {
    ElMessage.warning('标题和内容不能同时为空')
    return
  }
  if (editVisibility.value === 'legacy' && !editBookId.value) {
    ElMessage.warning('传承笔记必须关联一本您正在借阅的图书')
    return
  }
  if (editVisibility.value === 'legacy' && activeBorrowedBooks.value.length === 0) {
    ElMessage.warning('您当前没有借阅中的图书，无法创建传承笔记')
    return
  }
  saving.value = true
  try {
    const payload = {
      title: editTitle.value || '无标题',
      content: editContent.value,
      visibility: editVisibility.value,
      book_id: editBookId.value ?? null
    }
    if (isCreating.value) {
      const r = await notesApi.createNote(payload)
      if (r.success) {
        ElMessage.success('笔记已创建')
        isCreating.value = false
        selectedNote.value = r.data
        loadNotes()
      }
    } else if (selectedNote.value) {
      const r = await notesApi.updateNote(selectedNote.value.id, payload)
      if (r.success) {
        ElMessage.success('保存成功')
        selectedNote.value = r.data
        loadNotes()
      }
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error?.message || '保存失败')
  } finally { saving.value = false }
}

const confirmDelete = async () => {
  if (!selectedNote.value) return
  await ElMessageBox.confirm('确定删除这篇笔记吗？删除后无法恢复。', '删除笔记', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  try {
    const r = await notesApi.deleteNote(selectedNote.value.id)
    if (r.success) {
      ElMessage.success('笔记已删除')
      selectedNote.value = null
      loadNotes()
    }
  } catch { ElMessage.error('删除失败') }
}

// 切换可见性时处理图书关联逻辑
watch(editVisibility, (v) => {
  if (v === 'legacy') {
    // 切换到传承：如果当前关联的书不在借阅列表中，则重置为第一本借阅中的书
    const borrowedIds = activeBorrowedBooks.value.map(b => b.id)
    if (editBookId.value && !borrowedIds.includes(editBookId.value)) {
      editBookId.value = null
    }
    if (!editBookId.value && activeBorrowedBooks.value.length) {
      editBookId.value = activeBorrowedBooks.value[0].id
    }
  }
})

onMounted(() => { loadNotes(); loadBookOptions() })
</script>

<style scoped>
.notes-page {
  display: flex;
  gap: 0;
  height: calc(100vh - 128px);
  margin: -28px -32px;
}

/* ── Sidebar ── */
.notes-sidebar {
  width: 300px;
  flex-shrink: 0;
  background: rgba(255,255,255,0.38);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border-right: 1px solid rgba(255,255,255,0.35);
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 10px;
}

.tab-bar {
  display: flex;
  background: rgba(255,255,255,0.3);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}
.tab-btn {
  flex: 1;
  padding: 7px 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-sans);
  transition: all 0.15s;
}
.tab-btn.active {
  background: var(--gradient-brand);
  color: #fff;
  box-shadow: 0 2px 8px rgba(200,16,46,0.25);
}

.sidebar-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}
.search-bar {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 8px;
  color: var(--text-muted);
  font-size: 13px;
  pointer-events: none;
}
.search-bar input {
  width: 100%;
  height: 32px;
  padding: 0 8px 0 28px;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-input);
  background: rgba(255,255,255,0.5);
  font-size: 12px;
  font-family: var(--font-sans);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s;
}
.search-bar input:focus { border-color: var(--gdut-red); }

.new-note-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border: 1.5px dashed rgba(200,16,46,0.35);
  border-radius: 10px;
  background: var(--gdut-red-tint);
  color: var(--gdut-red);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-sans);
  transition: all 0.15s;
}
.new-note-btn:hover {
  border-color: var(--gdut-red);
  background: rgba(200,16,46,0.12);
}

.note-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note-item {
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  background: rgba(255,255,255,0.35);
  border: 1px solid rgba(255,255,255,0.4);
  transition: all 0.15s;
}
.note-item:hover { background: rgba(255,255,255,0.55); transform: translateY(-1px); }
.note-item.active { background: rgba(255,255,255,0.65); border-color: rgba(200,16,46,0.25); box-shadow: 0 2px 12px rgba(200,16,46,0.08); }

.note-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.note-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.note-vis-badge {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 99px;
  flex-shrink: 0;
  font-weight: 500;
}
.note-vis-badge.private { background: var(--gdut-purple-tint); color: var(--gdut-purple); }
.note-vis-badge.public  { background: var(--success-tint);      color: var(--success); }
.note-vis-badge.legacy  { background: var(--warning-tint);      color: var(--warning); }

.note-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.note-author { color: var(--gdut-purple); font-weight: 500; }
.note-book { color: var(--info); }
.note-time { margin-left: auto; }

.note-excerpt {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.note-views {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.note-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 16px;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
}

.sidebar-pagination {
  display: flex;
  justify-content: center;
}

/* ── Editor Area ── */
.note-editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: transparent;
}

.editor-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100%;
  color: var(--text-muted);
  font-size: 14px;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  background: rgba(255,255,255,0.40);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid rgba(255,255,255,0.35);
}
.editor-toolbar-left { flex: 1; min-width: 0; }
.editor-toolbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.title-input {
  width: 100%;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  border: none;
  background: transparent;
  outline: none;
  font-family: var(--font-sans);
  padding: 0;
}
.title-input::placeholder { color: var(--text-muted); font-weight: 400; }
.title-input:disabled { color: var(--text-primary); cursor: default; }

.toolbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1.5px solid var(--border-color);
  background: rgba(255,255,255,0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 15px;
  transition: all 0.15s;
}
.toolbar-btn:hover { border-color: var(--gdut-red); color: var(--gdut-red); }
.toolbar-btn.active { background: var(--gdut-red-tint); border-color: var(--gdut-red); color: var(--gdut-red); }

.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: none;
  border-radius: 8px;
  background: var(--gradient-brand);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-sans);
  transition: opacity 0.15s;
}
.save-btn:hover { opacity: 0.9; }
.save-btn:disabled { opacity: 0.6; cursor: default; }

.delete-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1.5px solid var(--border-color);
  background: rgba(255,255,255,0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 15px;
  transition: all 0.15s;
}
.delete-btn:hover { border-color: var(--danger); color: var(--danger); background: var(--danger-tint); }

.legacy-hint {
  font-size: 11px;
  color: var(--warning);
  white-space: nowrap;
  font-weight: 500;
}

/* ── Editor Body ── */
.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.editor-body.split .editor-pane { width: 50%; border-right: 1px solid rgba(255,255,255,0.35); }
.editor-body.split .preview-pane { width: 50%; }

.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.editor-pane :deep(.el-textarea) { height: 100%; }
.editor-pane :deep(.el-textarea__inner) {
  height: 100% !important;
  border: none !important;
  border-radius: 0 !important;
  background: rgba(255,255,255,0.30) !important;
  backdrop-filter: blur(8px);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  resize: none;
  padding: 20px 24px;
}
.editor-pane :deep(.el-textarea__inner):focus {
  box-shadow: none !important;
}

.preview-pane {
  flex: 1;
  overflow-y: auto;
  padding: 20px 28px;
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.preview-pane.readonly {
  flex: 1;
  background: rgba(255,255,255,0.28);
}

/* Markdown content styles */
.preview-pane :deep(h1),
.preview-pane :deep(h2),
.preview-pane :deep(h3) { color: var(--text-primary); font-weight: 700; margin: 1em 0 0.5em; }
.preview-pane :deep(h1) { font-size: 1.5em; }
.preview-pane :deep(h2) { font-size: 1.25em; }
.preview-pane :deep(h3) { font-size: 1.1em; }
.preview-pane :deep(p) { color: var(--text-secondary); line-height: 1.8; margin-bottom: 0.75em; font-size: 14px; }
.preview-pane :deep(code) { background: rgba(124,58,237,0.08); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; color: var(--gdut-purple); }
.preview-pane :deep(pre) { background: rgba(28,16,51,0.06); padding: 12px 16px; border-radius: 10px; overflow-x: auto; margin-bottom: 0.75em; }
.preview-pane :deep(pre code) { background: transparent; padding: 0; color: var(--text-primary); }
.preview-pane :deep(blockquote) { border-left: 3px solid var(--gdut-red); padding-left: 12px; color: var(--text-muted); font-style: italic; margin-bottom: 0.75em; }
.preview-pane :deep(ul), .preview-pane :deep(ol) { padding-left: 20px; margin-bottom: 0.75em; color: var(--text-secondary); font-size: 14px; line-height: 1.8; }
.preview-pane :deep(a) { color: var(--gdut-red); text-decoration: none; }
.preview-pane :deep(a:hover) { text-decoration: underline; }
.preview-pane :deep(hr) { border: none; border-top: 1px solid var(--border-color); margin: 1.5em 0; }

@media (max-width: 900px) {
  .notes-sidebar { width: 240px; }
}
@media (max-width: 700px) {
  .notes-page { flex-direction: column; }
  .notes-sidebar { width: 100%; height: 260px; }
}
</style>
