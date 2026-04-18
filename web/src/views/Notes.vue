<template>
  <div class="notes-page">
    <aside class="notes-sidebar">
      <div class="tab-row">
        <button class="tab-btn" :class="{ active: activeTab === 'my' }" @click="switchTab('my')">我的笔记</button>
        <button class="tab-btn" :class="{ active: activeTab === 'plaza' }" @click="switchTab('plaza')">公开广场</button>
        <button class="tab-btn" :class="{ active: activeTab === 'legacy' }" @click="switchTab('legacy')">传承长廊</button>
      </div>

      <div v-if="activeTab !== 'legacy'" class="toolbar">
        <div class="search-box">
          <el-icon><Search /></el-icon>
          <input v-model="searchKeyword" type="text" placeholder="搜索笔记" @keydown.enter="loadNotes">
        </div>

        <el-select
          v-if="activeTab === 'my'"
          v-model="visibilityFilter"
          size="small"
          style="width: 120px"
          @change="loadNotes"
        >
          <el-option label="全部" value="" />
          <el-option label="私有" value="private" />
          <el-option label="公开" value="public" />
          <el-option label="传承" value="legacy" />
        </el-select>

        <el-select
          v-else
          v-model="plazaOrderBy"
          size="small"
          style="width: 120px"
          @change="loadNotes"
        >
          <el-option label="最新" value="newest" />
          <el-option label="最热" value="hottest" />
        </el-select>
      </div>

      <div v-else class="legacy-intro">
        当前在借图书的前人传承会展示在这里。
      </div>

      <button v-if="activeTab === 'my'" class="primary-btn full" @click="createNewNote">
        <el-icon><Plus /></el-icon>
        <span>新建笔记</span>
      </button>

      <div class="note-list" v-loading="listLoading">
        <template v-if="activeTab === 'legacy'">
          <button
            v-for="note in legacyNotes"
            :key="note.id"
            class="note-item"
            :class="{ active: selectedNote?.id === note.id }"
            @click="selectNote(note)"
          >
            <div class="note-item-title">{{ note.title || '未命名传承笔记' }}</div>
            <div class="note-item-meta">{{ note.book_title }} · {{ note.author_name }}</div>
            <div class="note-item-excerpt">{{ stripMarkdown(note.content) }}</div>
          </button>
          <div v-if="legacyNotes.length === 0" class="empty-inline">当前没有可查看的传承笔记。</div>
        </template>

        <template v-else>
          <button
            v-for="note in noteList"
            :key="note.id"
            class="note-item"
            :class="{ active: selectedNote?.id === note.id }"
            @click="selectNote(note)"
          >
            <div class="note-item-title">{{ note.title || '未命名笔记' }}</div>
            <div class="note-item-meta">
              <span>{{ visibilityLabel(note.visibility) }}</span>
              <span v-if="note.book_title">· {{ note.book_title }}</span>
              <span v-if="activeTab === 'plaza'">· {{ note.author_name }}</span>
            </div>
            <div class="note-item-excerpt">{{ stripMarkdown(note.content) }}</div>
          </button>
          <div v-if="noteList.length === 0" class="empty-inline">暂无笔记。</div>
        </template>
      </div>
    </aside>

    <main class="editor-panel">
      <template v-if="editorMode">
        <header class="editor-header">
          <div>
            <h1>{{ selectedNote ? '编辑笔记' : '新建笔记' }}</h1>
            <p>传承笔记只能基于“已归还”的真实借阅记录创建，每次借阅最多沉淀一篇。</p>
          </div>
          <div class="header-actions">
            <button v-if="selectedNote" class="ghost-btn" @click="confirmDelete">删除</button>
            <button class="primary-btn" :disabled="saving" @click="saveNote">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </header>

        <div class="editor-form">
          <el-input v-model="editor.title" placeholder="输入笔记标题" />

          <div class="select-row">
            <el-select v-model="editor.visibility" style="width: 160px">
              <el-option label="私有" value="private" />
              <el-option label="公开" value="public" />
              <el-option label="传承" value="legacy" />
            </el-select>

            <el-select
              v-model="editor.bookId"
              clearable
              filterable
              style="width: 280px"
              :placeholder="editor.visibility === 'legacy' ? '选择已归还过的图书' : '关联图书（可选）'"
            >
              <el-option
                v-for="book in currentBookOptions"
                :key="book.id"
                :label="book.title"
                :value="book.id"
              />
            </el-select>
          </div>

          <div v-if="editor.visibility === 'legacy' && currentBookOptions.length === 0" class="warning-banner">
            请先归还图书后再写传承笔记。
          </div>

          <el-input
            v-model="editor.content"
            type="textarea"
            :rows="18"
            resize="none"
            placeholder="支持 Markdown 语法。建议沉淀这本书最值得传承的看法、避坑点、阅读路径与适合人群。"
          />
        </div>
      </template>

      <template v-else-if="selectedNote">
        <header class="editor-header">
          <div>
            <h1>{{ selectedNote.title || '未命名笔记' }}</h1>
            <p>
              {{ selectedNote.author_name }}
              <span v-if="selectedNote.book_title"> · {{ selectedNote.book_title }}</span>
              <span> · {{ visibilityLabel(selectedNote.visibility) }}</span>
            </p>
          </div>
        </header>

        <div class="preview markdown-body" v-html="renderedContent" />
      </template>

      <template v-else>
        <div class="empty-editor">
          <h2>选择一篇笔记开始查看</h2>
          <p>如果你刚归还过一本书，现在就可以写下一篇传承笔记，交给下一位读者。</p>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useUserStore } from '@/store/user'
