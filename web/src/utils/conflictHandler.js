import { ElMessageBox, ElMessage } from 'element-plus';
/**
 * 检查是否为冲突错误
 */
export function isConflictError(error) {
    return error?.response?.status === 409 ||
        error?.response?.data?.error?.code === 'VERSION_CONFLICT';
}
/**
 * 获取冲突错误详情
 */
export function getConflictDetails(error) {
    return error.response?.data?.error?.details;
}
/**
 * 处理冲突错误 - 显示对话框让用户选择刷新或取消
 */
export async function handleConflictError(error, options = {}) {
    const { title = '版本冲突', message = '数据已被其他用户修改，是否刷新页面获取最新数据？', confirmText = '刷新页面', cancelText = '取消' } = options;
    if (!isConflictError(error)) {
        return 'none';
    }
    try {
        await ElMessageBox.confirm(message, title, {
            confirmButtonText: confirmText,
            cancelButtonText: cancelText,
            type: 'warning',
            customClass: 'conflict-dialog'
        });
        // 用户选择刷新
        if (options.onRefresh) {
            options.onRefresh();
        }
        else {
            // 默认刷新页面
            window.location.reload();
        }
        return 'refresh';
    }
    catch {
        // 用户取消
        if (options.onCancel) {
            options.onCancel();
        }
        return 'cancel';
    }
}
/**
 * 显示冲突通知（轻量级提示）
 */
export function showConflictNotification(message) {
    ElMessage.warning({
        message: message || '数据已被修改，请刷新后重试',
        duration: 5000,
        showClose: true
    });
}
/**
 * 冲突处理装饰器 - 自动处理更新操作的冲突
 */
export function withConflictHandler(fn, options) {
    return (async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            if (isConflictError(error)) {
                await handleConflictError(error, options);
                return null;
            }
            throw error;
        }
    });
}
/**
 * Vue 3 Composition API Hook - 冲突处理
 */
export function useConflictHandler() {
    const handleConflict = async (error, options) => {
        return handleConflictError(error, options);
    };
    const checkAndHandle = async (error, onSuccess, options) => {
        if (isConflictError(error)) {
            const result = await handleConflictError(error, options);
            return result === 'refresh';
        }
        if (error && !isConflictError(error)) {
            // 非冲突错误，抛出让上层处理
            throw error;
        }
        return false;
    };
    return {
        isConflictError,
        handleConflict,
        checkAndHandle,
        showConflictNotification
    };
}
//# sourceMappingURL=conflictHandler.js.map