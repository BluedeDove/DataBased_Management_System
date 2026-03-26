/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { MagicStick, User, Service, Reading, Search, ChatDotRound, Clock, Promotion, Document, Close, RefreshRight, Delete, VideoPause, Download } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useUserStore } from '@/store/user';
import { aiApi } from '../api/ai.api';
const userStore = useUserStore();
const inputMessage = ref('');
const loading = ref(false);
const messagesRef = ref(null);
const streamCleanup = ref(null);
const chatHistory = ref([
    { id: 'init', role: 'assistant', content: '你好！我是图书馆智能助手。你可以问我关于馆藏图书的问题，或者让我为你推荐书籍。', timestamp: Date.now() }
]);
const isAIOnline = ref(false);
const vectorCoverage = ref(0);
const totalVectors = ref(0);
const recommendedBooks = ref([]);
const chatHistoryList = ref([]);
const currentConversationId = ref(null);
const showRecommendPanel = ref(true);
const searchQuery = ref('');
// 过滤后的对话列表
const filteredChatHistoryList = computed(() => {
    if (!searchQuery.value)
        return chatHistoryList.value;
    return chatHistoryList.value.filter(c => c.title.toLowerCase().includes(searchQuery.value.toLowerCase()));
});
// 格式化内容
const formatContent = (content) => {
    if (!content)
        return '';
    const html = marked(content);
    return DOMPurify.sanitize(html);
};
// 格式化时间
const formatTime = (timestamp) => {
    if (!timestamp)
        return '';
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    });
};
// 滚动到底部
const scrollToBottom = () => {
    nextTick(() => {
        if (messagesRef.value) {
            messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
        }
    });
};
// 发送消息
const sendMessage = async () => {
    if (!inputMessage.value.trim() || loading.value)
        return;
    const userMessage = inputMessage.value.trim();
    inputMessage.value = '';
    // 添加用户消息
    chatHistory.value.push({
        id: `user-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
    });
    scrollToBottom();
    // 添加加载中的AI消息
    const aiMessageId = `ai-${Date.now()}`;
    chatHistory.value.push({
        id: aiMessageId,
        role: 'assistant',
        content: '',
        loading: true
    });
    loading.value = true;
    scrollToBottom();
    try {
        // 准备历史消息
        const history = chatHistory.value
            .filter(m => !m.loading && m.id !== 'init')
            .slice(-10)
            .map(m => ({ role: m.role, content: m.content }));
        // 使用流式对话
        let fullContent = '';
        const cleanup = aiApi.chatStream(userMessage, history, undefined, (chunk) => {
            fullContent += chunk;
            const msgIndex = chatHistory.value.findIndex(m => m.id === aiMessageId);
            if (msgIndex > -1) {
                chatHistory.value[msgIndex].content = fullContent;
                chatHistory.value[msgIndex].loading = false;
                scrollToBottom();
            }
        }, (error) => {
            const msgIndex = chatHistory.value.findIndex(m => m.id === aiMessageId);
            if (msgIndex > -1) {
                chatHistory.value[msgIndex].content = `发生错误: ${error}`;
                chatHistory.value[msgIndex].loading = false;
            }
            loading.value = false;
            ElMessage.error('AI响应失败');
        }, () => {
            const msgIndex = chatHistory.value.findIndex(m => m.id === aiMessageId);
            if (msgIndex > -1) {
                chatHistory.value[msgIndex].timestamp = Date.now();
            }
            loading.value = false;
            saveCurrentConversation();
        });
        streamCleanup.value = cleanup;
    }
    catch (error) {
        const msgIndex = chatHistory.value.findIndex(m => m.id === aiMessageId);
        if (msgIndex > -1) {
            chatHistory.value[msgIndex].content = 'AI服务暂时不可用，请稍后再试。';
            chatHistory.value[msgIndex].loading = false;
        }
        loading.value = false;
    }
};
// 停止生成
const stopGeneration = () => {
    if (streamCleanup.value) {
        streamCleanup.value();
        streamCleanup.value = null;
    }
    loading.value = false;
};
// 触发工具
const triggerTool = (tool) => {
    if (tool === 'recommend') {
        setInput('请为我推荐一些图书');
    }
    else if (tool === 'search') {
        setInput('请帮我搜索');
    }
};
// 设置输入
const setInput = (text) => {
    inputMessage.value = text;
};
// 开始新对话
const startNewChat = () => {
    chatHistory.value = [
        { id: 'init', role: 'assistant', content: '你好！我是图书馆智能助手。你可以问我关于馆藏图书的问题，或者让我为你推荐书籍。', timestamp: Date.now() }
    ];
    currentConversationId.value = null;
    recommendedBooks.value = [];
};
// 重新生成最后一条消息
const regenerateLastMessage = () => {
    if (chatHistory.value.length < 2)
        return;
    const lastUserMsg = [...chatHistory.value].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
        // 移除最后的AI消息
        const lastAiIndex = chatHistory.value.length - 1;
        if (chatHistory.value[lastAiIndex].role === 'assistant') {
            chatHistory.value.splice(lastAiIndex, 1);
        }
        // 重新发送
        inputMessage.value = lastUserMsg.content;
        sendMessage();
    }
};
// 导出对话
const exportConversation = () => {
    const content = chatHistory.value
        .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
        .join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('对话已导出');
};
// 加载聊天历史
const loadChatHistory = async (item) => {
    currentConversationId.value = item.id;
    chatHistory.value = item.messages;
    scrollToBottom();
};
// 删除对话
const deleteConversation = async (item) => {
    try {
        const result = await aiApi.deleteConversation(item.id);
        if (result.success) {
            chatHistoryList.value = chatHistoryList.value.filter(c => c.id !== item.id);
            if (currentConversationId.value === item.id) {
                startNewChat();
            }
            ElMessage.success('对话已删除');
        }
    }
    catch (error) {
        ElMessage.error('删除失败');
    }
};
// 保存当前对话
const saveCurrentConversation = async () => {
    if (!userStore.user?.id || chatHistory.value.length <= 1)
        return;
    const title = chatHistory.value.find(m => m.role === 'user')?.content.slice(0, 30) || '新对话';
    const messages = chatHistory.value.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
    }));
    try {
        if (currentConversationId.value) {
            await aiApi.updateConversation(currentConversationId.value, title, messages);
        }
        else {
            const result = await aiApi.saveConversation(userStore.user.id, title, messages);
            if (result.success) {
                currentConversationId.value = result.data.id;
                loadConversations();
            }
        }
    }
    catch (error) {
        console.error('Failed to save conversation:', error);
    }
};
// 加载对话列表
const loadConversations = async () => {
    if (!userStore.user?.id)
        return;
    try {
        const result = await aiApi.getConversations(userStore.user.id, 20);
        if (result.success) {
            chatHistoryList.value = result.data.map((c) => ({
                ...c,
                messages: typeof c.messages === 'string' ? JSON.parse(c.messages) : c.messages
            }));
        }
    }
    catch (error) {
        console.error('Failed to load conversations:', error);
    }
};
// 检查AI状态
const checkAIStatus = async () => {
    try {
        const result = await aiApi.isAvailable();
        isAIOnline.value = result.success && result.data;
    }
    catch (error) {
        isAIOnline.value = false;
    }
};
// 加载向量统计
const loadVectorStats = async () => {
    try {
        const result = await aiApi.getStatistics();
        if (result.success) {
            totalVectors.value = result.data.totalVectors || 0;
            vectorCoverage.value = result.data.coverageRate || 0;
        }
    }
    catch (error) {
        console.error('Failed to load vector stats:', error);
    }
};
// 窗口大小变化处理
const handleResize = () => {
    // Responsive logic if needed
};
onMounted(() => {
    checkAIStatus();
    loadVectorStats();
    loadConversations();
    window.addEventListener('resize', handleResize);
});
onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    if (streamCleanup.value) {
        streamCleanup.value();
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['status-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['status-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item']} */ ;
/** @type {__VLS_StyleScopedClasses['message-row']} */ ;
/** @type {__VLS_StyleScopedClasses['message-row']} */ ;
/** @type {__VLS_StyleScopedClasses['user']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['message-row']} */ ;
/** @type {__VLS_StyleScopedClasses['user']} */ ;
/** @type {__VLS_StyleScopedClasses['bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['typing-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['typing-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['typing-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['input-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['header-title']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-recommend']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-container ai-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "side-panel glass-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-logo" },
});
const __VLS_0 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.MagicStick;
/** @type {[typeof __VLS_components.MagicStick, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "status-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "status-indicator" },
    ...{ class: ({ online: __VLS_ctx.isAIOnline }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
    ...{ class: "status-dot" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "status-text" },
});
(__VLS_ctx.isAIOnline ? '在线' : '离线');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stats-info" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stat-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stat-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stat-value" },
});
(__VLS_ctx.vectorCoverage);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stat-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stat-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stat-value" },
});
(__VLS_ctx.totalVectors);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "quick-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "action-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.triggerTool('recommend');
        } },
    ...{ class: "action-btn" },
});
const __VLS_8 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
const __VLS_12 = {}.Reading;
/** @type {[typeof __VLS_components.Reading, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
var __VLS_11;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.triggerTool('search');
        } },
    ...{ class: "action-btn" },
});
const __VLS_16 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({}));
const __VLS_18 = __VLS_17({}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.Search;
/** @type {[typeof __VLS_components.Search, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
var __VLS_19;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.startNewChat) },
    ...{ class: "action-btn" },
});
const __VLS_24 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
const __VLS_28 = {}.ChatDotRound;
/** @type {[typeof __VLS_components.ChatDotRound, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({}));
const __VLS_30 = __VLS_29({}, ...__VLS_functionalComponentArgsRest(__VLS_29));
var __VLS_27;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.regenerateLastMessage) },
    ...{ class: "action-btn" },
    disabled: (__VLS_ctx.loading),
});
const __VLS_32 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({}));
const __VLS_34 = __VLS_33({}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.RefreshRight;
/** @type {[typeof __VLS_components.RefreshRight, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({}));
const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
var __VLS_35;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.exportConversation) },
    ...{ class: "action-btn" },
});
const __VLS_40 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({}));
const __VLS_42 = __VLS_41({}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_43.slots.default;
const __VLS_44 = {}.Download;
/** @type {[typeof __VLS_components.Download, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({}));
const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
var __VLS_43;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "history-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
const __VLS_48 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    modelValue: (__VLS_ctx.searchQuery),
    placeholder: "搜索对话...",
    prefixIcon: "Search",
    clearable: true,
    size: "small",
    ...{ class: "history-search" },
}));
const __VLS_50 = __VLS_49({
    modelValue: (__VLS_ctx.searchQuery),
    placeholder: "搜索对话...",
    prefixIcon: "Search",
    clearable: true,
    size: "small",
    ...{ class: "history-search" },
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "history-list" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredChatHistoryList))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.loadChatHistory(item);
            } },
        key: (item.id),
        ...{ class: "history-item" },
    });
    const __VLS_52 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({}));
    const __VLS_54 = __VLS_53({}, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_55.slots.default;
    const __VLS_56 = {}.Clock;
    /** @type {[typeof __VLS_components.Clock, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({}));
    const __VLS_58 = __VLS_57({}, ...__VLS_functionalComponentArgsRest(__VLS_57));
    var __VLS_55;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "history-text" },
    });
    (item.title);
    const __VLS_60 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        ...{ 'onClick': {} },
        text: true,
        size: "small",
        type: "danger",
        ...{ class: "delete-btn" },
    }));
    const __VLS_62 = __VLS_61({
        ...{ 'onClick': {} },
        text: true,
        size: "small",
        type: "danger",
        ...{ class: "delete-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    let __VLS_64;
    let __VLS_65;
    let __VLS_66;
    const __VLS_67 = {
        onClick: (...[$event]) => {
            __VLS_ctx.deleteConversation(item);
        }
    };
    __VLS_63.slots.default;
    const __VLS_68 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({}));
    const __VLS_70 = __VLS_69({}, ...__VLS_functionalComponentArgsRest(__VLS_69));
    __VLS_71.slots.default;
    const __VLS_72 = {}.Delete;
    /** @type {[typeof __VLS_components.Delete, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({}));
    const __VLS_74 = __VLS_73({}, ...__VLS_functionalComponentArgsRest(__VLS_73));
    var __VLS_71;
    var __VLS_63;
}
if (__VLS_ctx.chatHistoryList.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-history" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "main-chat-area glass-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-info" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-subtitle" },
});
const __VLS_76 = {}.ElTag;
/** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    type: "info",
    effect: "plain",
    round: true,
}));
const __VLS_78 = __VLS_77({
    type: "info",
    effect: "plain",
    round: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
var __VLS_79;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "messagesRef",
    ...{ class: "chat-messages" },
});
/** @type {typeof __VLS_ctx.messagesRef} */ ;
for (const [msg, index] of __VLS_getVForSourceType((__VLS_ctx.chatHistory))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (msg.id || index),
        ...{ class: "message-row" },
        ...{ class: (msg.role) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "avatar" },
    });
    if (msg.role === 'assistant') {
        const __VLS_80 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({}));
        const __VLS_82 = __VLS_81({}, ...__VLS_functionalComponentArgsRest(__VLS_81));
        __VLS_83.slots.default;
        const __VLS_84 = {}.Service;
        /** @type {[typeof __VLS_components.Service, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({}));
        const __VLS_86 = __VLS_85({}, ...__VLS_functionalComponentArgsRest(__VLS_85));
        var __VLS_83;
    }
    else {
        const __VLS_88 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
        const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
        __VLS_91.slots.default;
        const __VLS_92 = {}.User;
        /** @type {[typeof __VLS_components.User, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({}));
        const __VLS_94 = __VLS_93({}, ...__VLS_functionalComponentArgsRest(__VLS_93));
        var __VLS_91;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bubble" },
    });
    if (msg.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "typing-indicator" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({});
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.formatContent(msg.content)) }, null, null);
    }
    if (msg.timestamp && !msg.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "message-timestamp" },
        });
        (__VLS_ctx.formatTime(msg.timestamp));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-input-area" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "quick-prompts" },
});
const __VLS_96 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    ...{ 'onClick': {} },
    size: "small",
    round: true,
}));
const __VLS_98 = __VLS_97({
    ...{ 'onClick': {} },
    size: "small",
    round: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
let __VLS_100;
let __VLS_101;
let __VLS_102;
const __VLS_103 = {
    onClick: (...[$event]) => {
        __VLS_ctx.setInput('最近有什么新书？');
    }
};
__VLS_99.slots.default;
var __VLS_99;
const __VLS_104 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    ...{ 'onClick': {} },
    size: "small",
    round: true,
}));
const __VLS_106 = __VLS_105({
    ...{ 'onClick': {} },
    size: "small",
    round: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
let __VLS_108;
let __VLS_109;
let __VLS_110;
const __VLS_111 = {
    onClick: (...[$event]) => {
        __VLS_ctx.setInput('适合初学者的Python书');
    }
};
__VLS_107.slots.default;
var __VLS_107;
const __VLS_112 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    ...{ 'onClick': {} },
    size: "small",
    round: true,
}));
const __VLS_114 = __VLS_113({
    ...{ 'onClick': {} },
    size: "small",
    round: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
let __VLS_116;
let __VLS_117;
let __VLS_118;
const __VLS_119 = {
    onClick: (...[$event]) => {
        __VLS_ctx.setInput('推荐一些关于人工智能的书籍');
    }
};
__VLS_115.slots.default;
var __VLS_115;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "input-wrapper" },
});
const __VLS_120 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    ...{ 'onKeydown': {} },
    modelValue: (__VLS_ctx.inputMessage),
    type: "textarea",
    rows: (2),
    placeholder: "输入您的问题，按 Enter 发送...",
    disabled: (__VLS_ctx.loading),
}));
const __VLS_122 = __VLS_121({
    ...{ 'onKeydown': {} },
    modelValue: (__VLS_ctx.inputMessage),
    type: "textarea",
    rows: (2),
    placeholder: "输入您的问题，按 Enter 发送...",
    disabled: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
let __VLS_124;
let __VLS_125;
let __VLS_126;
const __VLS_127 = {
    onKeydown: (__VLS_ctx.sendMessage)
};
var __VLS_123;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "button-group" },
});
if (__VLS_ctx.loading) {
    const __VLS_128 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        ...{ 'onClick': {} },
        type: "danger",
        ...{ class: "stop-btn" },
    }));
    const __VLS_130 = __VLS_129({
        ...{ 'onClick': {} },
        type: "danger",
        ...{ class: "stop-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    let __VLS_132;
    let __VLS_133;
    let __VLS_134;
    const __VLS_135 = {
        onClick: (__VLS_ctx.stopGeneration)
    };
    __VLS_131.slots.default;
    const __VLS_136 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({}));
    const __VLS_138 = __VLS_137({}, ...__VLS_functionalComponentArgsRest(__VLS_137));
    __VLS_139.slots.default;
    const __VLS_140 = {}.VideoPause;
    /** @type {[typeof __VLS_components.VideoPause, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({}));
    const __VLS_142 = __VLS_141({}, ...__VLS_functionalComponentArgsRest(__VLS_141));
    var __VLS_139;
    var __VLS_131;
}
else {
    const __VLS_144 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.loading),
        ...{ class: "send-btn" },
    }));
    const __VLS_146 = __VLS_145({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.loading),
        ...{ class: "send-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    let __VLS_148;
    let __VLS_149;
    let __VLS_150;
    const __VLS_151 = {
        onClick: (__VLS_ctx.sendMessage)
    };
    __VLS_147.slots.default;
    const __VLS_152 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({}));
    const __VLS_154 = __VLS_153({}, ...__VLS_functionalComponentArgsRest(__VLS_153));
    __VLS_155.slots.default;
    const __VLS_156 = {}.Promotion;
    /** @type {[typeof __VLS_components.Promotion, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({}));
    const __VLS_158 = __VLS_157({}, ...__VLS_functionalComponentArgsRest(__VLS_157));
    var __VLS_155;
    var __VLS_147;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "recommend-panel glass-card" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.showRecommendPanel) }, null, null);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-title" },
});
const __VLS_160 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({}));
const __VLS_162 = __VLS_161({}, ...__VLS_functionalComponentArgsRest(__VLS_161));
__VLS_163.slots.default;
const __VLS_164 = {}.Reading;
/** @type {[typeof __VLS_components.Reading, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({}));
const __VLS_166 = __VLS_165({}, ...__VLS_functionalComponentArgsRest(__VLS_165));
var __VLS_163;
const __VLS_168 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
    ...{ 'onClick': {} },
    text: true,
}));
const __VLS_170 = __VLS_169({
    ...{ 'onClick': {} },
    text: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
let __VLS_172;
let __VLS_173;
let __VLS_174;
const __VLS_175 = {
    onClick: (...[$event]) => {
        __VLS_ctx.showRecommendPanel = false;
    }
};
__VLS_171.slots.default;
const __VLS_176 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({}));
const __VLS_178 = __VLS_177({}, ...__VLS_functionalComponentArgsRest(__VLS_177));
__VLS_179.slots.default;
const __VLS_180 = {}.Close;
/** @type {[typeof __VLS_components.Close, ]} */ ;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({}));
const __VLS_182 = __VLS_181({}, ...__VLS_functionalComponentArgsRest(__VLS_181));
var __VLS_179;
var __VLS_171;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "recommend-list" },
});
if (__VLS_ctx.recommendedBooks.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    for (const [book, index] of __VLS_getVForSourceType((__VLS_ctx.recommendedBooks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (index),
            ...{ class: "book-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "book-icon" },
        });
        const __VLS_184 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({}));
        const __VLS_186 = __VLS_185({}, ...__VLS_functionalComponentArgsRest(__VLS_185));
        __VLS_187.slots.default;
        const __VLS_188 = {}.Document;
        /** @type {[typeof __VLS_components.Document, ]} */ ;
        // @ts-ignore
        const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({}));
        const __VLS_190 = __VLS_189({}, ...__VLS_functionalComponentArgsRest(__VLS_189));
        var __VLS_187;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "book-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "book-title" },
        });
        (book.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "book-author" },
        });
        (book.author);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "book-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "similarity" },
        });
        (book.similarity);
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-recommend" },
    });
    const __VLS_192 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({}));
    const __VLS_194 = __VLS_193({}, ...__VLS_functionalComponentArgsRest(__VLS_193));
    __VLS_195.slots.default;
    const __VLS_196 = {}.Reading;
    /** @type {[typeof __VLS_components.Reading, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({}));
    const __VLS_198 = __VLS_197({}, ...__VLS_functionalComponentArgsRest(__VLS_197));
    var __VLS_195;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
/** @type {__VLS_StyleScopedClasses['page-container']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-container']} */ ;
/** @type {__VLS_StyleScopedClasses['side-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['status-section']} */ ;
/** @type {__VLS_StyleScopedClasses['status-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['status-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['status-text']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-info']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['action-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['history-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['history-search']} */ ;
/** @type {__VLS_StyleScopedClasses['history-list']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item']} */ ;
/** @type {__VLS_StyleScopedClasses['history-text']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-history']} */ ;
/** @type {__VLS_StyleScopedClasses['main-chat-area']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-header']} */ ;
/** @type {__VLS_StyleScopedClasses['header-info']} */ ;
/** @type {__VLS_StyleScopedClasses['header-title']} */ ;
/** @type {__VLS_StyleScopedClasses['header-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-messages']} */ ;
/** @type {__VLS_StyleScopedClasses['message-row']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['typing-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['message-timestamp']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-input-area']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-prompts']} */ ;
/** @type {__VLS_StyleScopedClasses['input-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['button-group']} */ ;
/** @type {__VLS_StyleScopedClasses['stop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['send-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
/** @type {__VLS_StyleScopedClasses['header-title']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-list']} */ ;
/** @type {__VLS_StyleScopedClasses['book-card']} */ ;
/** @type {__VLS_StyleScopedClasses['book-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['book-info']} */ ;
/** @type {__VLS_StyleScopedClasses['book-title']} */ ;
/** @type {__VLS_StyleScopedClasses['book-author']} */ ;
/** @type {__VLS_StyleScopedClasses['book-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['similarity']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-recommend']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            MagicStick: MagicStick,
            User: User,
            Service: Service,
            Reading: Reading,
            Search: Search,
            ChatDotRound: ChatDotRound,
            Clock: Clock,
            Promotion: Promotion,
            Document: Document,
            Close: Close,
            RefreshRight: RefreshRight,
            Delete: Delete,
            VideoPause: VideoPause,
            Download: Download,
            inputMessage: inputMessage,
            loading: loading,
            messagesRef: messagesRef,
            chatHistory: chatHistory,
            isAIOnline: isAIOnline,
            vectorCoverage: vectorCoverage,
            totalVectors: totalVectors,
            recommendedBooks: recommendedBooks,
            chatHistoryList: chatHistoryList,
            showRecommendPanel: showRecommendPanel,
            searchQuery: searchQuery,
            filteredChatHistoryList: filteredChatHistoryList,
            formatContent: formatContent,
            formatTime: formatTime,
            sendMessage: sendMessage,
            stopGeneration: stopGeneration,
            triggerTool: triggerTool,
            setInput: setInput,
            startNewChat: startNewChat,
            regenerateLastMessage: regenerateLastMessage,
            exportConversation: exportConversation,
            loadChatHistory: loadChatHistory,
            deleteConversation: deleteConversation,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=AIAssistant.vue.js.map