/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { MagicStick, User, Service, Reading, Search, ChatDotRound, Clock, Promotion, Document, Close, Delete, VideoPause, Download } from '@element-plus/icons-vue';
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
const showRecommend = ref(true);
const historySearch = ref('');
const filteredHistory = computed(() => {
    if (!historySearch.value)
        return chatHistoryList.value;
    return chatHistoryList.value.filter(c => c.title.toLowerCase().includes(historySearch.value.toLowerCase()));
});
const formatContent = (content) => {
    if (!content)
        return '';
    return DOMPurify.sanitize(marked(content));
};
const formatTime = (timestamp) => {
    if (!timestamp)
        return '';
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};
const scrollToBottom = () => {
    nextTick(() => { if (messagesRef.value)
        messagesRef.value.scrollTop = messagesRef.value.scrollHeight; });
};
const sendMessage = async () => {
    if (!inputMessage.value.trim() || loading.value)
        return;
    const userMessage = inputMessage.value.trim();
    inputMessage.value = '';
    chatHistory.value.push({ id: `user-${Date.now()}`, role: 'user', content: userMessage, timestamp: Date.now() });
    scrollToBottom();
    const aiMessageId = `ai-${Date.now()}`;
    chatHistory.value.push({ id: aiMessageId, role: 'assistant', content: '', loading: true });
    loading.value = true;
    scrollToBottom();
    try {
        const history = chatHistory.value.filter(m => !m.loading && m.id !== 'init').slice(-10).map(m => ({ role: m.role, content: m.content }));
        let fullContent = '';
        const cleanup = aiApi.chatStream(userMessage, history, undefined, (chunk) => {
            fullContent += chunk;
            const mi = chatHistory.value.findIndex(m => m.id === aiMessageId);
            if (mi > -1) {
                chatHistory.value[mi].content = fullContent;
                chatHistory.value[mi].loading = false;
                scrollToBottom();
            }
        }, (error) => {
            const mi = chatHistory.value.findIndex(m => m.id === aiMessageId);
            if (mi > -1) {
                chatHistory.value[mi].content = `发生错误: ${error}`;
                chatHistory.value[mi].loading = false;
            }
            loading.value = false;
            ElMessage.error('AI响应失败');
        }, () => {
            const mi = chatHistory.value.findIndex(m => m.id === aiMessageId);
            if (mi > -1)
                chatHistory.value[mi].timestamp = Date.now();
            loading.value = false;
            saveCurrentConversation();
        });
        streamCleanup.value = cleanup;
    }
    catch {
        const mi = chatHistory.value.findIndex(m => m.id === aiMessageId);
        if (mi > -1) {
            chatHistory.value[mi].content = 'AI服务暂时不可用，请稍后再试。';
            chatHistory.value[mi].loading = false;
        }
        loading.value = false;
    }
};
const stopGeneration = () => {
    if (streamCleanup.value) {
        streamCleanup.value();
        streamCleanup.value = null;
    }
    loading.value = false;
};
const setInput = (text) => { inputMessage.value = text; };
const startNewChat = () => {
    chatHistory.value = [{ id: 'init', role: 'assistant', content: '你好！我是图书馆智能助手。你可以问我关于馆藏图书的问题，或者让我为你推荐书籍。', timestamp: Date.now() }];
    currentConversationId.value = null;
    recommendedBooks.value = [];
};
const exportConversation = () => {
    const content = chatHistory.value.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `chat-${new Date().toISOString().slice(0, 10)}.txt` });
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('对话已导出');
};
const loadChatHistory = (item) => { currentConversationId.value = item.id; chatHistory.value = item.messages; scrollToBottom(); };
const deleteConversation = async (item) => {
    try {
        const result = await aiApi.deleteConversation(item.id);
        if (result.success) {
            chatHistoryList.value = chatHistoryList.value.filter(c => c.id !== item.id);
            if (currentConversationId.value === item.id)
                startNewChat();
            ElMessage.success('对话已删除');
        }
    }
    catch {
        ElMessage.error('删除失败');
    }
};
const saveCurrentConversation = async () => {
    if (!userStore.user?.id || chatHistory.value.length <= 1)
        return;
    const title = chatHistory.value.find(m => m.role === 'user')?.content.slice(0, 30) || '新对话';
    const messages = chatHistory.value.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }));
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
    catch (e) {
        console.error('Save conversation error:', e);
    }
};
const loadConversations = async () => {
    if (!userStore.user?.id)
        return;
    try {
        const result = await aiApi.getConversations(userStore.user.id, 20);
        if (result.success) {
            chatHistoryList.value = result.data.map((c) => ({ ...c, messages: typeof c.messages === 'string' ? JSON.parse(c.messages) : c.messages }));
        }
    }
    catch { }
};
const checkAIStatus = async () => { try {
    const r = await aiApi.isAvailable();
    isAIOnline.value = r.success && r.data;
}
catch {
    isAIOnline.value = false;
} };
const loadVectorStats = async () => { try {
    const r = await aiApi.getStatistics();
    if (r.success) {
        totalVectors.value = r.data.totalVectors || 0;
        vectorCoverage.value = r.data.coverageRate || 0;
    }
}
catch { } };
onMounted(() => { checkAIStatus(); loadVectorStats(); loadConversations(); });
onUnmounted(() => { if (streamCleanup.value)
    streamCleanup.value(); });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['action-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-item']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-item']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-item']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-del']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-del']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-row']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['user']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['user']} */ ;
