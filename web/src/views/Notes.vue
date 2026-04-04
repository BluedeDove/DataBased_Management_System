<template>
  <div class="notes-page">
    <!-- ── Left: Sidebar ── -->
    <aside class="notes-sidebar">
      <!-- Tab bar -->
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: activeTab === 'my' }" @click="switchTab('my')">我的笔记</button>
        <button class="tab-btn" :class="{ active: activeTab === 'plaza' }" @click="switchTab('plaza')">公开广场</button>
        <button class="tab-btn legacy-tab" :class="{ active: activeTab === 'legacy-hall' }" @click="switchTab('legacy-hall')">
          传承长廊
        </button>
      </div>

      <!-- Search + filter row (hidden for legacy-hall) -->
      <div v-if="activeTab !== 'legacy-hall'" class="sidebar-toolbar">
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

      <!-- Legacy hall intro (replaces search bar) -->
      <div v-else class="legacy-hall-intro">
        <span class="scroll-icon">📜</span>
        <span>借阅中图书留下的前人智慧</span>
      </div>

      <!-- New note button (my tab only) -->
      <button v-if="activeTab === 'my'" class="new-note-btn" @click="createNewNote">
        <el-icon><Plus /></el-icon> 新建笔记
      </button>

      <!-- Note list -->
      <div class="note-list" v-loading="listLoading">

        <!-- ── Legacy-hall special cards ── -->
        <template v-if="activeTab === 'legacy-hall'">
          <div v-if="!listLoading && legacyForMeList.length === 0" class="note-empty">
            <span style="font-size:36px;opacity:0.25">📜</span>
            <p v-if="activeBorrowedBooks.length === 0">您当前没有借阅中的图书</p>
            <p v-else>您借阅的图书暂无前人留下的传承笔记</p>
          </div>
          <div
            v-for="note in legacyForMeList"
            :key="note.id"
            class="note-item legacy-card"
            :class="{ active: selectedNote?.id === note.id }"
            @click="selectLegacyNote(note)"
          >
            <div class="legacy-card-book">📖 {{ note.book_title }}</div>
            <div class="legacy-card-title">{{ note.title || '无标题' }}</div>
            <div class="legacy-card-meta">
              <span class="legacy-author">{{ note.author_name }}</span>
              <span class="legacy-time">{{ formatDate(note.updated_at) }}</span>
            </div>
            <div class="legacy-card-excerpt">{{ stripMarkdown(note.content) }}</div>
          </div>
        </template>

        <!-- ── Normal note items ── -->
        <template v-else>
          <div
            v-for="note in noteList"
            :key="note.id"
            class="note-item"
            :class="{ active: selectedNote?.id === note.id, 'is-legacy': note.visibility === 'legacy' }"
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
            <el-icon style="font-size:36px;opacity:0.25"><EditPen /></el-icon>
            <p>{{ activeTab === 'my' ? '还没有笔记，点击"新建笔记"开始' : '广场暂无公开笔记' }}</p>
          </div>
        </template>
      </div>

      <!-- Pagination (not for legacy-hall) -->
      <div v-if="activeTab !== 'legacy-hall' && total > pageSize" class="sidebar-pagination">
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

    <!-- ── Right: Editor / Viewer ── -->
    <main class="note-editor-area">
      <!-- Placeholder when nothing selected -->
      <div v-if="!selectedNote && !isCreating" class="editor-empty">
        <template v-if="activeTab === 'legacy-hall'">
          <span style="font-size:60px;opacity:0.15">📜</span>
          <p>从左侧选择一篇传承笔记阅读</p>
          <p class="editor-empty-hint">前人的智慧，在书页间流传</p>
        </template>
        <template v-else>
          <el-icon style="font-size:60px;opacity:0.15"><EditPen /></el-icon>
          <p>从左侧选择一篇笔记，或点击"新建笔记"</p>
        </template>
      </div>

      <!-- Editor / Viewer -->
      <template v-else>
        <!-- ── Legacy note special banner ── -->
        <div v-if="isLegacyView" class="legacy-banner">
          <div class="legacy-banner-inner">
            <div class="legacy-banner-title">
              <span class="legacy-scroll-icon">📜</span>
              <span>《{{ selectedNote?.book_title }}》的传承笔记</span>
            </div>
            <div class="legacy-banner-meta">
              <span class="legacy-banner-author">前借阅者&nbsp;·&nbsp;{{ selectedNote?.author_name }}</span>
              <span class="legacy-banner-dot">·</span>
              <span>{{ formatDateFull(selectedNote?.updated_at ?? '') }}</span>
              <span class="legacy-banner-dot">·</span>
              <span class="legacy-banner-views"><el-icon><View /></el-icon>&nbsp;{{ selectedNote?.view_count }}</span>
            </div>
          </div>
        </div>

        <!-- ── Normal toolbar (non-legacy-view) ── -->
        <div v-else class="editor-toolbar">
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
              <span v-if="editVisibility === 'legacy' && activeBorrowedBooks.length === 0" class="legacy-hint-text">
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
              <span v-if="selectedNote?.book_title" class="toolbar-book-tag">📖 {{ selectedNote.book_title }}</span>
            </template>
          </div>
        </div>

        <!-- Editor/viewer title row for legacy-view -->
        <div v-if="isLegacyView" class="legacy-title-bar">
          <h2 class="legacy-note-title">{{ selectedNote?.title || '无标题' }}</h2>
        </div>

        <!-- Editor body -->
        <div
          class="editor-body"
          :class="{
            split: showPreview && !isReadOnly && !isLegacyView,
            'legacy-body': isLegacyView
          }"
        >
          <!-- Markdown textarea (edit mode) -->
          <div v-if="!isReadOnly && !isLegacyView" class="editor-pane">
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
            :class="{ readonly: isReadOnly || isLegacyView, 'legacy-content': isLegacyView }"
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
const activeTab = ref<'my' | 'plaza' | 'legacy-hall'>('my')
const searchKeyword = ref('')
const visibilityFilter = ref('')
const plazaOrderBy = ref<'newest' | 'hottest'>('newest')

