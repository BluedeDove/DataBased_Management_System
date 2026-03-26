import { ElMessage } from 'element-plus';
/**
 * 防重复提交管理器
 */
export class DebounceSubmitManager {
    static pendingRequests = new Map();
    static requestCount = new Map();
    /**
     * 执行防重复提交
     * @param key 请求唯一标识
     * @param action 要执行的操作
     * @param options 配置选项
     * @returns 执行结果
     */
    static async submit(key, action, options = {}) {
        const { timeout = 3000, showMessage = true, message = '操作正在处理中，请勿重复提交', successMessage, errorMessage } = options;
        // 检查是否有正在进行的相同请求
        if (this.pendingRequests.has(key)) {
            if (showMessage) {
                ElMessage.warning(message);
            }
            return {
                success: false,
                error: new Error('请求正在处理中'),
                attempts: 1
            };
        }
        // 记录请求开始
        this.requestCount.set(key, (this.requestCount.get(key) || 0) + 1);
        // 设置防重复提交标记
        const timeoutHandle = setTimeout(() => {
            this.pendingRequests.delete(key);
            this.requestCount.delete(key);
        }, timeout);
        this.pendingRequests.set(key, timeoutHandle);
        try {
            if (showMessage && message) {
                ElMessage.info(message);
            }
            const result = await action();
            // 清理标记
            this.clearRequest(key);
            if (showMessage && successMessage) {
                ElMessage.success(successMessage);
            }
            return {
                success: true,
                data: result,
                attempts: this.requestCount.get(key) || 1
            };
        }
        catch (error) {
            // 清理标记
            this.clearRequest(key);
            const errorMsg = error instanceof Error ? error.message : String(error);
            if (showMessage) {
                const displayMessage = errorMessage || `操作失败: ${errorMsg}`;
                ElMessage.error(displayMessage);
            }
            return {
                success: false,
                error: error,
                attempts: this.requestCount.get(key) || 1
            };
        }
    }
    /**
     * 执行带重试的防重复提交
     * @param key 请求唯一标识
     * @param action 要执行的操作
     * @param maxRetries 最大重试次数，默认3次
     * @param options 配置选项
     * @returns 执行结果
     */
    static async submitWithRetry(key, action, maxRetries = 3, options = {}) {
        const { showMessage = true, errorMessage } = options;
        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            try {
                const result = await this.submit(key, action, {
                    ...options,
                    showMessage: attempt === 1 && showMessage, // 只在第一次尝试时显示消息
                    message: attempt === 1 ? options.message : `正在重试 (${attempt}/${maxRetries + 1})...`
                });
                if (result.success) {
                    return result;
                }
                // 如果是最后一次尝试
                if (attempt === maxRetries + 1) {
                    const finalMessage = errorMessage || `操作重试 ${maxRetries + 1} 次后仍然失败: ${result.error?.message || '未知错误'}`;
                    return {
                        success: false,
                        error: result.error,
                        attempts: maxRetries + 1
                    };
                }
                // 计算延迟时间（指数退避）
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                if (showMessage) {
                    ElMessage.warning(`操作失败，${delay}ms后重试 (${attempt + 1}/${maxRetries + 1})`);
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            catch (error) {
                if (attempt === maxRetries + 1) {
                    const finalMessage = errorMessage || `操作重试 ${maxRetries + 1} 次后仍然失败: ${error instanceof Error ? error.message : '未知错误'}`;
                    return {
                        success: false,
                        error: error,
                        attempts: maxRetries + 1
                    };
                }
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        return {
            success: false,
            error: new Error('未知错误'),
            attempts: maxRetries + 1
        };
    }
    /**
     * 取消正在进行的请求
     * @param key 请求标识
     */
    static cancel(key) {
        this.clearRequest(key);
    }
    /**
     * 清理请求标记
     * @param key 请求标识
     */
    static clearRequest(key) {
        const timeout = this.pendingRequests.get(key);
        if (timeout) {
            clearTimeout(timeout);
        }
        this.pendingRequests.delete(key);
    }
    /**
     * 检查请求是否正在进行
     * @param key 请求标识
     * @returns 是否正在进行
     */
    static isPending(key) {
        return this.pendingRequests.has(key);
    }
    /**
     * 获取请求计数
     * @param key 请求标识
     * @returns 请求次数
     */
    static getRequestCount(key) {
        return this.requestCount.get(key) || 0;
    }
    /**
     * 清理所有正在进行的请求
     */
    static clearAll() {
        for (const [key, timeout] of this.pendingRequests.entries()) {
            clearTimeout(timeout);
        }
        this.pendingRequests.clear();
        this.requestCount.clear();
    }
    /**
     * 创建防重复提交的Hook
     * @param key 请求标识
     * @param options 配置选项
     * @returns 防重复提交函数
     */
    static createHook(key, options = {}) {
        return async (action) => {
            return this.submit(key, action, options);
        };
    }
    /**
     * 创建带重试的防重复提交Hook
     * @param key 请求标识
     * @param maxRetries 最大重试次数
     * @param options 配置选项
     * @returns 防重复提交函数
     */
    static createRetryHook(key, maxRetries = 3, options = {}) {
        return async (action) => {
            return this.submitWithRetry(key, action, maxRetries, options);
        };
    }
}
/**
 * Vue 3 Composition API 防重复提交Hook
 */
export function useDebounceSubmit(key, options = {}) {
    const submit = async (action) => {
        return DebounceSubmitManager.submit(key, action, options);
    };
    const submitWithRetry = async (action, maxRetries = 3) => {
        return DebounceSubmitManager.submitWithRetry(key, action, maxRetries, options);
    };
    const cancel = () => {
        DebounceSubmitManager.cancel(key);
    };
    const isPending = () => {
        return DebounceSubmitManager.isPending(key);
    };
    const getRequestCount = () => {
        return DebounceSubmitManager.getRequestCount(key);
    };
    return {
        submit,
        submitWithRetry,
        cancel,
        isPending,
        getRequestCount
    };
}
/**
 * 预定义的常用防重复提交配置
 */
export const DebounceConfigs = {
    // 借阅相关操作
    BORROW: {
        timeout: 5000,
        message: '正在处理借阅请求，请稍候...',
        successMessage: '借阅成功！',
        errorMessage: '借阅失败，请重试'
    },
    // 还书相关操作
    RETURN: {
        timeout: 3000,
        message: '正在处理还书请求，请稍候...',
        successMessage: '还书成功！',
        errorMessage: '还书失败，请重试'
    },
    // 续借相关操作
    RENEW: {
        timeout: 3000,
        message: '正在处理续借请求，请稍候...',
        successMessage: '续借成功！',
        errorMessage: '续借失败，请重试'
    },
    // 图书操作
    BOOK_CREATE: {
        timeout: 8000,
        message: '正在创建图书信息，请稍候...',
        successMessage: '图书创建成功！',
        errorMessage: '图书创建失败，请重试'
    },
    BOOK_UPDATE: {
        timeout: 5000,
        message: '正在更新图书信息，请稍候...',
        successMessage: '图书更新成功！',
        errorMessage: '图书更新失败，请重试'
    },
    // 读者操作
    READER_CREATE: {
        timeout: 5000,
        message: '正在创建读者信息，请稍候...',
        successMessage: '读者创建成功！',
        errorMessage: '读者创建失败，请重试'
    },
    READER_UPDATE: {
        timeout: 3000,
        message: '正在更新读者信息，请稍候...',
        successMessage: '读者更新成功！',
        errorMessage: '读者更新失败，请重试'
    }
};
//# sourceMappingURL=debounceSubmit.js.map