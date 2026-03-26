/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive, onMounted, computed } from 'vue';
import { useUserStore } from '@/store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Upload, Reading, MagicStick, InfoFilled, User, Link, Lock, Document, ChatDotRound, Connection, Check, Operation } from '@element-plus/icons-vue';
import { readerCategoryApi } from '../api/reader.api';
import { bookApi } from '../api/book.api';
import { aiApi } from '../api/ai.api';
import { configApi } from '../api/other.api';
const activeTab = ref('basic');
const userStore = useUserStore();
const showCategoryDialog = ref(false);
const readerCategories = ref([]);
const testingConnection = ref(false);
const savingConfig = ref(false);
const isAdmin = computed(() => userStore.user?.role === 'admin');
const getRoleLabel = (role) => {
    const roleMap = {
        'admin': '管理员',
        'librarian': '图书管理员',
        'teacher': '教师',
        'student': '学生'
    };
    return roleMap[role || ''] || '未知';
};
const categoryForm = reactive({
    code: '',
    name: '',
    max_borrow_count: 5,
    max_borrow_days: 30,
    validity_days: 365,
    notes: ''
});
const aiConfigForm = reactive({
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    embeddingModel: 'text-embedding-3-small',
    chatModel: 'gpt-4-turbo-preview'
});
const vectorStats = reactive({
    totalVectors: 0,
    coverageRate: 0
});
const vectorLoading = ref(false);
const loadCategories = async () => {
    const result = await readerCategoryApi.getAll();
    if (result.success) {
        readerCategories.value = result.data;
    }
};
const loadAISettings = async () => {
    try {
        const result = await configApi.getAISettings();
        if (result.success && result.data) {
            if (result.data.baseURL) {
                aiConfigForm.apiUrl = result.data.baseURL;
            }
            if (result.data.apiKey) {
                aiConfigForm.apiKey = result.data.apiKey;
            }
            if (result.data.embeddingModel) {
                aiConfigForm.embeddingModel = result.data.embeddingModel;
            }
            if (result.data.chatModel) {
                aiConfigForm.chatModel = result.data.chatModel;
            }
        }
    }
    catch (error) {
        console.error('Failed to load AI settings:', error);
    }
};
const handleTestConnection = async () => {
    if (!aiConfigForm.apiKey) {
        ElMessage.warning('请先输入API Key');
        return;
    }
    testingConnection.value = true;
    try {
        const result = await configApi.testAIConnection();
        if (result.success) {
            ElMessage.success(result.data?.message || '连接测试成功');
        }
        else {
            ElMessage.error(result.data?.message || result.error?.message || '连接测试失败');
        }
    }
    catch (error) {
        ElMessage.error(error.message || '连接测试失败');
    }
    finally {
        testingConnection.value = false;
    }
};
const handleSaveAIConfig = async () => {
    if (!aiConfigForm.apiKey) {
        ElMessage.warning('请先输入API Key');
        return;
    }
    savingConfig.value = true;
    try {
        const result = await configApi.updateAISettings({
            baseURL: aiConfigForm.apiUrl,
            apiKey: aiConfigForm.apiKey,
            embeddingModel: aiConfigForm.embeddingModel,
            chatModel: aiConfigForm.chatModel
        });
        if (result.success) {
            ElMessage.success('保存成功');
        }
        else {
            ElMessage.error(result.error?.message || '保存失败');
        }
    }
    catch (error) {
        ElMessage.error('保存失败');
    }
    finally {
        savingConfig.value = false;
    }
};
const handleCreateCategory = async () => {
    if (!categoryForm.code || !categoryForm.name) {
        ElMessage.warning('请填写完整信息');
        return;
    }
    try {
        const plainData = JSON.parse(JSON.stringify(categoryForm));
        const result = await readerCategoryApi.create(plainData);
        if (result.success) {
            ElMessage.success('创建成功');
            showCategoryDialog.value = false;
            loadCategories();
            Object.assign(categoryForm, {
                code: '',
                name: '',
                max_borrow_count: 5,
                max_borrow_days: 30,
                validity_days: 365,
                notes: ''
            });
        }
        else {
            ElMessage.error(result.error?.message || '创建失败');
        }
    }
    catch (error) {
        ElMessage.error('创建失败');
    }
};
const handleBatchCreateVectors = async () => {
    try {
        await ElMessageBox.confirm('批量生成向量需要调用AI API，可能需要较长时间并产生费用，确定继续吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        });
        vectorLoading.value = true;
        const booksResult = await bookApi.getAll();
        if (!booksResult.success) {
            ElMessage.error('获取图书列表失败');
            return;
        }
        const bookIds = booksResult.data.map((book) => book.id);
        if (bookIds.length === 0) {
            ElMessage.warning('没有图书可以生成向量');
            return;
        }
        const result = await aiApi.batchCreateEmbeddings(bookIds);
        if (result.success) {
            ElMessage.success(`成功为${bookIds.length}本图书生成向量`);
            loadVectorStats();
        }
        else {
            ElMessage.error(result.error?.message || '生成失败');
        }
    }
    catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(error.message || '生成向量失败');
        }
    }
    finally {
        vectorLoading.value = false;
    }
};
const loadVectorStats = async () => {
    const result = await aiApi.getStatistics();
    if (result.success) {
        Object.assign(vectorStats, result.data);
    }
};
onMounted(() => {
    loadCategories();
    loadAISettings();
    loadVectorStats();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['custom-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-config-header']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-config-header']} */ ;
/** @type {__VLS_StyleScopedClasses['header-text']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-table']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "page-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "page-description" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "glass-card settings-card" },
});
const __VLS_0 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "custom-tabs" },
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "custom-tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    name: "basic",
}));
const __VLS_6 = __VLS_5({
    name: "basic",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
{
    const { label: __VLS_thisSlot } = __VLS_7.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tab-label" },
    });
    const __VLS_8 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
    const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    const __VLS_12 = {}.InfoFilled;
    /** @type {[typeof __VLS_components.InfoFilled, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    var __VLS_11;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-content" },
});
const __VLS_16 = {}.ElDescriptions;
/** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    title: "系统信息",
    column: (2),
    border: true,
    ...{ class: "custom-descriptions" },
}));
const __VLS_18 = __VLS_17({
    title: "系统信息",
    column: (2),
    border: true,
    ...{ class: "custom-descriptions" },
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    label: "系统名称",
}));
const __VLS_22 = __VLS_21({
    label: "系统名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
var __VLS_23;
const __VLS_24 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    label: "版本",
}));
const __VLS_26 = __VLS_25({
    label: "版本",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
var __VLS_27;
const __VLS_28 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    label: "当前用户",
}));
const __VLS_30 = __VLS_29({
    label: "当前用户",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
(__VLS_ctx.userStore.user?.name);
var __VLS_31;
const __VLS_32 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    label: "角色",
}));
const __VLS_34 = __VLS_33({
    label: "角色",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
(__VLS_ctx.getRoleLabel(__VLS_ctx.userStore.user?.role));
var __VLS_35;
var __VLS_19;
var __VLS_7;
const __VLS_36 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    name: "categories",
}));
const __VLS_38 = __VLS_37({
    name: "categories",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
{
    const { label: __VLS_thisSlot } = __VLS_39.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tab-label" },
    });
    const __VLS_40 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({}));
    const __VLS_42 = __VLS_41({}, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_43.slots.default;
    const __VLS_44 = {}.User;
    /** @type {[typeof __VLS_components.User, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({}));
    const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
    var __VLS_43;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-content" },
});
const __VLS_48 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.Plus),
    size: "large",
    ...{ class: "add-btn" },
}));
const __VLS_50 = __VLS_49({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.Plus),
    size: "large",
    ...{ class: "add-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
let __VLS_52;
let __VLS_53;
let __VLS_54;
const __VLS_55 = {
    onClick: (...[$event]) => {
        __VLS_ctx.showCategoryDialog = true;
    }
};
__VLS_51.slots.default;
var __VLS_51;
const __VLS_56 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    data: (__VLS_ctx.readerCategories),
    ...{ class: "custom-table" },
    ...{ style: {} },
}));
const __VLS_58 = __VLS_57({
    data: (__VLS_ctx.readerCategories),
    ...{ class: "custom-table" },
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
__VLS_59.slots.default;
const __VLS_60 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    prop: "code",
    label: "编码",
    width: "100",
}));
const __VLS_62 = __VLS_61({
    prop: "code",
    label: "编码",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
const __VLS_64 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    prop: "name",
    label: "名称",
    width: "120",
}));
const __VLS_66 = __VLS_65({
    prop: "name",
    label: "名称",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
const __VLS_68 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    prop: "max_borrow_count",
    label: "最大借阅数",
    width: "110",
}));
const __VLS_70 = __VLS_69({
    prop: "max_borrow_count",
    label: "最大借阅数",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
const __VLS_72 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    prop: "max_borrow_days",
    label: "借阅期限(天)",
    width: "120",
}));
const __VLS_74 = __VLS_73({
    prop: "max_borrow_days",
    label: "借阅期限(天)",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
const __VLS_76 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    prop: "validity_days",
    label: "有效期(天)",
    width: "110",
}));
const __VLS_78 = __VLS_77({
    prop: "validity_days",
    label: "有效期(天)",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
const __VLS_80 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    prop: "notes",
    label: "备注",
}));
const __VLS_82 = __VLS_81({
    prop: "notes",
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
var __VLS_59;
var __VLS_39;
if (__VLS_ctx.isAdmin) {
    const __VLS_84 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        name: "ai",
    }));
    const __VLS_86 = __VLS_85({
        name: "ai",
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_87.slots.default;
    {
        const { label: __VLS_thisSlot } = __VLS_87.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tab-label" },
        });
        const __VLS_88 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
        const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
        __VLS_91.slots.default;
        const __VLS_92 = {}.MagicStick;
        /** @type {[typeof __VLS_components.MagicStick, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({}));
        const __VLS_94 = __VLS_93({}, ...__VLS_functionalComponentArgsRest(__VLS_93));
        var __VLS_91;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "settings-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ai-config-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "icon-box pink" },
    });
    const __VLS_96 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({}));
    const __VLS_98 = __VLS_97({}, ...__VLS_functionalComponentArgsRest(__VLS_97));
    __VLS_99.slots.default;
    const __VLS_100 = {}.MagicStick;
    /** @type {[typeof __VLS_components.MagicStick, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({}));
    const __VLS_102 = __VLS_101({}, ...__VLS_functionalComponentArgsRest(__VLS_101));
    var __VLS_99;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "header-text" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    const __VLS_104 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        model: (__VLS_ctx.aiConfigForm),
        labelWidth: "140px",
        ...{ class: "ai-form" },
    }));
    const __VLS_106 = __VLS_105({
        model: (__VLS_ctx.aiConfigForm),
        labelWidth: "140px",
        ...{ class: "ai-form" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    __VLS_107.slots.default;
    const __VLS_108 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        label: "API URL",
    }));
    const __VLS_110 = __VLS_109({
        label: "API URL",
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    __VLS_111.slots.default;
    const __VLS_112 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        modelValue: (__VLS_ctx.aiConfigForm.apiUrl),
        placeholder: "https://api.openai.com/v1",
        size: "large",
    }));
    const __VLS_114 = __VLS_113({
        modelValue: (__VLS_ctx.aiConfigForm.apiUrl),
        placeholder: "https://api.openai.com/v1",
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_115.slots.default;
    {
        const { prefix: __VLS_thisSlot } = __VLS_115.slots;
        const __VLS_116 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({}));
        const __VLS_118 = __VLS_117({}, ...__VLS_functionalComponentArgsRest(__VLS_117));
        __VLS_119.slots.default;
        const __VLS_120 = {}.Link;
        /** @type {[typeof __VLS_components.Link, ]} */ ;
        // @ts-ignore
        const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({}));
        const __VLS_122 = __VLS_121({}, ...__VLS_functionalComponentArgsRest(__VLS_121));
        var __VLS_119;
    }
    var __VLS_115;
    var __VLS_111;
    const __VLS_124 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        label: "API Key",
    }));
    const __VLS_126 = __VLS_125({
        label: "API Key",
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    __VLS_127.slots.default;
    const __VLS_128 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        modelValue: (__VLS_ctx.aiConfigForm.apiKey),
        type: "password",
        placeholder: "请输入OpenAI API密钥",
        showPassword: true,
        size: "large",
    }));
    const __VLS_130 = __VLS_129({
        modelValue: (__VLS_ctx.aiConfigForm.apiKey),
        type: "password",
        placeholder: "请输入OpenAI API密钥",
        showPassword: true,
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_131.slots.default;
    {
        const { prefix: __VLS_thisSlot } = __VLS_131.slots;
        const __VLS_132 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({}));
        const __VLS_134 = __VLS_133({}, ...__VLS_functionalComponentArgsRest(__VLS_133));
        __VLS_135.slots.default;
        const __VLS_136 = {}.Lock;
        /** @type {[typeof __VLS_components.Lock, ]} */ ;
        // @ts-ignore
        const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({}));
        const __VLS_138 = __VLS_137({}, ...__VLS_functionalComponentArgsRest(__VLS_137));
        var __VLS_135;
    }
    var __VLS_131;
    var __VLS_127;
    const __VLS_140 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        label: "Embedding模型",
    }));
    const __VLS_142 = __VLS_141({
        label: "Embedding模型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    __VLS_143.slots.default;
    const __VLS_144 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        modelValue: (__VLS_ctx.aiConfigForm.embeddingModel),
        placeholder: "text-embedding-3-small",
        size: "large",
    }));
    const __VLS_146 = __VLS_145({
        modelValue: (__VLS_ctx.aiConfigForm.embeddingModel),
        placeholder: "text-embedding-3-small",
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    __VLS_147.slots.default;
    {
        const { prefix: __VLS_thisSlot } = __VLS_147.slots;
        const __VLS_148 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({}));
        const __VLS_150 = __VLS_149({}, ...__VLS_functionalComponentArgsRest(__VLS_149));
        __VLS_151.slots.default;
        const __VLS_152 = {}.Document;
        /** @type {[typeof __VLS_components.Document, ]} */ ;
        // @ts-ignore
        const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({}));
        const __VLS_154 = __VLS_153({}, ...__VLS_functionalComponentArgsRest(__VLS_153));
        var __VLS_151;
    }
    var __VLS_147;
    var __VLS_143;
    const __VLS_156 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        label: "Chat模型",
    }));
    const __VLS_158 = __VLS_157({
        label: "Chat模型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    __VLS_159.slots.default;
    const __VLS_160 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
        modelValue: (__VLS_ctx.aiConfigForm.chatModel),
        placeholder: "gpt-4-turbo-preview",
        size: "large",
    }));
    const __VLS_162 = __VLS_161({
        modelValue: (__VLS_ctx.aiConfigForm.chatModel),
        placeholder: "gpt-4-turbo-preview",
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    __VLS_163.slots.default;
    {
        const { prefix: __VLS_thisSlot } = __VLS_163.slots;
        const __VLS_164 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({}));
        const __VLS_166 = __VLS_165({}, ...__VLS_functionalComponentArgsRest(__VLS_165));
        __VLS_167.slots.default;
        const __VLS_168 = {}.ChatDotRound;
        /** @type {[typeof __VLS_components.ChatDotRound, ]} */ ;
        // @ts-ignore
        const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({}));
        const __VLS_170 = __VLS_169({}, ...__VLS_functionalComponentArgsRest(__VLS_169));
        var __VLS_167;
    }
    var __VLS_163;
    var __VLS_159;
    const __VLS_172 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({}));
    const __VLS_174 = __VLS_173({}, ...__VLS_functionalComponentArgsRest(__VLS_173));
    __VLS_175.slots.default;
    const __VLS_176 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.testingConnection),
        size: "large",
        ...{ class: "test-btn" },
    }));
    const __VLS_178 = __VLS_177({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.testingConnection),
        size: "large",
        ...{ class: "test-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_177));
    let __VLS_180;
    let __VLS_181;
    let __VLS_182;
    const __VLS_183 = {
        onClick: (__VLS_ctx.handleTestConnection)
    };
    __VLS_179.slots.default;
    const __VLS_184 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({}));
    const __VLS_186 = __VLS_185({}, ...__VLS_functionalComponentArgsRest(__VLS_185));
    __VLS_187.slots.default;
    const __VLS_188 = {}.Connection;
    /** @type {[typeof __VLS_components.Connection, ]} */ ;
    // @ts-ignore
    const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({}));
    const __VLS_190 = __VLS_189({}, ...__VLS_functionalComponentArgsRest(__VLS_189));
    var __VLS_187;
    var __VLS_179;
    const __VLS_192 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
        ...{ 'onClick': {} },
        type: "success",
        loading: (__VLS_ctx.savingConfig),
        size: "large",
        ...{ class: "save-btn" },
    }));
    const __VLS_194 = __VLS_193({
        ...{ 'onClick': {} },
        type: "success",
        loading: (__VLS_ctx.savingConfig),
        size: "large",
        ...{ class: "save-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    let __VLS_196;
    let __VLS_197;
    let __VLS_198;
    const __VLS_199 = {
        onClick: (__VLS_ctx.handleSaveAIConfig)
    };
    __VLS_195.slots.default;
    const __VLS_200 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({}));
    const __VLS_202 = __VLS_201({}, ...__VLS_functionalComponentArgsRest(__VLS_201));
    __VLS_203.slots.default;
    const __VLS_204 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({}));
    const __VLS_206 = __VLS_205({}, ...__VLS_functionalComponentArgsRest(__VLS_205));
    var __VLS_203;
    var __VLS_195;
    var __VLS_175;
    var __VLS_107;
    var __VLS_87;
}
if (__VLS_ctx.isAdmin) {
    const __VLS_208 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
        name: "vector",
    }));
    const __VLS_210 = __VLS_209({
        name: "vector",
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    __VLS_211.slots.default;
    {
        const { label: __VLS_thisSlot } = __VLS_211.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tab-label" },
        });
        const __VLS_212 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({}));
        const __VLS_214 = __VLS_213({}, ...__VLS_functionalComponentArgsRest(__VLS_213));
        __VLS_215.slots.default;
        const __VLS_216 = {}.Operation;
        /** @type {[typeof __VLS_components.Operation, ]} */ ;
        // @ts-ignore
        const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({}));
        const __VLS_218 = __VLS_217({}, ...__VLS_functionalComponentArgsRest(__VLS_217));
        var __VLS_215;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "settings-content" },
    });
    const __VLS_220 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
        title: "向量数据库状态",
        column: (2),
        border: true,
        ...{ class: "custom-descriptions" },
    }));
    const __VLS_222 = __VLS_221({
        title: "向量数据库状态",
        column: (2),
        border: true,
        ...{ class: "custom-descriptions" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    __VLS_223.slots.default;
    const __VLS_224 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
        label: "已向量化图书",
    }));
    const __VLS_226 = __VLS_225({
        label: "已向量化图书",
    }, ...__VLS_functionalComponentArgsRest(__VLS_225));
    __VLS_227.slots.default;
    (__VLS_ctx.vectorStats.totalVectors);
    var __VLS_227;
    const __VLS_228 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
        label: "覆盖率",
    }));
    const __VLS_230 = __VLS_229({
        label: "覆盖率",
    }, ...__VLS_functionalComponentArgsRest(__VLS_229));
    __VLS_231.slots.default;
    (__VLS_ctx.vectorStats.coverageRate.toFixed(1));
    var __VLS_231;
    var __VLS_223;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vector-actions" },
    });
    const __VLS_232 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.vectorLoading),
        size: "large",
        ...{ class: "vector-btn" },
    }));
    const __VLS_234 = __VLS_233({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.vectorLoading),
        size: "large",
        ...{ class: "vector-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    let __VLS_236;
    let __VLS_237;
    let __VLS_238;
    const __VLS_239 = {
        onClick: (__VLS_ctx.handleBatchCreateVectors)
    };
    __VLS_235.slots.default;
    const __VLS_240 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({}));
    const __VLS_242 = __VLS_241({}, ...__VLS_functionalComponentArgsRest(__VLS_241));
    __VLS_243.slots.default;
    const __VLS_244 = {}.Upload;
    /** @type {[typeof __VLS_components.Upload, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({}));
    const __VLS_246 = __VLS_245({}, ...__VLS_functionalComponentArgsRest(__VLS_245));
    var __VLS_243;
    var __VLS_235;
    const __VLS_248 = {}.ElText;
    /** @type {[typeof __VLS_components.ElText, typeof __VLS_components.elText, typeof __VLS_components.ElText, typeof __VLS_components.elText, ]} */ ;
    // @ts-ignore
    const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
        type: "info",
        ...{ class: "hint-text" },
    }));
    const __VLS_250 = __VLS_249({
        type: "info",
        ...{ class: "hint-text" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_249));
    __VLS_251.slots.default;
    var __VLS_251;
    var __VLS_211;
}
const __VLS_252 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
    name: "about",
}));
const __VLS_254 = __VLS_253({
    name: "about",
}, ...__VLS_functionalComponentArgsRest(__VLS_253));
__VLS_255.slots.default;
{
    const { label: __VLS_thisSlot } = __VLS_255.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tab-label" },
    });
    const __VLS_256 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({}));
    const __VLS_258 = __VLS_257({}, ...__VLS_functionalComponentArgsRest(__VLS_257));
    __VLS_259.slots.default;
    const __VLS_260 = {}.InfoFilled;
    /** @type {[typeof __VLS_components.InfoFilled, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({}));
    const __VLS_262 = __VLS_261({}, ...__VLS_functionalComponentArgsRest(__VLS_261));
    var __VLS_259;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-content about-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "about-logo" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "logo-circle" },
});
const __VLS_264 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
    size: (48),
}));
const __VLS_266 = __VLS_265({
    size: (48),
}, ...__VLS_functionalComponentArgsRest(__VLS_265));
__VLS_267.slots.default;
const __VLS_268 = {}.Reading;
/** @type {[typeof __VLS_components.Reading, ]} */ ;
// @ts-ignore
const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({}));
const __VLS_270 = __VLS_269({}, ...__VLS_functionalComponentArgsRest(__VLS_269));
var __VLS_267;
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
const __VLS_272 = {}.ElTag;
/** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
// @ts-ignore
const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
    size: "large",
    type: "primary",
}));
const __VLS_274 = __VLS_273({
    size: "large",
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_273));
__VLS_275.slots.default;
var __VLS_275;
const __VLS_276 = {}.ElTag;
/** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
// @ts-ignore
const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
    size: "large",
    type: "success",
}));
const __VLS_278 = __VLS_277({
    size: "large",
    type: "success",
}, ...__VLS_functionalComponentArgsRest(__VLS_277));
__VLS_279.slots.default;
var __VLS_279;
const __VLS_280 = {}.ElTag;
/** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
// @ts-ignore
const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
    size: "large",
    type: "info",
}));
const __VLS_282 = __VLS_281({
    size: "large",
    type: "info",
}, ...__VLS_functionalComponentArgsRest(__VLS_281));
__VLS_283.slots.default;
var __VLS_283;
var __VLS_255;
var __VLS_3;
const __VLS_284 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
    modelValue: (__VLS_ctx.showCategoryDialog),
    title: "新增读者种类",
    width: "500px",
    ...{ class: "category-dialog" },
}));
const __VLS_286 = __VLS_285({
    modelValue: (__VLS_ctx.showCategoryDialog),
    title: "新增读者种类",
    width: "500px",
    ...{ class: "category-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_285));
__VLS_287.slots.default;
const __VLS_288 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
    model: (__VLS_ctx.categoryForm),
    labelWidth: "120px",
}));
const __VLS_290 = __VLS_289({
    model: (__VLS_ctx.categoryForm),
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_289));
__VLS_291.slots.default;
const __VLS_292 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
    label: "编码",
}));
const __VLS_294 = __VLS_293({
    label: "编码",
}, ...__VLS_functionalComponentArgsRest(__VLS_293));
__VLS_295.slots.default;
const __VLS_296 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
    modelValue: (__VLS_ctx.categoryForm.code),
}));
const __VLS_298 = __VLS_297({
    modelValue: (__VLS_ctx.categoryForm.code),
}, ...__VLS_functionalComponentArgsRest(__VLS_297));
var __VLS_295;
const __VLS_300 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
    label: "名称",
}));
const __VLS_302 = __VLS_301({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_301));
__VLS_303.slots.default;
const __VLS_304 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
    modelValue: (__VLS_ctx.categoryForm.name),
}));
const __VLS_306 = __VLS_305({
    modelValue: (__VLS_ctx.categoryForm.name),
}, ...__VLS_functionalComponentArgsRest(__VLS_305));
var __VLS_303;
const __VLS_308 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
    label: "最大借阅数",
}));
const __VLS_310 = __VLS_309({
    label: "最大借阅数",
}, ...__VLS_functionalComponentArgsRest(__VLS_309));
__VLS_311.slots.default;
const __VLS_312 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
    modelValue: (__VLS_ctx.categoryForm.max_borrow_count),
    min: (1),
}));
const __VLS_314 = __VLS_313({
    modelValue: (__VLS_ctx.categoryForm.max_borrow_count),
    min: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_313));
var __VLS_311;
const __VLS_316 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
    label: "借阅期限(天)",
}));
const __VLS_318 = __VLS_317({
    label: "借阅期限(天)",
}, ...__VLS_functionalComponentArgsRest(__VLS_317));
__VLS_319.slots.default;
const __VLS_320 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
    modelValue: (__VLS_ctx.categoryForm.max_borrow_days),
    min: (1),
}));
const __VLS_322 = __VLS_321({
    modelValue: (__VLS_ctx.categoryForm.max_borrow_days),
    min: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_321));
var __VLS_319;
const __VLS_324 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
    label: "有效期(天)",
}));
const __VLS_326 = __VLS_325({
    label: "有效期(天)",
}, ...__VLS_functionalComponentArgsRest(__VLS_325));
__VLS_327.slots.default;
const __VLS_328 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
    modelValue: (__VLS_ctx.categoryForm.validity_days),
    min: (1),
}));
const __VLS_330 = __VLS_329({
    modelValue: (__VLS_ctx.categoryForm.validity_days),
    min: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_329));
var __VLS_327;
const __VLS_332 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
    label: "备注",
}));
const __VLS_334 = __VLS_333({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_333));
__VLS_335.slots.default;
const __VLS_336 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
    modelValue: (__VLS_ctx.categoryForm.notes),
    type: "textarea",
}));
const __VLS_338 = __VLS_337({
    modelValue: (__VLS_ctx.categoryForm.notes),
    type: "textarea",
}, ...__VLS_functionalComponentArgsRest(__VLS_337));
var __VLS_335;
var __VLS_291;
{
    const { footer: __VLS_thisSlot } = __VLS_287.slots;
    const __VLS_340 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({
        ...{ 'onClick': {} },
    }));
    const __VLS_342 = __VLS_341({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_341));
    let __VLS_344;
    let __VLS_345;
    let __VLS_346;
    const __VLS_347 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showCategoryDialog = false;
        }
    };
    __VLS_343.slots.default;
    var __VLS_343;
    const __VLS_348 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_350 = __VLS_349({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_349));
    let __VLS_352;
    let __VLS_353;
    let __VLS_354;
    const __VLS_355 = {
        onClick: (__VLS_ctx.handleCreateCategory)
    };
    __VLS_351.slots.default;
    var __VLS_351;
}
var __VLS_287;
/** @type {__VLS_StyleScopedClasses['page-container']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-description']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-label']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-content']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-descriptions']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-label']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-content']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-table']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-label']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-content']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-config-header']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-box']} */ ;
/** @type {__VLS_StyleScopedClasses['pink']} */ ;
/** @type {__VLS_StyleScopedClasses['header-text']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-form']} */ ;
/** @type {__VLS_StyleScopedClasses['test-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['save-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-label']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-content']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-descriptions']} */ ;
/** @type {__VLS_StyleScopedClasses['vector-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['vector-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['hint-text']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-label']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-content']} */ ;
/** @type {__VLS_StyleScopedClasses['about-section']} */ ;
/** @type {__VLS_StyleScopedClasses['about-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['about-title']} */ ;
/** @type {__VLS_StyleScopedClasses['about-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['about-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['category-dialog']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Plus: Plus,
            Upload: Upload,
            Reading: Reading,
            MagicStick: MagicStick,
            InfoFilled: InfoFilled,
            User: User,
            Link: Link,
            Lock: Lock,
            Document: Document,
            ChatDotRound: ChatDotRound,
            Connection: Connection,
            Check: Check,
            Operation: Operation,
            activeTab: activeTab,
            userStore: userStore,
            showCategoryDialog: showCategoryDialog,
            readerCategories: readerCategories,
            testingConnection: testingConnection,
            savingConfig: savingConfig,
            isAdmin: isAdmin,
            getRoleLabel: getRoleLabel,
            categoryForm: categoryForm,
            aiConfigForm: aiConfigForm,
            vectorStats: vectorStats,
            vectorLoading: vectorLoading,
            handleTestConnection: handleTestConnection,
            handleSaveAIConfig: handleSaveAIConfig,
            handleCreateCategory: handleCreateCategory,
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