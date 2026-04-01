/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive, computed, onMounted } from 'vue';
import { useUserStore } from '@/store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Upload, Reading, MagicStick, Delete, Connection, Check } from '@element-plus/icons-vue';
import { readerCategoryApi } from '../api/reader.api';
import { bookApi } from '../api/book.api';
import { aiApi } from '../api/ai.api';
import { configApi } from '../api/other.api';
const userStore = useUserStore();
const activeTab = ref('basic');
const isAdmin = computed(() => userStore.user?.role === 'admin');
const visibleTabs = computed(() => {
    const tabs = [{ key: 'basic', label: '基本信息' }, { key: 'categories', label: '读者种类' }];
    if (isAdmin.value)
        tabs.push({ key: 'ai', label: 'AI 配置' }, { key: 'vector', label: '向量管理' });
    tabs.push({ key: 'about', label: '关于' });
    return tabs;
});
const getRoleLabel = (role) => {
    const map = { admin: '管理员', librarian: '图书管理员', teacher: '教师', student: '学生' };
    return map[role || ''] || '未知';
};
// Categories
const showCategoryDialog = ref(false);
const readerCategories = ref([]);
const categoryForm = reactive({ code: '', name: '', max_borrow_count: 5, max_borrow_days: 30, validity_days: 365, notes: '' });
const loadCategories = async () => {
    const result = await readerCategoryApi.getAll();
    if (result.success)
        readerCategories.value = result.data;
};
const handleCreateCategory = async () => {
    if (!categoryForm.code || !categoryForm.name) {
        ElMessage.warning('请填写完整信息');
        return;
    }
    try {
        const result = await readerCategoryApi.create(JSON.parse(JSON.stringify(categoryForm)));
        if (result.success) {
            ElMessage.success('创建成功');
            showCategoryDialog.value = false;
            loadCategories();
        }
        else
            ElMessage.error(result.error?.message || '创建失败');
    }
    catch {
        ElMessage.error('创建失败');
    }
};
const handleDeleteCategory = async (row) => {
    try {
        await ElMessageBox.confirm(`确定要删除分类 "${row.name}" 吗？`, '确认', { type: 'warning' });
        const result = await readerCategoryApi.delete(row.id);
        if (result.success) {
            ElMessage.success('删除成功');
            loadCategories();
        }
    }
    catch { }
};
// AI Config
const testingConnection = ref(false);
const savingConfig = ref(false);
const aiConfigForm = reactive({ apiUrl: 'https://api.openai.com/v1', apiKey: '', embeddingModel: 'text-embedding-3-small', chatModel: 'gpt-4-turbo-preview' });
const loadAISettings = async () => {
    try {
        const result = await configApi.getAISettings();
        if (result.success && result.data) {
            if (result.data.baseURL)
                aiConfigForm.apiUrl = result.data.baseURL;
            if (result.data.apiKey)
                aiConfigForm.apiKey = result.data.apiKey;
            if (result.data.embeddingModel)
                aiConfigForm.embeddingModel = result.data.embeddingModel;
            if (result.data.chatModel)
                aiConfigForm.chatModel = result.data.chatModel;
        }
    }
    catch { }
};
const handleTestConnection = async () => {
    if (!aiConfigForm.apiKey) {
        ElMessage.warning('请先输入 API Key');
        return;
    }
    testingConnection.value = true;
    try {
        const result = await configApi.testAIConnection();
        if (result.success)
            ElMessage.success(result.data?.message || '连接测试成功');
        else
            ElMessage.error(result.data?.message || result.error?.message || '连接测试失败');
    }
    catch (e) {
        ElMessage.error(e.message || '连接测试失败');
    }
    finally {
        testingConnection.value = false;
    }
};
const handleSaveAIConfig = async () => {
    if (!aiConfigForm.apiKey) {
        ElMessage.warning('请先输入 API Key');
        return;
    }
    savingConfig.value = true;
    try {
        const result = await configApi.updateAISettings({ baseURL: aiConfigForm.apiUrl, apiKey: aiConfigForm.apiKey, embeddingModel: aiConfigForm.embeddingModel, chatModel: aiConfigForm.chatModel });
        if (result.success)
            ElMessage.success('保存成功');
        else
            ElMessage.error(result.error?.message || '保存失败');
    }
    catch {
        ElMessage.error('保存失败');
    }
    finally {
        savingConfig.value = false;
    }
};
// Vector
const vectorStats = reactive({ totalVectors: 0, coverageRate: 0 });
const vectorLoading = ref(false);
const loadVectorStats = async () => {
    const result = await aiApi.getStatistics();
    if (result.success)
        Object.assign(vectorStats, result.data);
};
const handleBatchCreateVectors = async () => {
    try {
        await ElMessageBox.confirm('批量生成向量需要调用 AI API，可能需要较长时间并产生费用，确定继续吗？', '提示', { type: 'warning' });
        vectorLoading.value = true;
        const booksResult = await bookApi.getAll();
        if (!booksResult.success) {
            ElMessage.error('获取图书列表失败');
            return;
        }
        const bookIds = booksResult.data.map((b) => b.id);
        if (!bookIds.length) {
            ElMessage.warning('没有图书可以生成向量');
            return;
        }
        const result = await aiApi.batchCreateEmbeddings(bookIds);
        if (result.success) {
            ElMessage.success(`成功为 ${bookIds.length} 本图书生成向量`);
            loadVectorStats();
        }
        else
            ElMessage.error(result.error?.message || '生成失败');
    }
    catch (e) {
        if (e !== 'cancel' && e !== 'close')
            ElMessage.error(e.message || '生成向量失败');
    }
    finally {
        vectorLoading.value = false;
    }
};
onMounted(() => { loadCategories(); loadAISettings(); loadVectorStats(); });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header animate-fade-in" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header-left" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-subtitle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "pill-tabs animate-fade-in-delay-1" },
    ...{ style: {} },
});
for (const [tab] of __VLS_getVForSourceType((__VLS_ctx.visibleTabs))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.activeTab = tab.key;
            } },
        key: (tab.key),
        ...{ class: "pill-tab" },
        ...{ class: ({ active: __VLS_ctx.activeTab === tab.key }) },
    });
    (tab.label);
}
if (__VLS_ctx.activeTab === 'basic') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card animate-fade-in-delay-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-value" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-value" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-value" },
    });
    (__VLS_ctx.userStore.user?.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-value" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pill-badge red" },
    });
    (__VLS_ctx.getRoleLabel(__VLS_ctx.userStore.user?.role));
}
if (__VLS_ctx.activeTab === 'categories') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card animate-fade-in-delay-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTab === 'categories'))
                    return;
                __VLS_ctx.showCategoryDialog = true;
            } },
        ...{ class: "gradient-btn" },
    });
    const __VLS_0 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    const __VLS_4 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
    const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
    var __VLS_3;
    const __VLS_8 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        data: (__VLS_ctx.readerCategories),
        ...{ style: {} },
    }));
    const __VLS_10 = __VLS_9({
        data: (__VLS_ctx.readerCategories),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    const __VLS_12 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        prop: "code",
        label: "编码",
        width: "100",
    }));
    const __VLS_14 = __VLS_13({
        prop: "code",
        label: "编码",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    const __VLS_16 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        prop: "name",
        label: "名称",
        width: "140",
    }));
    const __VLS_18 = __VLS_17({
        prop: "name",
        label: "名称",
        width: "140",
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    const __VLS_20 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        prop: "max_borrow_count",
        label: "最大借阅数",
        width: "120",
        align: "center",
    }));
    const __VLS_22 = __VLS_21({
        prop: "max_borrow_count",
        label: "最大借阅数",
        width: "120",
        align: "center",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    const __VLS_24 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        prop: "max_borrow_days",
        label: "借阅期限(天)",
        width: "130",
        align: "center",
    }));
    const __VLS_26 = __VLS_25({
        prop: "max_borrow_days",
        label: "借阅期限(天)",
        width: "130",
        align: "center",
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    const __VLS_28 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        prop: "validity_days",
        label: "有效期(天)",
        width: "120",
        align: "center",
    }));
    const __VLS_30 = __VLS_29({
        prop: "validity_days",
        label: "有效期(天)",
        width: "120",
        align: "center",
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    const __VLS_32 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        prop: "notes",
        label: "备注",
    }));
    const __VLS_34 = __VLS_33({
        prop: "notes",
        label: "备注",
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    const __VLS_36 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        label: "操作",
        width: "120",
        align: "right",
    }));
    const __VLS_38 = __VLS_37({
        label: "操作",
        width: "120",
        align: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_39.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_39.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'categories'))
                        return;
                    __VLS_ctx.handleDeleteCategory(row);
                } },
            ...{ class: "icon-btn danger" },
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
    var __VLS_39;
    var __VLS_11;
}
if (__VLS_ctx.activeTab === 'ai' && __VLS_ctx.isAdmin) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card animate-fade-in-delay-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-header" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ai-header-icon" },
    });
    const __VLS_48 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({}));
    const __VLS_50 = __VLS_49({}, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    const __VLS_52 = {}.MagicStick;
    /** @type {[typeof __VLS_components.MagicStick, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({}));
    const __VLS_54 = __VLS_53({}, ...__VLS_functionalComponentArgsRest(__VLS_53));
    var __VLS_51;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-desc" },
    });
    const __VLS_56 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        model: (__VLS_ctx.aiConfigForm),
        labelWidth: "140px",
        ...{ style: {} },
    }));
    const __VLS_58 = __VLS_57({
        model: (__VLS_ctx.aiConfigForm),
        labelWidth: "140px",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_59.slots.default;
    const __VLS_60 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        label: "API URL",
    }));
    const __VLS_62 = __VLS_61({
        label: "API URL",
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    __VLS_63.slots.default;
    const __VLS_64 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        modelValue: (__VLS_ctx.aiConfigForm.apiUrl),
        placeholder: "https://api.openai.com/v1",
    }));
    const __VLS_66 = __VLS_65({
        modelValue: (__VLS_ctx.aiConfigForm.apiUrl),
        placeholder: "https://api.openai.com/v1",
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    var __VLS_63;
    const __VLS_68 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        label: "API Key",
    }));
    const __VLS_70 = __VLS_69({
        label: "API Key",
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    __VLS_71.slots.default;
    const __VLS_72 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        modelValue: (__VLS_ctx.aiConfigForm.apiKey),
        type: "password",
        placeholder: "请输入 API 密钥",
        showPassword: true,
    }));
    const __VLS_74 = __VLS_73({
        modelValue: (__VLS_ctx.aiConfigForm.apiKey),
        type: "password",
        placeholder: "请输入 API 密钥",
        showPassword: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    var __VLS_71;
    const __VLS_76 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        label: "Embedding 模型",
    }));
    const __VLS_78 = __VLS_77({
        label: "Embedding 模型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    __VLS_79.slots.default;
    const __VLS_80 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        modelValue: (__VLS_ctx.aiConfigForm.embeddingModel),
        placeholder: "text-embedding-3-small",
    }));
    const __VLS_82 = __VLS_81({
        modelValue: (__VLS_ctx.aiConfigForm.embeddingModel),
        placeholder: "text-embedding-3-small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    var __VLS_79;
    const __VLS_84 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        label: "Chat 模型",
    }));
    const __VLS_86 = __VLS_85({
        label: "Chat 模型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_87.slots.default;
    const __VLS_88 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        modelValue: (__VLS_ctx.aiConfigForm.chatModel),
        placeholder: "gpt-4-turbo-preview",
    }));
    const __VLS_90 = __VLS_89({
        modelValue: (__VLS_ctx.aiConfigForm.chatModel),
        placeholder: "gpt-4-turbo-preview",
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    var __VLS_87;
    const __VLS_92 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({}));
    const __VLS_94 = __VLS_93({}, ...__VLS_functionalComponentArgsRest(__VLS_93));
    __VLS_95.slots.default;
    const __VLS_96 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.testingConnection),
    }));
    const __VLS_98 = __VLS_97({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.testingConnection),
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    let __VLS_100;
    let __VLS_101;
    let __VLS_102;
    const __VLS_103 = {
        onClick: (__VLS_ctx.handleTestConnection)
    };
    __VLS_99.slots.default;
    const __VLS_104 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({}));
    const __VLS_106 = __VLS_105({}, ...__VLS_functionalComponentArgsRest(__VLS_105));
    __VLS_107.slots.default;
    const __VLS_108 = {}.Connection;
    /** @type {[typeof __VLS_components.Connection, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({}));
    const __VLS_110 = __VLS_109({}, ...__VLS_functionalComponentArgsRest(__VLS_109));
    var __VLS_107;
    var __VLS_99;
    const __VLS_112 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.savingConfig),
    }));
    const __VLS_114 = __VLS_113({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.savingConfig),
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    let __VLS_116;
    let __VLS_117;
    let __VLS_118;
    const __VLS_119 = {
        onClick: (__VLS_ctx.handleSaveAIConfig)
    };
    __VLS_115.slots.default;
    const __VLS_120 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({}));
    const __VLS_122 = __VLS_121({}, ...__VLS_functionalComponentArgsRest(__VLS_121));
    __VLS_123.slots.default;
    const __VLS_124 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({}));
    const __VLS_126 = __VLS_125({}, ...__VLS_functionalComponentArgsRest(__VLS_125));
    var __VLS_123;
    var __VLS_115;
    var __VLS_95;
    var __VLS_59;
}
if (__VLS_ctx.activeTab === 'vector' && __VLS_ctx.isAdmin) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card animate-fade-in-delay-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-grid" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-value" },
    });
    (__VLS_ctx.vectorStats.totalVectors);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-value" },
    });
    (__VLS_ctx.vectorStats.coverageRate.toFixed(1));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vector-action-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleBatchCreateVectors) },
        ...{ class: "gradient-btn" },
        disabled: (__VLS_ctx.vectorLoading),
    });
    const __VLS_128 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({}));
    const __VLS_130 = __VLS_129({}, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_131.slots.default;
    const __VLS_132 = {}.Upload;
    /** @type {[typeof __VLS_components.Upload, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({}));
    const __VLS_134 = __VLS_133({}, ...__VLS_functionalComponentArgsRest(__VLS_133));
    var __VLS_131;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "vector-hint" },
    });
}
if (__VLS_ctx.activeTab === 'about') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card animate-fade-in-delay-2 about-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "about-logo-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "about-logo-circle" },
    });
    const __VLS_136 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        size: (48),
    }));
    const __VLS_138 = __VLS_137({
        size: (48),
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    __VLS_139.slots.default;
    const __VLS_140 = {}.Reading;
    /** @type {[typeof __VLS_components.Reading, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({}));
    const __VLS_142 = __VLS_141({}, ...__VLS_functionalComponentArgsRest(__VLS_141));
    var __VLS_139;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "about-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "about-desc" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "about-tags" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pill-badge red" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pill-badge success" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pill-badge info" },
    });
}
const __VLS_144 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    modelValue: (__VLS_ctx.showCategoryDialog),
    title: "新增读者种类",
    width: "500px",
    alignCenter: true,
}));
const __VLS_146 = __VLS_145({
    modelValue: (__VLS_ctx.showCategoryDialog),
    title: "新增读者种类",
    width: "500px",
    alignCenter: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
__VLS_147.slots.default;
const __VLS_148 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    model: (__VLS_ctx.categoryForm),
    labelWidth: "120px",
}));
const __VLS_150 = __VLS_149({
    model: (__VLS_ctx.categoryForm),
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
__VLS_151.slots.default;
const __VLS_152 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
    label: "编码",
}));
const __VLS_154 = __VLS_153({
    label: "编码",
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
__VLS_155.slots.default;
const __VLS_156 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    modelValue: (__VLS_ctx.categoryForm.code),
}));
const __VLS_158 = __VLS_157({
    modelValue: (__VLS_ctx.categoryForm.code),
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
var __VLS_155;
const __VLS_160 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    label: "名称",
}));
const __VLS_162 = __VLS_161({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
__VLS_163.slots.default;
const __VLS_164 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    modelValue: (__VLS_ctx.categoryForm.name),
}));
const __VLS_166 = __VLS_165({
    modelValue: (__VLS_ctx.categoryForm.name),
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
var __VLS_163;
const __VLS_168 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
    label: "最大借阅数",
}));
const __VLS_170 = __VLS_169({
    label: "最大借阅数",
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
__VLS_171.slots.default;
const __VLS_172 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
    modelValue: (__VLS_ctx.categoryForm.max_borrow_count),
    min: (1),
}));
const __VLS_174 = __VLS_173({
    modelValue: (__VLS_ctx.categoryForm.max_borrow_count),
    min: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
var __VLS_171;
const __VLS_176 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    label: "借阅期限(天)",
}));
const __VLS_178 = __VLS_177({
    label: "借阅期限(天)",
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
__VLS_179.slots.default;
const __VLS_180 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
    modelValue: (__VLS_ctx.categoryForm.max_borrow_days),
    min: (1),
}));
const __VLS_182 = __VLS_181({
    modelValue: (__VLS_ctx.categoryForm.max_borrow_days),
    min: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_181));
var __VLS_179;
const __VLS_184 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
    label: "有效期(天)",
}));
const __VLS_186 = __VLS_185({
    label: "有效期(天)",
}, ...__VLS_functionalComponentArgsRest(__VLS_185));
__VLS_187.slots.default;
const __VLS_188 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
    modelValue: (__VLS_ctx.categoryForm.validity_days),
    min: (1),
}));
const __VLS_190 = __VLS_189({
    modelValue: (__VLS_ctx.categoryForm.validity_days),
    min: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_189));
var __VLS_187;
const __VLS_192 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
    label: "备注",
}));
const __VLS_194 = __VLS_193({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_193));
__VLS_195.slots.default;
const __VLS_196 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
    modelValue: (__VLS_ctx.categoryForm.notes),
    type: "textarea",
}));
const __VLS_198 = __VLS_197({
    modelValue: (__VLS_ctx.categoryForm.notes),
    type: "textarea",
}, ...__VLS_functionalComponentArgsRest(__VLS_197));
var __VLS_195;
var __VLS_151;
{
    const { footer: __VLS_thisSlot } = __VLS_147.slots;
    const __VLS_200 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
        ...{ 'onClick': {} },
    }));
    const __VLS_202 = __VLS_201({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_201));
    let __VLS_204;
    let __VLS_205;
    let __VLS_206;
    const __VLS_207 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showCategoryDialog = false;
        }
    };
    __VLS_203.slots.default;
    var __VLS_203;
    const __VLS_208 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_210 = __VLS_209({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    let __VLS_212;
    let __VLS_213;
    let __VLS_214;
    const __VLS_215 = {
        onClick: (__VLS_ctx.handleCreateCategory)
    };
    __VLS_211.slots.default;
    var __VLS_211;
}
var __VLS_147;
/** @type {__VLS_StyleScopedClasses['settings-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header-left']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-1']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-2']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['info-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['info-label']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['info-label']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['info-label']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['info-label']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['red']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-2']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['gradient-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-2']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-header-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-2']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['info-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['info-label']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['info-label']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['vector-action-box']} */ ;
/** @type {__VLS_StyleScopedClasses['gradient-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['vector-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-2']} */ ;
/** @type {__VLS_StyleScopedClasses['about-card']} */ ;
/** @type {__VLS_StyleScopedClasses['about-logo-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['about-logo-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['about-title']} */ ;
/** @type {__VLS_StyleScopedClasses['about-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['about-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['red']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['success']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['info']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Plus: Plus,
            Upload: Upload,
            Reading: Reading,
            MagicStick: MagicStick,
            Delete: Delete,
            Connection: Connection,
            Check: Check,
            userStore: userStore,
            activeTab: activeTab,
            isAdmin: isAdmin,
            visibleTabs: visibleTabs,
            getRoleLabel: getRoleLabel,
            showCategoryDialog: showCategoryDialog,
            readerCategories: readerCategories,
            categoryForm: categoryForm,
            handleCreateCategory: handleCreateCategory,
            handleDeleteCategory: handleDeleteCategory,
            testingConnection: testingConnection,
            savingConfig: savingConfig,
            aiConfigForm: aiConfigForm,
            handleTestConnection: handleTestConnection,
            handleSaveAIConfig: handleSaveAIConfig,
            vectorStats: vectorStats,
            vectorLoading: vectorLoading,
            handleBatchCreateVectors: handleBatchCreateVectors,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=Settings.vue.js.map