import { notesApi, type Note } from '@/api/notes.api'
import { borrowingApi } from '@/api/borrowing.api'
import { bookApi } from '@/api/book.api'

type NoteTab = 'my' | 'plaza' | 'legacy'
type NoteVisibility = 'private' | 'public' | 'legacy'

const userStore = useUserStore()

const activeTab = ref<NoteTab>('my')
const searchKeyword = ref('')
const visibilityFilter = ref('')
const plazaOrderBy = ref<'newest' | 'hottest'>('newest')
const listLoading = ref(false)
const saving = ref(false)

const noteList = ref<Note[]>([])
const legacyNotes = ref<Note[]>([])
const selectedNote = ref<Note | null>(null)

const allBooks = ref<{ id: number; title: string }[]>([])
const legacyEligibleBooks = ref<{ id: number; title: string }[]>([])

const editor = reactive({
  title: '',
  content: '',
  visibility: 'private' as NoteVisibility,
  bookId: null as number | null
})

const editorMode = computed(() => activeTab.value === 'my' && (!selectedNote.value || selectedNote.value.user_id === userStore.user?.id))

const currentBookOptions = computed(() =>
  editor.visibility === 'legacy' ? legacyEligibleBooks.value : allBooks.value
)

const renderedContent = computed(() => {
  const content = selectedNote.value?.content || ''
  return DOMPurify.sanitize(marked(content) as string)
})

const visibilityLabel = (visibility?: string) => {
  const labelMap: Record<string, string> = {
    private: '私有',
    public: '公开',
    legacy: '传承'
  }

  return labelMap[visibility || ''] || visibility || '未知'
}

const stripMarkdown = (value: string) =>
  value.replace(/[#>*`_\-\[\]\(\)!]/g, '').replace(/\s+/g, ' ').trim().slice(0, 56)

const resetEditor = () => {
  selectedNote.value = null
  editor.title = ''
  editor.content = ''
  editor.visibility = 'private'
  editor.bookId = null
}

const fillEditor = (note: Note) => {
  editor.title = note.title || ''
  editor.content = note.content || ''
  editor.visibility = note.visibility
  editor.bookId = note.book_id
}

const loadReferenceBooks = async () => {
  const result = await bookApi.getAll()
  if (result.success && result.data) {
    allBooks.value = result.data.map(book => ({
      id: book.id,
      title: book.title
    }))
  }
}

const loadLegacyEligibleBooks = async () => {
  const result = await borrowingApi.getMy()
  if (result.success && result.data) {
    const returnedRecords = result.data.items.filter(item => item.status === 'returned')
    const uniqueBooks = new Map<number, string>()
    returnedRecords.forEach(record => {
      if (!uniqueBooks.has(record.book_id)) {
        uniqueBooks.set(record.book_id, record.book_title)
      }
    })

    legacyEligibleBooks.value = Array.from(uniqueBooks.entries()).map(([id, title]) => ({ id, title }))
  }
}

const loadNotes = async () => {
  listLoading.value = true
  try {
    if (activeTab.value === 'legacy') {
      const result = await notesApi.getLegacyForMe()
      legacyNotes.value = result.data?.items || []
      selectedNote.value = legacyNotes.value[0] || null
      return
    }

    if (activeTab.value === 'my') {
      const result = await notesApi.getMyNotes({
        visibility: visibilityFilter.value || undefined,
        page: 1,
        pageSize: 50
      })
      noteList.value = result.data?.items || []
    } else {
      const result = await notesApi.getPlazaNotes({
        keyword: searchKeyword.value.trim() || undefined,
        page: 1,
        pageSize: 50,
        orderBy: plazaOrderBy.value
      })
      noteList.value = result.data?.items || []
    }

    if (activeTab.value !== 'my') {
      selectedNote.value = noteList.value[0] || null
      if (selectedNote.value) fillEditor(selectedNote.value)
    } else if (selectedNote.value) {
      const refreshed = noteList.value.find(note => note.id === selectedNote.value?.id)
      if (refreshed) {
        selectedNote.value = refreshed
        fillEditor(refreshed)
      }
    }
  } finally {
    listLoading.value = false
  }
}

const switchTab = async (tab: NoteTab) => {
  activeTab.value = tab
  searchKeyword.value = ''
  if (tab !== 'my') {
    resetEditor()
  }
  await loadNotes()
}

const createNewNote = () => {
  resetEditor()
}

const selectNote = (note: Note) => {
  selectedNote.value = note
  fillEditor(note)
}

const saveNote = async () => {
  if (!editor.title.trim()) {
    ElMessage.warning('请输入标题。')
    return
  }

  if (!editor.content.trim()) {
    ElMessage.warning('请输入正文。')
    return
  }

  if (editor.visibility === 'legacy' && !editor.bookId) {
    ElMessage.warning('传承笔记必须关联一本已归还过的图书。')
    return
  }

  saving.value = true
  try {
    const payload = {
      title: editor.title.trim(),
      content: editor.content.trim(),
      visibility: editor.visibility,
      book_id: editor.bookId
    }

    if (selectedNote.value) {
      const result = await notesApi.updateNote(selectedNote.value.id, payload)
      if (result.success && result.data) {
        selectedNote.value = result.data
        fillEditor(result.data)
      }
    } else {
      const result = await notesApi.createNote(payload)
      if (result.success && result.data) {
        selectedNote.value = result.data
        fillEditor(result.data)
      }
    }

    ElMessage.success('笔记已保存。')
    await loadLegacyEligibleBooks()
    await loadNotes()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '保存笔记失败。')
  } finally {
    saving.value = false
  }
}

const confirmDelete = async () => {
  if (!selectedNote.value) return

  try {
    await ElMessageBox.confirm('确认删除这篇笔记吗？', '删除笔记', {
      type: 'warning'
    })

    const result = await notesApi.deleteNote(selectedNote.value.id)
    if (result.success) {
      ElMessage.success('笔记已删除。')
      resetEditor()
      await loadLegacyEligibleBooks()
      await loadNotes()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.error?.message || error?.message || '删除失败。')
    }
  }
}

