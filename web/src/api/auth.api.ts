import { request, ApiResponse } from './index'

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  password: string
  name: string
  identity: 'teacher' | 'student'
  id_card?: string
  phone: string
  email?: string
  address?: string
}

export interface User {
  id: number
  username: string
  name: string
  role: string
  reader_id?: number
  email?: string
  phone?: string
}

export interface AuthResult {
  user: User
  token: string
}

export interface BorrowPinStatus {
  configured: boolean
  updatedAt?: string | null
}

export const authApi = {
  login: (credentials: LoginCredentials): Promise<ApiResponse<AuthResult>> =>
    request.post('/auth/login', credentials),

  logout: (): Promise<ApiResponse<null>> =>
    request.post('/auth/logout'),

  validate: (): Promise<ApiResponse<User>> =>
    request.get('/auth/validate'),

  changePassword: (oldPassword: string, newPassword: string): Promise<ApiResponse<null>> =>
    request.put('/auth/password', { oldPassword, newPassword }),

  getBorrowPinStatus: (): Promise<ApiResponse<BorrowPinStatus>> =>
    request.get('/auth/borrow-pin/status'),

  changeBorrowPin: (loginPassword: string, borrowPin: string): Promise<ApiResponse<BorrowPinStatus>> =>
    request.put('/auth/borrow-pin', { loginPassword, borrowPin }),

  register: (data: RegisterData): Promise<ApiResponse<User>> =>
    request.post('/auth/register', data),

  getPermissions: (): Promise<ApiResponse<string[]>> =>
    request.get('/auth/permissions'),

  checkPermission: (permission: string): Promise<ApiResponse<boolean>> =>
    request.post('/auth/check-permission', { permission })
}