/** @type {__VLS_StyleScopedClasses['typing-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['typing-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['typing-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['qp-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['send-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['stop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-book']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['history-panel']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "history-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hp-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hp-logo" },
});
const __VLS_0 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ style: {} },
}));
const __VLS_2 = __VLS_1({
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.MagicStick;
/** @type {[typeof __VLS_components.MagicStick, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "status-indicator" },
    ...{ class: ({ online: __VLS_ctx.isAIOnline }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
    ...{ class: "pulse-dot" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.isAIOnline ? '在线' : '离线');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "search-bar" },
    ...{ style: {} },
});
const __VLS_8 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ class: "search-icon" },
}));
const __VLS_10 = __VLS_9({
    ...{ class: "search-icon" },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
const __VLS_12 = {}.Search;
/** @type {[typeof __VLS_components.Search, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
var __VLS_11;
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "搜索对话…",
});
(__VLS_ctx.historySearch);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hp-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.startNewChat) },
    ...{ class: "action-chip" },
});
const __VLS_16 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({}));
const __VLS_18 = __VLS_17({}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.ChatDotRound;
/** @type {[typeof __VLS_components.ChatDotRound, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
var __VLS_19;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.exportConversation) },
    ...{ class: "action-chip" },
});
const __VLS_24 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
const __VLS_28 = {}.Download;
/** @type {[typeof __VLS_components.Download, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({}));
const __VLS_30 = __VLS_29({}, ...__VLS_functionalComponentArgsRest(__VLS_29));
var __VLS_27;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hp-list" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredHistory))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.loadChatHistory(item);
            } },
        key: (item.id),
        ...{ class: "hp-item" },
        ...{ class: ({ active: __VLS_ctx.currentConversationId === item.id }) },
    });
    const __VLS_32 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ style: {} },
    }));
    const __VLS_34 = __VLS_33({
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    const __VLS_36 = {}.Clock;
    /** @type {[typeof __VLS_components.Clock, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({}));
    const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
    var __VLS_35;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "hp-item-text" },
    });
    (item.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.deleteConversation(item);
            } },
        ...{ class: "hp-del" },
    });
    const __VLS_40 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({}));
    const __VLS_42 = __VLS_41({}, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_43.slots.default;
    const __VLS_44 = {}.Delete;
    /** @type {[typeof __VLS_components.Delete, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({}));
    const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
    var __VLS_43;
}
if (__VLS_ctx.chatHistoryList.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hp-empty" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hp-stats" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hp-stat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "hp-stat-val" },
});
(__VLS_ctx.totalVectors);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "hp-stat-lbl" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hp-stat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "hp-stat-val" },
});
(__VLS_ctx.vectorCoverage);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "hp-stat-lbl" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "chat-main" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ch-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ch-sub" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showRecommend = !__VLS_ctx.showRecommend;
        } },
    ...{ class: "icon-btn" },
    title: "推荐面板",
});
const __VLS_48 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({}));
const __VLS_50 = __VLS_49({}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
const __VLS_52 = {}.Reading;
/** @type {[typeof __VLS_components.Reading, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({}));
const __VLS_54 = __VLS_53({}, ...__VLS_functionalComponentArgsRest(__VLS_53));
var __VLS_51;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "messagesRef",
    ...{ class: "chat-messages" },
});
/** @type {typeof __VLS_ctx.messagesRef} */ ;
for (const [msg, idx] of __VLS_getVForSourceType((__VLS_ctx.chatHistory))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (msg.id || idx),
        ...{ class: "msg-row" },
        ...{ class: (msg.role) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "msg-avatar" },
        ...{ class: (msg.role) },
    });
    if (msg.role === 'assistant') {
        const __VLS_56 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({}));
        const __VLS_58 = __VLS_57({}, ...__VLS_functionalComponentArgsRest(__VLS_57));
        __VLS_59.slots.default;
        const __VLS_60 = {}.Service;
        /** @type {[typeof __VLS_components.Service, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({}));
        const __VLS_62 = __VLS_61({}, ...__VLS_functionalComponentArgsRest(__VLS_61));
        var __VLS_59;
    }
    else {
        const __VLS_64 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({}));
        const __VLS_66 = __VLS_65({}, ...__VLS_functionalComponentArgsRest(__VLS_65));
        __VLS_67.slots.default;
        const __VLS_68 = {}.User;
        /** @type {[typeof __VLS_components.User, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({}));
        const __VLS_70 = __VLS_69({}, ...__VLS_functionalComponentArgsRest(__VLS_69));
        var __VLS_67;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "msg-bubble" },
        ...{ class: (msg.role) },
    });
    if (msg.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "typing-dots" },
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
            ...{ class: "msg-time" },
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.setInput('最近有什么新书？');
        } },
    ...{ class: "qp-chip" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.setInput('适合初学者的Python书');
        } },
    ...{ class: "qp-chip" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.setInput('推荐一些关于人工智能的书籍');
        } },
    ...{ class: "qp-chip" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "input-row" },
});
const __VLS_72 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    ...{ 'onKeydown': {} },
    modelValue: (__VLS_ctx.inputMessage),
    type: "textarea",
    rows: (2),
    placeholder: "输入您的问题，按 Enter 发送…",
    disabled: (__VLS_ctx.loading),
}));
const __VLS_74 = __VLS_73({
    ...{ 'onKeydown': {} },
    modelValue: (__VLS_ctx.inputMessage),
    type: "textarea",
    rows: (2),
    placeholder: "输入您的问题，按 Enter 发送…",
    disabled: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
let __VLS_76;
let __VLS_77;
let __VLS_78;
const __VLS_79 = {
    onKeydown: (__VLS_ctx.sendMessage)
};
var __VLS_75;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.stopGeneration) },
        ...{ class: "stop-btn" },
    });
    const __VLS_80 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({}));
    const __VLS_82 = __VLS_81({}, ...__VLS_functionalComponentArgsRest(__VLS_81));
    __VLS_83.slots.default;
    const __VLS_84 = {}.VideoPause;
    /** @type {[typeof __VLS_components.VideoPause, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({}));
    const __VLS_86 = __VLS_85({}, ...__VLS_functionalComponentArgsRest(__VLS_85));
    var __VLS_83;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.sendMessage) },
        ...{ class: "send-btn" },
    });
    const __VLS_88 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
    const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
    __VLS_91.slots.default;
    const __VLS_92 = {}.Promotion;
    /** @type {[typeof __VLS_components.Promotion, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({}));
    const __VLS_94 = __VLS_93({}, ...__VLS_functionalComponentArgsRest(__VLS_93));
    var __VLS_91;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "recommend-panel" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.showRecommend) }, null, null);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rp-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rp-title" },
});
const __VLS_96 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({}));
const __VLS_98 = __VLS_97({}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
const __VLS_100 = {}.Reading;
/** @type {[typeof __VLS_components.Reading, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({}));
const __VLS_102 = __VLS_101({}, ...__VLS_functionalComponentArgsRest(__VLS_101));
var __VLS_99;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showRecommend = false;
        } },
    ...{ class: "icon-btn" },
});
const __VLS_104 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({}));
const __VLS_106 = __VLS_105({}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_107.slots.default;
const __VLS_108 = {}.Close;
/** @type {[typeof __VLS_components.Close, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({}));
const __VLS_110 = __VLS_109({}, ...__VLS_functionalComponentArgsRest(__VLS_109));
var __VLS_107;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rp-list" },
});
for (const [book, i] of __VLS_getVForSourceType((__VLS_ctx.recommendedBooks))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (i),
        ...{ class: "rp-book" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rp-book-icon" },
    });
    const __VLS_112 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({}));
    const __VLS_114 = __VLS_113({}, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_115.slots.default;
    const __VLS_116 = {}.Document;
    /** @type {[typeof __VLS_components.Document, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({}));
    const __VLS_118 = __VLS_117({}, ...__VLS_functionalComponentArgsRest(__VLS_117));
    var __VLS_115;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rp-book-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rp-book-title" },
    });
    (book.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rp-book-author" },
    });
    (book.author);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rp-book-similarity" },
    });
    (book.similarity);
}
if (!__VLS_ctx.recommendedBooks.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rp-empty" },
    });
    const __VLS_120 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        ...{ style: {} },
    }));
    const __VLS_122 = __VLS_121({
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    __VLS_123.slots.default;
    const __VLS_124 = {}.Reading;
    /** @type {[typeof __VLS_components.Reading, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({}));
    const __VLS_126 = __VLS_125({}, ...__VLS_functionalComponentArgsRest(__VLS_125));
    var __VLS_123;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
/** @type {__VLS_StyleScopedClasses['ai-page']} */ ;
/** @type {__VLS_StyleScopedClasses['history-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-header']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['status-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['pulse-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['search-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['search-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['action-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['action-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-list']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-item']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-item-text']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-del']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-stat-val']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-stat-lbl']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-stat-val']} */ ;
/** @type {__VLS_StyleScopedClasses['hp-stat-lbl']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-main']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-header']} */ ;
/** @type {__VLS_StyleScopedClasses['ch-title']} */ ;
/** @type {__VLS_StyleScopedClasses['ch-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-messages']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-row']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['typing-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-time']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-input-area']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-prompts']} */ ;
/** @type {__VLS_StyleScopedClasses['qp-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['qp-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['qp-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['stop-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['send-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-header']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-title']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-list']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-book']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-book-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-book-info']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-book-title']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-book-author']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-book-similarity']} */ ;
/** @type {__VLS_StyleScopedClasses['rp-empty']} */ ;
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
            currentConversationId: currentConversationId,
            showRecommend: showRecommend,
            historySearch: historySearch,
            filteredHistory: filteredHistory,
            formatContent: formatContent,
            formatTime: formatTime,
            sendMessage: sendMessage,
            stopGeneration: stopGeneration,
            setInput: setInput,
            startNewChat: startNewChat,
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