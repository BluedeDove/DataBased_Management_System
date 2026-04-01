import { ElMessageBox, ElMessage } from 'element-plus'
import type { AxiosError } from 'axios'

/**
 * 冲突错误响应类型
 */
interface ConflictErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}

/**
 * 冲突处理选项
 */
export interface ConflictHandlerOptions {
  /** 冲突时的提示标题 */
  title?: string
  /** 冲突时的提示消息 */
  message?: string
  /** 确认按钮文本 */
  confirmText?: string
  /** 取消按钮文本 */
  cancelText?: string
  /** 刷新后执行的回调 */
  onRefresh?: () => void
  /** 取消时的回调 */
  onCancel?: () => void
}

/**
 * 检查是否为冲突错误
 */
export function isConflictError(error: any): boolean {
  return error?.response?.status === 409 ||
    error?.response?.data?.error?.code === 'VERSION_CONFLICT'
}

/**
 * 获取冲突错误详情
 */
export function getConflictDetails(error: AxiosError<ConflictErrorResponse>): string | undefined {
  return error.response?.data?.error?.details
}

/**
 * 处理冲突错误 - 显示对话框让用户选择刷新或取消
 */
export async function handleConflictError(
  error: AxiosError<ConflictErrorResponse>,
  options: ConflictHandlerOptions = {}
): Promise<'refresh' | 'cancel' | 'none'> {
  const {
    title = '版本冲突',
    message = '数据已被其他用户修改，是否刷新页面获取最新数据？',
    confirmText = '刷新页面',
    cancelText = '取消'
  } = options

  if (!isConflictError(error)) {
    return 'none'
  }

  try {
    await ElMessageBox.confirm(message, title, {
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      type: 'warning',
      customClass: 'conflict-dialog'
    })

    // 用户选择刷新
    if (options.onRefresh) {
      options.onRefresh()
    } else {
      // 默认刷新页面
      window.location.reload()
    }
    return 'refresh'
  } catch {
    // 用户取消
    if (options.onCancel) {
      options.onCancel()
    }
    return 'cancel'
  }
}

/**
 * 显示冲突通知（轻量级提示）
 */
export function showConflictNotification(message?: string): void {
  ElMessage.warning({
    message: message || '数据已被修改，请刷新后重试',
    duration: 5000,
    showClose: true
  })
}

/**
 * 冲突处理装饰器 - 自动处理更新操作的冲突
 */
export function withConflictHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: ConflictHandlerOptions
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      if (isConflictError(error)) {
        await handleConflictError(error as AxiosError<ConflictErrorResponse>, options)
        return null
      }
      throw error
    }
  }) as T
}

/**
 * Vue 3 Composition API Hook - 冲突处理
 */
export function useConflictHandler() {
  const handleConflict = async (
    error: any,
    options?: ConflictHandlerOptions
  ): Promise<'refresh' | 'cancel' | 'none'> => {
    return handleConflictError(error, options)
  }

  const checkAndHandle = async (
    error: any,
    onSuccess?: () => void,
    options?: ConflictHandlerOptions
  ): Promise<boolean> => {
    if (isConflictError(error)) {
      const result = await handleConflictError(error, options)
      return result === 'refresh'
    }

    if (error && !isConflictError(error)) {
      // 非冲突错误，抛出让上层处理
      throw error
    }

    return false
  }

  return {
    isConflictError,
    handleConflict,
    checkAndHandle,
    showConflictNotification
  }
}