watch([searchKeyword, visibilityFilter], () => {
  if (activeTab.value === 'my' || activeTab.value === 'plaza') {
    loadNotes()
  }
})

watch(
  () => plazaOrderBy.value,
  () => {
    if (activeTab.value === 'plaza') {
      loadNotes()
    }
  }
)

onMounted(async () => {
  await Promise.all([loadReferenceBooks(), loadLegacyEligibleBooks()])
  await loadNotes()
})
</script>

<style scoped>
.notes-page {
  min-height: calc(100vh - 140px);
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 18px;
}

.notes-sidebar,
.editor-panel {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.84);
  border-radius: 24px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06);
}

.notes-sidebar {
  padding: 18px;
  display: flex;
  flex-direction: column;
}

.tab-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.tab-btn,
.primary-btn,
.ghost-btn,
.note-item {
  border: none;
  border-radius: 14px;
  cursor: pointer;
}

.tab-btn {
  height: 42px;
  background: #eef2ff;
  color: #334155;
  font-weight: 600;
}

.tab-btn.active {
  color: #fff;
  background: linear-gradient(135deg, #c8102e 0%, #7c3aed 100%);
}

.toolbar {
  margin-top: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  flex: 1;
  height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: 14px;
  background: #f8fafc;
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
}

.legacy-intro {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
  color: #64748b;
}

.primary-btn,
.ghost-btn {
  height: 42px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
}

.primary-btn {
  color: #fff;
  background: linear-gradient(135deg, #c8102e 0%, #7c3aed 100%);
}

.ghost-btn {
  background: #eef2ff;
  color: #334155;
}

.primary-btn.full {
  width: 100%;
  margin-top: 16px;
}

.note-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
}

.note-item {
  padding: 14px;
  background: #f8fafc;
  text-align: left;
}

.note-item.active {
  background: rgba(200, 16, 46, 0.08);
}

.note-item-title {
  font-weight: 700;
  color: #0f172a;
}

.note-item-meta,
.note-item-excerpt,
.empty-inline,
.editor-header p {
  margin-top: 8px;
  color: #64748b;
}

.editor-panel {
  padding: 24px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  margin-bottom: 18px;
}

.editor-header h1 {
  margin: 0 0 10px;
  color: #0f172a;
}

.header-actions,
.select-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.editor-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.warning-banner {
  padding: 12px 14px;
  border-radius: 14px;
  background: #fff7ed;
  color: #9a3412;
}

.preview,
.empty-editor {
  min-height: 420px;
  padding: 20px;
  border-radius: 20px;
  background: #f8fafc;
}

.empty-editor {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.empty-editor h2 {
  margin: 0 0 10px;
  color: #0f172a;
}

.empty-editor p {
  margin: 0;
  color: #64748b;
}

@media (max-width: 1100px) {
  .notes-page {
    grid-template-columns: 1fr;
  }

  .toolbar,
  .editor-header,
  .header-actions,
  .select-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
