import apiClient from './index'

export interface Note {
  id: number
  user_id: number
  title: string
  content: string
  book_id: number | null
  visibility: 'private' | 'public' | 'legacy'
  legacy_borrowing_id: number | null
  view_count: number
  version: number
  created_at: string
  updated_at: string
  author_name: string
  book_title?: string
  book_isbn?: string
}

export interface NoteListResult {
  items: Note[]
  total: number
}

export const notesApi = {
  createNote(data: {
    title: string
    content: string
    book_id?: number | null
    visibility: 'private' | 'public' | 'legacy'
  }) {
    return apiClient.post('/notes', data).then(r => r.data)
  },

  getNoteById(id: number) {
    return apiClient.get(`/notes/${id}`).then(r => r.data)
  },

  getMyNotes(params: { visibility?: string; page?: number; pageSize?: number }) {
    return apiClient.get('/notes/my', { params }).then(r => r.data)
  },

  getPlazaNotes(params: { keyword?: string; book_id?: number; page?: number; pageSize?: number; orderBy?: 'newest' | 'hottest' }) {
    return apiClient.get('/notes/plaza', { params }).then(r => r.data)
  },

  getLegacyNote(bookId: number) {
    return apiClient.get(`/notes/legacy/${bookId}`).then(r => r.data)
  },

  getLegacyForMe() {
    return apiClient.get('/notes/legacy-for-me').then(r => r.data)
  },

  updateNote(id: number, data: { title?: string; content?: string; book_id?: number | null; visibility?: string }) {
    return apiClient.put(`/notes/${id}`, data).then(r => r.data)
  },

  deleteNote(id: number) {
    return apiClient.delete(`/notes/${id}`).then(r => r.data)
  }
}