const noteList = ref<Note[]>([])
const legacyForMeList = ref<Note[]>([])
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
  if (activeTab.value === 'plaza') return true
  if (activeTab.value === 'legacy-hall') return true
  return selectedNote.value.user_id !== userStore.user?.id
})

// 传承长廊中看别人的传承笔记 → 特殊卷轴模式
const isLegacyView = computed(() =>
  activeTab.value === 'legacy-hall' && !!selectedNote.value
)

// 传承模式只能选择当前借阅中的书；其他模式显示全部图书
const currentBookOptions = computed(() => {
  if (editVisibility.value === 'legacy') return activeBorrowedBooks.value
  return bookOptions.value
})

const renderedContent = computed(() => {
  const src = (isReadOnly.value || isLegacyView.value)
    ? (selectedNote.value?.content ?? '')
    : editContent.value
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

const formatDateFull = (s: string) => {
  if (!s) return ''
  const d = new Date(s)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

const stripMarkdown = (s: string) => s.replace(/[#*`_~>\[\]!]/g, '').slice(0, 60)

// ── Data loading ───────────────────────────────────────────────
const loadNotes = async () => {
  if (activeTab.value === 'legacy-hall') return loadLegacyForMe()
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

const loadLegacyForMe = async () => {
  listLoading.value = true
  try {
    const r = await notesApi.getLegacyForMe()
    if (r.success) legacyForMeList.value = r.data.items
  } catch { ElMessage.error('加载传承笔记失败') }
  finally { listLoading.value = false }
}

const loadBookOptions = async () => {
  try {
    const r = await apiClient.get('/borrowings/my')
    if (r.data.success) {
      activeBorrowedBooks.value = r.data.data.items
        .filter((b: any) => b.status === 'borrowed' || b.status === 'overdue')
        .map((b: any) => ({ id: b.book_id, title: b.book_title }))
    }
  } catch {}
  try {
    const r2 = await apiClient.get('/books', { params: { page: 1, pageSize: 200 } })
    if (r2.data.success) {
      bookOptions.value = r2.data.data.items.map((b: any) => ({ id: b.id, title: b.title }))
    }
  } catch {}
}

// ── Actions ────────────────────────────────────────────────────
const switchTab = (tab: 'my' | 'plaza' | 'legacy-hall') => {
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
  if (activeTab.value === 'plaza') {
    try {
      const r = await notesApi.getNoteById(note.id)
      if (r.success) selectedNote.value = r.data
    } catch {}
  }
}

const selectLegacyNote = async (note: Note) => {
  selectedNote.value = note
  isCreating.value = false
  // Fetch full note to increment view count
  try {
    const r = await notesApi.getNoteById(note.id)
    if (r.success) selectedNote.value = r.data
  } catch {}
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
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-sans);
  transition: all 0.15s;
}
.tab-btn.active {
  background: var(--gradient-brand);
  color: #fff;
  box-shadow: 0 2px 8px rgba(200,16,46,0.25);
}
.tab-btn.legacy-tab.active {
  background: linear-gradient(135deg, #b8860b 0%, #daa520 100%);
  box-shadow: 0 2px 8px rgba(184,134,11,0.35);
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

/* Legacy hall intro bar */
.legacy-hall-intro {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  background: linear-gradient(90deg, rgba(184,134,11,0.12) 0%, rgba(218,165,32,0.06) 100%);
  border-radius: 10px;
  border: 1px solid rgba(184,134,11,0.2);
  font-size: 12px;
  color: #8b6914;
  font-weight: 500;
}
.scroll-icon { font-size: 15px; }

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
.new-note-btn:hover { border-color: var(--gdut-red); background: rgba(200,16,46,0.12); }

.note-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Normal note item ── */
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
.note-item.is-legacy { border-left: 3px solid #daa520; }

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
.note-vis-badge.legacy  { background: rgba(218,165,32,0.15);    color: #8b6914; }

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

/* ── Legacy gallery card ── */
.legacy-card {
  background: linear-gradient(135deg, rgba(255,248,220,0.75) 0%, rgba(255,255,255,0.5) 100%);
  border: 1px solid rgba(184,134,11,0.25);
  border-left: 3px solid #daa520;
}
.legacy-card:hover {
  background: linear-gradient(135deg, rgba(255,248,220,0.9) 0%, rgba(255,255,255,0.65) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(184,134,11,0.15);
}
.legacy-card.active {
  background: linear-gradient(135deg, rgba(255,248,220,0.95) 0%, rgba(255,255,255,0.8) 100%);
  border-color: #b8860b;
  box-shadow: 0 4px 16px rgba(184,134,11,0.25);
}
.legacy-card-book {
  font-size: 11px;
  color: #8b6914;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}
.legacy-card-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}
.legacy-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.legacy-author {
  color: #8b6914;
  font-weight: 500;
}
.legacy-time { margin-left: auto; font-size: 10px; }
.legacy-card-excerpt {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
.editor-empty-hint {
  font-size: 12px;
  opacity: 0.7;
  font-style: italic;
}

/* ── Legacy note banner ── */
.legacy-banner {
  background: linear-gradient(135deg, #fdf3dc 0%, #fef9ee 50%, #fffbf0 100%);
  border-bottom: 2px solid rgba(184,134,11,0.3);
  padding: 16px 24px 14px;
  position: relative;
  overflow: hidden;
}
.legacy-banner::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 40px,
    rgba(184,134,11,0.03) 40px,
    rgba(184,134,11,0.03) 41px
  );
  pointer-events: none;
}
.legacy-banner-inner { position: relative; z-index: 1; }
.legacy-banner-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 700;
  color: #6b4f0a;
  margin-bottom: 6px;
}
.legacy-scroll-icon { font-size: 22px; }
.legacy-banner-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8b6914;
}
.legacy-banner-author { font-weight: 600; }
.legacy-banner-dot { opacity: 0.45; }
.legacy-banner-views {
  display: flex;
  align-items: center;
  gap: 3px;
  opacity: 0.75;
}

/* ── Legacy note title bar ── */
.legacy-title-bar {
  padding: 14px 24px 0;
  background: linear-gradient(180deg, #fef9ee 0%, transparent 100%);
}
.legacy-note-title {
  font-size: 22px;
  font-weight: 800;
  color: #3d2e0a;
  margin: 0;
  font-family: var(--font-sans);
}

/* ── Normal toolbar ── */
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

.toolbar-book-tag {
  font-size: 11px;
  color: #8b6914;
  background: rgba(218,165,32,0.12);
  border: 1px solid rgba(184,134,11,0.2);
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 500;
}

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

.legacy-hint-text {
  font-size: 11px;
  color: var(--warning);
  white-space: nowrap;
  font-weight: 500;
}

/* ── Editor Body ── */
.editor-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}
.editor-body.split { }
.editor-body.legacy-body {
  background: linear-gradient(180deg, #fef9ee 0%, #fffcf2 40%, #ffffff 100%);
}

.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255,255,255,0.35);
  min-width: 0;
}

.md-textarea {
  flex: 1;
  height: 100%;
}
.md-textarea :deep(.el-textarea__inner) {
  height: 100%;
  resize: none;
  border: none;
  border-radius: 0;
  background: rgba(255,255,255,0.25);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  line-height: 1.7;
  padding: 20px 24px;
  box-shadow: none;
  color: var(--text-primary);
}
.md-textarea :deep(.el-textarea__inner):focus { box-shadow: none; }

.preview-pane {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-primary);
  min-width: 0;
}
.preview-pane.readonly { flex: 1; }
.preview-pane.legacy-content {
  color: #2c1f06;
  font-size: 15px;
  line-height: 1.9;
}

/* Markdown rendered styles */
.preview-pane :deep(h1),
.preview-pane :deep(h2),
.preview-pane :deep(h3) { margin: 1.2em 0 0.5em; font-weight: 700; }
.preview-pane :deep(p) { margin: 0.6em 0; }
.preview-pane :deep(pre) {
  background: rgba(0,0,0,0.04);
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 13px;
}
.preview-pane :deep(code) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
}
.preview-pane :deep(blockquote) {
  border-left: 3px solid rgba(184,134,11,0.5);
  padding-left: 14px;
  color: var(--text-secondary);
  margin: 0.8em 0;
  font-style: italic;
}
.preview-pane.legacy-content :deep(blockquote) {
  border-left-color: #b8860b;
  background: rgba(255,248,220,0.5);
  border-radius: 0 8px 8px 0;
  padding: 8px 14px;
}
.preview-pane :deep(a) { color: var(--gdut-red); }
.preview-pane :deep(ul),
.preview-pane :deep(ol) { padding-left: 1.5em; }
.preview-pane :deep(li) { margin: 0.3em 0; }
.preview-pane :deep(hr) { border: none; border-top: 1px solid var(--border-color); margin: 1.5em 0; }
.preview-pane :deep(table) { border-collapse: collapse; width: 100%; font-size: 13px; }
.preview-pane :deep(th),
.preview-pane :deep(td) { border: 1px solid var(--border-color); padding: 6px 12px; }
.preview-pane :deep(th) { background: rgba(0,0,0,0.03); font-weight: 600; }
</style>
