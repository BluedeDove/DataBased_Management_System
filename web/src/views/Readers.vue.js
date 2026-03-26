/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus } from '@element-plus/icons-vue';
import { readerApi, readerCategoryApi } from '../api/reader.api';
const loading = ref(false);
const readers = ref([]);
const categories = ref([]);
const searchKeyword = ref('');
const showDialog = ref(false);
const editingReader = ref(null);
const formRef = ref();
const form = reactive({
    reader_no: '',
    name: '',
    category_id: undefined,
    gender: 'male',
    id_card: '',
    organization: '',
    phone: '',
    email: '',
    address: '',
    registration_date: new Date().toISOString().split('T')[0],
    status: 'active'
});
const rules = {
    name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
    category_id: [{ required: true, message: '请选择类别', trigger: 'change' }]
};
const loadReaders = async () => {
    loading.value = true;
    try {
        const result = searchKeyword.value
            ? await readerApi.search(searchKeyword.value)
            : await readerApi.getAll();
        if (result.success) {
            readers.value = result.data;
        }
    }
    finally {
        loading.value = false;
    }
};
const loadCategories = async () => {
    const result = await readerCategoryApi.getAll();
    if (result.success) {
        categories.value = result.data;
    }
};
const handleSearch = () => {
    loadReaders();
};
const handleAdd = () => {
    editingReader.value = null;
    Object.assign(form, {
        reader_no: '',
        name: '',
        category_id: undefined,
        gender: 'male',
        id_card: '',
        organization: '',
        phone: '',
        email: '',
        address: '',
        registration_date: new Date().toISOString().split('T')[0],
        status: 'active'
    });
    showDialog.value = true;
};
const handleEdit = (row) => {
    editingReader.value = row;
    Object.assign(form, row);
    showDialog.value = true;
};
const handleRenew = async (row) => {
    try {
        const { value } = await ElMessageBox.prompt('请输入续期天数', '读者证续期', {
            inputValue: '365',
            inputPattern: /^[1-9]\d*$/,
            inputErrorMessage: '请输入正整数'
        });
        const result = await readerApi.renew(row.id, parseInt(value));
        if (result.success) {
            ElMessage.success('续期成功');
            loadReaders();
        }
    }
    catch (error) {
        // 用户取消操作
    }
};
const handleDelete = async (row) => {
    try {
        await ElMessageBox.confirm(`确定要删除读者 "${row.name}" (${row.reader_no}) 吗？如果该读者有未归还的借阅记录，将无法删除。`, '删除确认', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        });
        const result = await readerApi.delete(row.id);
        if (result.success) {
            ElMessage.success('删除成功');
            loadReaders();
        }
        else {
            ElMessage.error(result.error?.message || '删除失败');
        }
    }
    catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(error.message || '删除失败');
        }
    }
};
const handleSubmit = async () => {
    try {
        await formRef.value.validate();
        const plainData = JSON.parse(JSON.stringify(form));
        const result = editingReader.value
            ? await readerApi.update(editingReader.value.id, plainData)
            : await readerApi.create(plainData);
        if (result.success) {
            ElMessage.success(editingReader.value ? '更新成功' : '创建成功');
            showDialog.value = false;
            loadReaders();
        }
        else {
            ElMessage.error(result.error?.message || '操作失败');
        }
    }
    catch (error) {
        // validation error
    }
};
onMounted(() => {
    loadReaders();
    loadCategories();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['custom-table']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-table']} */ ;
/** @type {__VLS_StyleScopedClasses['el-table__body']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button--text']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button--text']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button--primary']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button--text']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button--text']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button--success']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button--text']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button--text']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button--danger']} */ ;
/** @type {__VLS_StyleScopedClasses['reader-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['reader-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['reader-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "page-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "gdut-dot" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "page-description" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toolbar glass-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toolbar-left" },
});
const __VLS_0 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.searchKeyword),
    placeholder: "搜索姓名、编号、电话...",
    ...{ style: {} },
    clearable: true,
    size: "large",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.searchKeyword),
    placeholder: "搜索姓名、编号、电话...",
    ...{ style: {} },
    clearable: true,
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onKeyup: (__VLS_ctx.handleSearch)
};
__VLS_3.slots.default;
{
    const { prefix: __VLS_thisSlot } = __VLS_3.slots;
    const __VLS_8 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
    const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    const __VLS_12 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    var __VLS_11;
}
var __VLS_3;
const __VLS_16 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.Search),
    size: "large",
}));
const __VLS_18 = __VLS_17({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.Search),
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onClick: (__VLS_ctx.handleSearch)
};
__VLS_19.slots.default;
var __VLS_19;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toolbar-right" },
});
const __VLS_24 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.Plus),
    size: "large",
    ...{ class: "add-btn" },
}));
const __VLS_26 = __VLS_25({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.Plus),
    size: "large",
    ...{ class: "add-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
let __VLS_28;
let __VLS_29;
let __VLS_30;
const __VLS_31 = {
    onClick: (__VLS_ctx.handleAdd)
};
__VLS_27.slots.default;
var __VLS_27;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "glass-card table-container" },
});
const __VLS_32 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    data: (__VLS_ctx.readers),
    ...{ style: {} },
    ...{ class: "custom-table" },
}));
const __VLS_34 = __VLS_33({
    data: (__VLS_ctx.readers),
    ...{ style: {} },
    ...{ class: "custom-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
__VLS_35.slots.default;
const __VLS_36 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    type: "index",
    label: "#",
    width: "60",
}));
const __VLS_38 = __VLS_37({
    type: "index",
    label: "#",
    width: "60",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
const __VLS_40 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    prop: "reader_no",
    label: "读者编号",
    width: "120",
}));
const __VLS_42 = __VLS_41({
    prop: "reader_no",
    label: "读者编号",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
const __VLS_44 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    prop: "name",
    label: "姓名",
    width: "120",
}));
const __VLS_46 = __VLS_45({
    prop: "name",
    label: "姓名",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
const __VLS_48 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    prop: "category_name",
    label: "类别",
    width: "100",
}));
const __VLS_50 = __VLS_49({
    prop: "category_name",
    label: "类别",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
const __VLS_52 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    prop: "id_card",
    label: "学号/工号",
    width: "130",
}));
const __VLS_54 = __VLS_53({
    prop: "id_card",
    label: "学号/工号",
    width: "130",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
const __VLS_56 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    prop: "phone",
    label: "电话",
    width: "130",
}));
const __VLS_58 = __VLS_57({
    prop: "phone",
    label: "电话",
    width: "130",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
const __VLS_60 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    prop: "organization",
    label: "单位",
}));
const __VLS_62 = __VLS_61({
    prop: "organization",
    label: "单位",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
const __VLS_64 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    label: "状态",
    width: "100",
}));
const __VLS_66 = __VLS_65({
    label: "状态",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_67.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (row.status === 'active') {
        const __VLS_68 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            type: "success",
        }));
        const __VLS_70 = __VLS_69({
            type: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        __VLS_71.slots.default;
        var __VLS_71;
    }
    else if (row.status === 'suspended') {
        const __VLS_72 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
            type: "danger",
        }));
        const __VLS_74 = __VLS_73({
            type: "danger",
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        __VLS_75.slots.default;
        var __VLS_75;
    }
    else {
        const __VLS_76 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            type: "warning",
        }));
        const __VLS_78 = __VLS_77({
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
        __VLS_79.slots.default;
        var __VLS_79;
    }
}
var __VLS_67;
const __VLS_80 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    label: "操作",
    fixed: "right",
    width: "250",
}));
const __VLS_82 = __VLS_81({
    label: "操作",
    fixed: "right",
    width: "250",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_83.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_84 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
        size: "small",
    }));
    const __VLS_86 = __VLS_85({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    let __VLS_88;
    let __VLS_89;
    let __VLS_90;
    const __VLS_91 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleEdit(row);
        }
    };
    __VLS_87.slots.default;
    var __VLS_87;
    const __VLS_92 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        ...{ 'onClick': {} },
        type: "success",
        link: true,
        size: "small",
    }));
    const __VLS_94 = __VLS_93({
        ...{ 'onClick': {} },
        type: "success",
        link: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    let __VLS_96;
    let __VLS_97;
    let __VLS_98;
    const __VLS_99 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleRenew(row);
        }
    };
    __VLS_95.slots.default;
    var __VLS_95;
    const __VLS_100 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        ...{ 'onClick': {} },
        type: "danger",
        link: true,
        size: "small",
    }));
    const __VLS_102 = __VLS_101({
        ...{ 'onClick': {} },
        type: "danger",
        link: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    let __VLS_104;
    let __VLS_105;
    let __VLS_106;
    const __VLS_107 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleDelete(row);
        }
    };
    __VLS_103.slots.default;
    var __VLS_103;
}
var __VLS_83;
var __VLS_35;
const __VLS_108 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    modelValue: (__VLS_ctx.showDialog),
    title: "读者信息",
    width: "600px",
    ...{ class: "reader-dialog" },
}));
const __VLS_110 = __VLS_109({
    modelValue: (__VLS_ctx.showDialog),
    title: "读者信息",
    width: "600px",
    ...{ class: "reader-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
__VLS_111.slots.default;
const __VLS_112 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "100px",
}));
const __VLS_114 = __VLS_113({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "100px",
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_116 = {};
__VLS_115.slots.default;
const __VLS_118 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
    label: "读者编号",
    prop: "reader_no",
}));
const __VLS_120 = __VLS_119({
    label: "读者编号",
    prop: "reader_no",
}, ...__VLS_functionalComponentArgsRest(__VLS_119));
__VLS_121.slots.default;
const __VLS_122 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
    modelValue: (__VLS_ctx.form.reader_no),
    disabled: (!!__VLS_ctx.editingReader),
    placeholder: "留空或输入AUTO自动生成",
}));
const __VLS_124 = __VLS_123({
    modelValue: (__VLS_ctx.form.reader_no),
    disabled: (!!__VLS_ctx.editingReader),
    placeholder: "留空或输入AUTO自动生成",
}, ...__VLS_functionalComponentArgsRest(__VLS_123));
var __VLS_121;
const __VLS_126 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
    label: "姓名",
    prop: "name",
}));
const __VLS_128 = __VLS_127({
    label: "姓名",
    prop: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_127));
__VLS_129.slots.default;
const __VLS_130 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
    modelValue: (__VLS_ctx.form.name),
}));
const __VLS_132 = __VLS_131({
    modelValue: (__VLS_ctx.form.name),
}, ...__VLS_functionalComponentArgsRest(__VLS_131));
var __VLS_129;
const __VLS_134 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
    label: "类别",
    prop: "category_id",
}));
const __VLS_136 = __VLS_135({
    label: "类别",
    prop: "category_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_135));
__VLS_137.slots.default;
const __VLS_138 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_139 = __VLS_asFunctionalComponent(__VLS_138, new __VLS_138({
    modelValue: (__VLS_ctx.form.category_id),
    ...{ style: {} },
}));
const __VLS_140 = __VLS_139({
    modelValue: (__VLS_ctx.form.category_id),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_139));
__VLS_141.slots.default;
for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
    const __VLS_142 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_143 = __VLS_asFunctionalComponent(__VLS_142, new __VLS_142({
        key: (cat.id),
        label: (cat.name),
        value: (cat.id),
    }));
    const __VLS_144 = __VLS_143({
        key: (cat.id),
        label: (cat.name),
        value: (cat.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_143));
}
var __VLS_141;
var __VLS_137;
const __VLS_146 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
    label: "学号/工号",
    prop: "id_card",
}));
const __VLS_148 = __VLS_147({
    label: "学号/工号",
    prop: "id_card",
}, ...__VLS_functionalComponentArgsRest(__VLS_147));
__VLS_149.slots.default;
const __VLS_150 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
    modelValue: (__VLS_ctx.form.id_card),
    placeholder: "请输入学号或工号",
}));
const __VLS_152 = __VLS_151({
    modelValue: (__VLS_ctx.form.id_card),
    placeholder: "请输入学号或工号",
}, ...__VLS_functionalComponentArgsRest(__VLS_151));
var __VLS_149;
const __VLS_154 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_155 = __VLS_asFunctionalComponent(__VLS_154, new __VLS_154({
    label: "性别",
}));
const __VLS_156 = __VLS_155({
    label: "性别",
}, ...__VLS_functionalComponentArgsRest(__VLS_155));
__VLS_157.slots.default;
const __VLS_158 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({
    modelValue: (__VLS_ctx.form.gender),
}));
const __VLS_160 = __VLS_159({
    modelValue: (__VLS_ctx.form.gender),
}, ...__VLS_functionalComponentArgsRest(__VLS_159));
__VLS_161.slots.default;
const __VLS_162 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_163 = __VLS_asFunctionalComponent(__VLS_162, new __VLS_162({
    label: "male",
}));
const __VLS_164 = __VLS_163({
    label: "male",
}, ...__VLS_functionalComponentArgsRest(__VLS_163));
__VLS_165.slots.default;
var __VLS_165;
const __VLS_166 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_167 = __VLS_asFunctionalComponent(__VLS_166, new __VLS_166({
    label: "female",
}));
const __VLS_168 = __VLS_167({
    label: "female",
}, ...__VLS_functionalComponentArgsRest(__VLS_167));
__VLS_169.slots.default;
var __VLS_169;
const __VLS_170 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({
    label: "other",
}));
const __VLS_172 = __VLS_171({
    label: "other",
}, ...__VLS_functionalComponentArgsRest(__VLS_171));
__VLS_173.slots.default;
var __VLS_173;
var __VLS_161;
var __VLS_157;
const __VLS_174 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_175 = __VLS_asFunctionalComponent(__VLS_174, new __VLS_174({
    label: "单位",
}));
const __VLS_176 = __VLS_175({
    label: "单位",
}, ...__VLS_functionalComponentArgsRest(__VLS_175));
__VLS_177.slots.default;
const __VLS_178 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_179 = __VLS_asFunctionalComponent(__VLS_178, new __VLS_178({
    modelValue: (__VLS_ctx.form.organization),
}));
const __VLS_180 = __VLS_179({
    modelValue: (__VLS_ctx.form.organization),
}, ...__VLS_functionalComponentArgsRest(__VLS_179));
var __VLS_177;
const __VLS_182 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({
    label: "电话",
}));
const __VLS_184 = __VLS_183({
    label: "电话",
}, ...__VLS_functionalComponentArgsRest(__VLS_183));
__VLS_185.slots.default;
const __VLS_186 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({
    modelValue: (__VLS_ctx.form.phone),
}));
const __VLS_188 = __VLS_187({
    modelValue: (__VLS_ctx.form.phone),
}, ...__VLS_functionalComponentArgsRest(__VLS_187));
var __VLS_185;
const __VLS_190 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_191 = __VLS_asFunctionalComponent(__VLS_190, new __VLS_190({
    label: "邮箱",
}));
const __VLS_192 = __VLS_191({
    label: "邮箱",
}, ...__VLS_functionalComponentArgsRest(__VLS_191));
__VLS_193.slots.default;
const __VLS_194 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_195 = __VLS_asFunctionalComponent(__VLS_194, new __VLS_194({
    modelValue: (__VLS_ctx.form.email),
}));
const __VLS_196 = __VLS_195({
    modelValue: (__VLS_ctx.form.email),
}, ...__VLS_functionalComponentArgsRest(__VLS_195));
var __VLS_193;
const __VLS_198 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_199 = __VLS_asFunctionalComponent(__VLS_198, new __VLS_198({
    label: "地址",
}));
const __VLS_200 = __VLS_199({
    label: "地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_199));
__VLS_201.slots.default;
const __VLS_202 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_203 = __VLS_asFunctionalComponent(__VLS_202, new __VLS_202({
    modelValue: (__VLS_ctx.form.address),
    type: "textarea",
}));
const __VLS_204 = __VLS_203({
    modelValue: (__VLS_ctx.form.address),
    type: "textarea",
}, ...__VLS_functionalComponentArgsRest(__VLS_203));
var __VLS_201;
var __VLS_115;
{
    const { footer: __VLS_thisSlot } = __VLS_111.slots;
    const __VLS_206 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_207 = __VLS_asFunctionalComponent(__VLS_206, new __VLS_206({
        ...{ 'onClick': {} },
    }));
    const __VLS_208 = __VLS_207({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_207));
    let __VLS_210;
    let __VLS_211;
    let __VLS_212;
    const __VLS_213 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showDialog = false;
        }
    };
    __VLS_209.slots.default;
    var __VLS_209;
    const __VLS_214 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_215 = __VLS_asFunctionalComponent(__VLS_214, new __VLS_214({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_216 = __VLS_215({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_215));
    let __VLS_218;
    let __VLS_219;
    let __VLS_220;
    const __VLS_221 = {
        onClick: (__VLS_ctx.handleSubmit)
    };
    __VLS_217.slots.default;
    var __VLS_217;
}
var __VLS_111;
/** @type {__VLS_StyleScopedClasses['page-container']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['header-group']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['gdut-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['page-description']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-left']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-right']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-container']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-table']} */ ;
/** @type {__VLS_StyleScopedClasses['reader-dialog']} */ ;
// @ts-ignore
var __VLS_117 = __VLS_116;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Search: Search,
            Plus: Plus,
            loading: loading,
            readers: readers,
            categories: categories,
            searchKeyword: searchKeyword,
            showDialog: showDialog,
            editingReader: editingReader,
            formRef: formRef,
            form: form,
            rules: rules,
            handleSearch: handleSearch,
            handleAdd: handleAdd,
            handleEdit: handleEdit,
            handleRenew: handleRenew,
            handleDelete: handleDelete,
            handleSubmit: handleSubmit,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=Readers.vue.js.map