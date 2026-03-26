/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive, onMounted, computed } from 'vue';
import { Filter } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useUserStore } from '@/store/user';
import { bookApi, bookCategoryApi } from '../api/book.api';
import { borrowingApi } from '../api/borrowing.api';
import { aiApi } from '../api/ai.api';
import { searchApi, exportApi } from '../api/other.api';
const userStore = useUserStore();
const canManage = computed(() => ['admin', 'librarian'].includes(userStore.user?.role || ''));
const bookList = ref([]);
const total = ref(0);
const searchQuery = ref('');
const category = ref(null);
const loading = ref(false);
const borrowing = ref(new Set());
// 高级搜索
const advancedSearchVisible = ref(false);
const searchType = ref('regex');
const regexError = ref('');
const advancedForm = reactive({
    category_id: null,
    pattern: '',
    searchMode: 'contains',
    fields: ['title', 'author'],
    sql: '',
    vectorQuery: ''
});
// 获取搜索占位符文本
const getSearchPlaceholder = () => {
    switch (advancedForm.searchMode) {
        case 'contains':
            return '输入要包含的文本，如：Python';
        case 'exact':
            return '输入要精确匹配的文本，如：Python';
        case 'startsWith':
            return '输入开头文本，如：Java';
        case 'endsWith':
            return '输入结尾文本，如：编程';
        case 'regex':
            return '输入正则表达式，如：^Java.*Script$';
        default:
            return '输入搜索内容';
    }
};
// 验证正则表达式
const validateRegexPattern = () => {
    if (advancedForm.searchMode === 'regex' && advancedForm.pattern) {
        try {
            new RegExp(advancedForm.pattern);
            regexError.value = '';
        }
        catch (e) {
            regexError.value = `无效的正则表达式: ${e.message}`;
        }
    }
    else {
        regexError.value = '';
    }
};
// 编辑图书
const editVisible = ref(false);
const currentBook = ref({});
// 新增图书
const addVisible = ref(false);
const addForm = reactive({
    title: '',
    author: '',
    publisher: '',
    isbn: 'AUTO',
    category_id: null,
    price: null,
    total_quantity: 1
});
const categories = ref([]);
const addLoading = ref(false);
// 导出数据
const exportVisible = ref(false);
const exportFormat = ref('csv');
const exportLoading = ref(false);
// 初始加载
onMounted(() => {
    fetchData();
    fetchCategories();
});
const handleReset = () => {
    searchQuery.value = '';
    category.value = null;
    advancedForm.category_id = null;
    advancedForm.pattern = '';
    advancedForm.searchMode = 'contains';
    advancedForm.sql = '';
    advancedForm.vectorQuery = '';
    regexError.value = '';
    advancedSearchVisible.value = false;
    fetchData();
};
const fetchData = async () => {
    loading.value = true;
    try {
        const result = await bookApi.getAll({ keyword: searchQuery.value });
        if (result.success) {
            bookList.value = result.data.map((book) => ({
                ...book,
                book_title: book.title,
                category: book.category_name || '通用',
            }));
            total.value = result.data.length;
        }
        else {
            ElMessage.error(result.error?.message || '获取图书失败');
        }
    }
    catch (error) {
        ElMessage.error('加载失败');
    }
    finally {
        loading.value = false;
    }
};
const handleAdvancedSearch = async () => {
    loading.value = true;
    try {
        let result;
        if (searchType.value === 'regex') {
            if (advancedForm.searchMode === 'regex' && advancedForm.pattern) {
                try {
                    new RegExp(advancedForm.pattern);
                    regexError.value = '';
                }
                catch (e) {
                    regexError.value = `无效的正则表达式: ${e.message}`;
                    ElMessage.error(`无效的正则表达式: ${e.message}`);
                    loading.value = false;
                    return;
                }
            }
            const fields = Array.isArray(advancedForm.fields)
                ? [...advancedForm.fields]
                : ['title', 'author'];
            result = await bookApi.regexSearch(advancedForm.pattern, fields, advancedForm.category_id, advancedForm.searchMode);
        }
        else if (searchType.value === 'sql') {
            result = await searchApi.executeSql(advancedForm.sql);
        }
        else if (searchType.value === 'vector') {
            result = await aiApi.semanticSearch(advancedForm.vectorQuery, 20);
        }
        if (result && result.success) {
            let data = result.data;
            bookList.value = data.map((book) => ({
                ...book,
                book_title: book.title || book.book_title,
                category: book.category_name || '未知',
                isbn: book.isbn || '-',
                total_quantity: book.total_quantity || 0,
                available_quantity: book.available_quantity || 0
            }));
            total.value = data.length;
            ElMessage.success(`搜索到 ${data.length} 条结果`);
            advancedSearchVisible.value = false;
        }
        else {
            ElMessage.error(result?.error?.message || '搜索失败');
        }
    }
    catch (error) {
        console.error(error);
        if (error.message && error.message.includes('无效的正则表达式')) {
            regexError.value = error.message;
            ElMessage.error(error.message);
        }
        else {
            ElMessage.error('搜索失败: ' + (error.message || '未知错误'));
        }
    }
    finally {
        loading.value = false;
    }
};
// 高亮显示
const highlightText = (text) => {
    if (!text)
        return '';
    if (searchType.value === 'regex' && advancedForm.pattern) {
        try {
            let pattern = advancedForm.pattern;
            switch (advancedForm.searchMode) {
                case 'exact':
                    pattern = `^${escapeRegex(pattern)}$`;
                    break;
                case 'startsWith':
                    pattern = `^${escapeRegex(pattern)}`;
                    break;
                case 'endsWith':
                    pattern = `${escapeRegex(pattern)}$`;
                    break;
                case 'contains':
                    pattern = escapeRegex(pattern);
                    break;
                case 'regex':
                    break;
            }
            const regex = new RegExp(`(${pattern})`, 'gi');
            return text.replace(regex, '<span style="background-color: #fef08a; color: #854d0e">$1</span>');
        }
        catch (e) {
            return text;
        }
    }
    if (searchQuery.value) {
        try {
            const regex = new RegExp(`(${escapeRegex(searchQuery.value)})`, 'gi');
            return text.replace(regex, '<span style="background-color: #fef08a; color: #854d0e">$1</span>');
        }
        catch (e) {
            return text;
        }
    }
    return text;
};
const escapeRegex = (pattern) => {
    return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
const handleAdd = () => {
    addVisible.value = true;
};
const fetchCategories = async () => {
    try {
        const result = await bookCategoryApi.getAll();
        if (result.success) {
            categories.value = result.data;
        }
    }
    catch (error) {
        console.error('获取图书类别失败:', error);
    }
};
const handleAddSubmit = async () => {
    if (!addForm.title || !addForm.author || !addForm.publisher || !addForm.category_id || !addForm.total_quantity) {
        ElMessage.error('请填写所有必填字段');
        return;
    }
    addLoading.value = true;
    try {
        const result = await bookApi.create({
            title: addForm.title,
            author: addForm.author,
            publisher: addForm.publisher,
            isbn: addForm.isbn,
            category_id: addForm.category_id,
            price: addForm.price,
            total_quantity: addForm.total_quantity,
            available_quantity: addForm.total_quantity,
            status: 'normal',
            registration_date: new Date().toISOString().split('T')[0]
        });
        if (result.success) {
            ElMessage.success('图书添加成功');
            addVisible.value = false;
            Object.assign(addForm, {
                title: '',
                author: '',
                publisher: '',
                isbn: 'AUTO',
                category_id: null,
                price: null,
                total_quantity: 1
            });
            fetchData();
        }
        else {
            ElMessage.error(result.error?.message || '添加失败');
        }
    }
    catch (error) {
        ElMessage.error('操作失败');
    }
    finally {
        addLoading.value = false;
    }
};
const handleExportClick = () => {
    exportVisible.value = true;
};
const handleExport = async () => {
    exportLoading.value = true;
    try {
        let blob;
        if (exportFormat.value === 'csv') {
            blob = await exportApi.booksToCSV();
        }
        else {
            blob = await exportApi.booksToJSON();
        }
        // Download the file
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `books.${exportFormat.value}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        ElMessage.success('导出成功！');
        exportVisible.value = false;
    }
    catch (error) {
        ElMessage.error('导出失败');
    }
    finally {
        exportLoading.value = false;
    }
};
const handleEdit = (book) => {
    currentBook.value = { ...book, title: book.book_title };
    editVisible.value = true;
};
const saveEdit = async () => {
    try {
        const updates = {
            title: currentBook.value.title,
            author: currentBook.value.author,
            publisher: currentBook.value.publisher,
            price: currentBook.value.price,
            total_quantity: currentBook.value.total_quantity
        };
        const result = await bookApi.update(currentBook.value.id, updates);
        if (result.success) {
            ElMessage.success('更新成功');
            editVisible.value = false;
            fetchData();
        }
        else {
            ElMessage.error('更新失败');
        }
    }
    catch (e) {
        ElMessage.error('操作失败');
    }
};
const handleDelete = async (book) => {
    try {
        await ElMessageBox.confirm('确定要下架这本图书吗？如果有借出记录将无法删除。', '提示', { type: 'warning' });
        const result = await bookApi.delete(book.id);
        if (result.success) {
            ElMessage.success('删除成功');
            fetchData();
        }
        else {
            ElMessage.error(result.error?.message || '删除失败');
        }
    }
    catch (e) {
        if (e !== 'cancel')
            ElMessage.error('操作失败');
    }
};
const handleUserBorrow = async (book) => {
    if (!userStore.user?.id) {
        ElMessage.warning('请先登录');
        return;
    }
    if (book.available_quantity <= 0) {
        ElMessage.warning('该图书暂时无可借库存');
        return;
    }
    if (!userStore.user.reader_id) {
        ElMessage.info('管理员和图书管理员请使用专门的借阅管理页面进行借阅操作');
        return;
    }
    if (borrowing.value.has(book.id)) {
        ElMessage.warning('正在借阅中，请稍候...');
        return;
    }
    try {
        borrowing.value.add(book.id);
        const result = await borrowingApi.borrow(userStore.user.reader_id, book.id);
        if (result.success) {
            ElMessage.success(`借阅成功：《${book.book_title}》`);
            await fetchData();
        }
        else {
            const errorMsg = result.error?.message || '借阅失败';
            if (errorMsg.includes('暂无可借图书')) {
                ElMessage.error('该图书暂时无可借库存，请稍后再试');
            }
            else if (errorMsg.includes('已达到最大借阅数量')) {
                ElMessage.error('您已达到最大借阅数量，请先归还部分图书');
            }
            else if (errorMsg.includes('逾期未还')) {
                ElMessage.error('您有图书逾期未还，请先归还逾期图书');
            }
            else {
                ElMessage.error(errorMsg);
            }
        }
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('暂无可借图书')) {
            ElMessage.error('该图书暂时无可借库存，请稍后再试');
        }
        else if (errorMsg.includes('已达到最大借阅数量')) {
            ElMessage.error('您已达到最大借阅数量，请先归还部分图书');
        }
        else if (errorMsg.includes('逾期未还')) {
            ElMessage.error('您有图书逾期未还，请先归还逾期图书');
        }
        else {
            ElMessage.error('借阅操作失败: ' + errorMsg);
        }
    }
    finally {
        borrowing.value.delete(book.id);
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['book-cover-icon']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "action-bar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "title-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "page-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "gdut-decoration" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "sub-text" },
});
(__VLS_ctx.total);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "actions" },
});
if (__VLS_ctx.canManage) {
    const __VLS_0 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        icon: "Plus",
        ...{ class: "glow-btn" },
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        icon: "Plus",
        ...{ class: "glow-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onClick: (__VLS_ctx.handleAdd)
    };
    __VLS_3.slots.default;
    var __VLS_3;
}
const __VLS_8 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
    icon: "Download",
    size: "large",
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    icon: "Download",
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onClick: (__VLS_ctx.handleExportClick)
};
__VLS_11.slots.default;
var __VLS_11;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "glass-card search-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "search-row" },
});
const __VLS_16 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onClear': {} },
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.searchQuery),
    placeholder: "搜索书名、ISBN或作者...",
    prefixIcon: "Search",
    size: "large",
    ...{ class: "main-search" },
    clearable: true,
}));
const __VLS_18 = __VLS_17({
    ...{ 'onClear': {} },
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.searchQuery),
    placeholder: "搜索书名、ISBN或作者...",
    prefixIcon: "Search",
    size: "large",
    ...{ class: "main-search" },
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onClear: (__VLS_ctx.fetchData)
};
const __VLS_24 = {
    onKeyup: (__VLS_ctx.fetchData)
};
var __VLS_19;
const __VLS_25 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.category),
    placeholder: "图书类别",
    size: "large",
    ...{ style: {} },
    clearable: true,
}));
const __VLS_27 = __VLS_26({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.category),
    placeholder: "图书类别",
    size: "large",
    ...{ style: {} },
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
let __VLS_29;
let __VLS_30;
let __VLS_31;
const __VLS_32 = {
    onChange: (__VLS_ctx.fetchData)
};
__VLS_28.slots.default;
const __VLS_33 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    label: "全部",
    value: (null),
}));
const __VLS_35 = __VLS_34({
    label: "全部",
    value: (null),
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
    const __VLS_37 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
        key: (cat.id),
        label: (cat.name),
        value: (cat.id),
    }));
    const __VLS_39 = __VLS_38({
        key: (cat.id),
        label: (cat.name),
        value: (cat.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_38));
}
var __VLS_28;
const __VLS_41 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
}));
const __VLS_43 = __VLS_42({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_42));
let __VLS_45;
let __VLS_46;
let __VLS_47;
const __VLS_48 = {
    onClick: (__VLS_ctx.fetchData)
};
__VLS_44.slots.default;
var __VLS_44;
const __VLS_49 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.Filter),
    size: "large",
}));
const __VLS_51 = __VLS_50({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.Filter),
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
let __VLS_53;
let __VLS_54;
let __VLS_55;
const __VLS_56 = {
    onClick: (...[$event]) => {
        __VLS_ctx.advancedSearchVisible = true;
    }
};
__VLS_52.slots.default;
var __VLS_52;
const __VLS_57 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
    ...{ 'onClick': {} },
    size: "large",
    plain: true,
}));
const __VLS_59 = __VLS_58({
    ...{ 'onClick': {} },
    size: "large",
    plain: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_58));
let __VLS_61;
let __VLS_62;
let __VLS_63;
const __VLS_64 = {
    onClick: (__VLS_ctx.handleReset)
};
__VLS_60.slots.default;
var __VLS_60;
const __VLS_65 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_66 = __VLS_asFunctionalComponent(__VLS_65, new __VLS_65({
    modelValue: (__VLS_ctx.advancedSearchVisible),
    title: "高级搜索",
    width: "600px",
    destroyOnClose: true,
}));
const __VLS_67 = __VLS_66({
    modelValue: (__VLS_ctx.advancedSearchVisible),
    title: "高级搜索",
    width: "600px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_66));
__VLS_68.slots.default;
const __VLS_69 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({
    modelValue: (__VLS_ctx.searchType),
}));
const __VLS_71 = __VLS_70({
    modelValue: (__VLS_ctx.searchType),
}, ...__VLS_functionalComponentArgsRest(__VLS_70));
__VLS_72.slots.default;
const __VLS_73 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
    label: "正则匹配",
    name: "regex",
}));
const __VLS_75 = __VLS_74({
    label: "正则匹配",
    name: "regex",
}, ...__VLS_functionalComponentArgsRest(__VLS_74));
__VLS_76.slots.default;
const __VLS_77 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_78 = __VLS_asFunctionalComponent(__VLS_77, new __VLS_77({
    labelPosition: "top",
}));
const __VLS_79 = __VLS_78({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_78));
__VLS_80.slots.default;
const __VLS_81 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({
    label: "图书类别",
}));
const __VLS_83 = __VLS_82({
    label: "图书类别",
}, ...__VLS_functionalComponentArgsRest(__VLS_82));
__VLS_84.slots.default;
const __VLS_85 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({
    modelValue: (__VLS_ctx.advancedForm.category_id),
    placeholder: "选择类别",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_87 = __VLS_86({
    modelValue: (__VLS_ctx.advancedForm.category_id),
    placeholder: "选择类别",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_86));
__VLS_88.slots.default;
for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
    const __VLS_89 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({
        key: (cat.id),
        label: (cat.name),
        value: (cat.id),
    }));
    const __VLS_91 = __VLS_90({
        key: (cat.id),
        label: (cat.name),
        value: (cat.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_90));
}
var __VLS_88;
var __VLS_84;
const __VLS_93 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({
    label: "搜索模式",
}));
const __VLS_95 = __VLS_94({
    label: "搜索模式",
}, ...__VLS_functionalComponentArgsRest(__VLS_94));
__VLS_96.slots.default;
const __VLS_97 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({
    modelValue: (__VLS_ctx.advancedForm.searchMode),
    ...{ style: {} },
}));
const __VLS_99 = __VLS_98({
    modelValue: (__VLS_ctx.advancedForm.searchMode),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_98));
__VLS_100.slots.default;
const __VLS_101 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_102 = __VLS_asFunctionalComponent(__VLS_101, new __VLS_101({
    label: "包含匹配",
    value: "contains",
}));
const __VLS_103 = __VLS_102({
    label: "包含匹配",
    value: "contains",
}, ...__VLS_functionalComponentArgsRest(__VLS_102));
const __VLS_105 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_106 = __VLS_asFunctionalComponent(__VLS_105, new __VLS_105({
    label: "精确匹配",
    value: "exact",
}));
const __VLS_107 = __VLS_106({
    label: "精确匹配",
    value: "exact",
}, ...__VLS_functionalComponentArgsRest(__VLS_106));
const __VLS_109 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_110 = __VLS_asFunctionalComponent(__VLS_109, new __VLS_109({
    label: "前缀匹配",
    value: "startsWith",
}));
const __VLS_111 = __VLS_110({
    label: "前缀匹配",
    value: "startsWith",
}, ...__VLS_functionalComponentArgsRest(__VLS_110));
const __VLS_113 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_114 = __VLS_asFunctionalComponent(__VLS_113, new __VLS_113({
    label: "后缀匹配",
    value: "endsWith",
}));
const __VLS_115 = __VLS_114({
    label: "后缀匹配",
    value: "endsWith",
}, ...__VLS_functionalComponentArgsRest(__VLS_114));
const __VLS_117 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_118 = __VLS_asFunctionalComponent(__VLS_117, new __VLS_117({
    label: "正则表达式",
    value: "regex",
}));
const __VLS_119 = __VLS_118({
    label: "正则表达式",
    value: "regex",
}, ...__VLS_functionalComponentArgsRest(__VLS_118));
var __VLS_100;
var __VLS_96;
const __VLS_121 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_122 = __VLS_asFunctionalComponent(__VLS_121, new __VLS_121({
    label: "搜索内容",
}));
const __VLS_123 = __VLS_122({
    label: "搜索内容",
}, ...__VLS_functionalComponentArgsRest(__VLS_122));
__VLS_124.slots.default;
const __VLS_125 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_126 = __VLS_asFunctionalComponent(__VLS_125, new __VLS_125({
    ...{ 'onInput': {} },
    modelValue: (__VLS_ctx.advancedForm.pattern),
    placeholder: (__VLS_ctx.getSearchPlaceholder()),
    clearable: true,
}));
const __VLS_127 = __VLS_126({
    ...{ 'onInput': {} },
    modelValue: (__VLS_ctx.advancedForm.pattern),
    placeholder: (__VLS_ctx.getSearchPlaceholder()),
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_126));
let __VLS_129;
let __VLS_130;
let __VLS_131;
const __VLS_132 = {
    onInput: (__VLS_ctx.validateRegexPattern)
};
var __VLS_128;
if (__VLS_ctx.regexError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
    (__VLS_ctx.regexError);
}
if (__VLS_ctx.advancedForm.searchMode === 'regex') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
}
var __VLS_124;
const __VLS_133 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_134 = __VLS_asFunctionalComponent(__VLS_133, new __VLS_133({
    label: "匹配字段",
}));
const __VLS_135 = __VLS_134({
    label: "匹配字段",
}, ...__VLS_functionalComponentArgsRest(__VLS_134));
__VLS_136.slots.default;
const __VLS_137 = {}.ElCheckboxGroup;
/** @type {[typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ]} */ ;
// @ts-ignore
const __VLS_138 = __VLS_asFunctionalComponent(__VLS_137, new __VLS_137({
    modelValue: (__VLS_ctx.advancedForm.fields),
}));
const __VLS_139 = __VLS_138({
    modelValue: (__VLS_ctx.advancedForm.fields),
}, ...__VLS_functionalComponentArgsRest(__VLS_138));
__VLS_140.slots.default;
const __VLS_141 = {}.ElCheckbox;
/** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
// @ts-ignore
const __VLS_142 = __VLS_asFunctionalComponent(__VLS_141, new __VLS_141({
    label: "title",
}));
const __VLS_143 = __VLS_142({
    label: "title",
}, ...__VLS_functionalComponentArgsRest(__VLS_142));
__VLS_144.slots.default;
var __VLS_144;
const __VLS_145 = {}.ElCheckbox;
/** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
// @ts-ignore
const __VLS_146 = __VLS_asFunctionalComponent(__VLS_145, new __VLS_145({
    label: "author",
}));
const __VLS_147 = __VLS_146({
    label: "author",
}, ...__VLS_functionalComponentArgsRest(__VLS_146));
__VLS_148.slots.default;
var __VLS_148;
const __VLS_149 = {}.ElCheckbox;
/** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
// @ts-ignore
const __VLS_150 = __VLS_asFunctionalComponent(__VLS_149, new __VLS_149({
    label: "isbn",
}));
const __VLS_151 = __VLS_150({
    label: "isbn",
}, ...__VLS_functionalComponentArgsRest(__VLS_150));
__VLS_152.slots.default;
var __VLS_152;
var __VLS_140;
var __VLS_136;
var __VLS_80;
var __VLS_76;
const __VLS_153 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_154 = __VLS_asFunctionalComponent(__VLS_153, new __VLS_153({
    label: "语义检索",
    name: "vector",
}));
const __VLS_155 = __VLS_154({
    label: "语义检索",
    name: "vector",
}, ...__VLS_functionalComponentArgsRest(__VLS_154));
__VLS_156.slots.default;
const __VLS_157 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_158 = __VLS_asFunctionalComponent(__VLS_157, new __VLS_157({
    labelPosition: "top",
}));
const __VLS_159 = __VLS_158({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_158));
__VLS_160.slots.default;
const __VLS_161 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_162 = __VLS_asFunctionalComponent(__VLS_161, new __VLS_161({
    label: "自然语言描述",
}));
const __VLS_163 = __VLS_162({
    label: "自然语言描述",
}, ...__VLS_functionalComponentArgsRest(__VLS_162));
__VLS_164.slots.default;
const __VLS_165 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_166 = __VLS_asFunctionalComponent(__VLS_165, new __VLS_165({
    modelValue: (__VLS_ctx.advancedForm.vectorQuery),
    type: "textarea",
    rows: "3",
    placeholder: "例如: 适合初学者的Python编程书籍，最好有实战案例",
}));
const __VLS_167 = __VLS_166({
    modelValue: (__VLS_ctx.advancedForm.vectorQuery),
    type: "textarea",
    rows: "3",
    placeholder: "例如: 适合初学者的Python编程书籍，最好有实战案例",
}, ...__VLS_functionalComponentArgsRest(__VLS_166));
var __VLS_164;
var __VLS_160;
var __VLS_156;
const __VLS_169 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_170 = __VLS_asFunctionalComponent(__VLS_169, new __VLS_169({
    label: "SQL查询",
    name: "sql",
}));
const __VLS_171 = __VLS_170({
    label: "SQL查询",
    name: "sql",
}, ...__VLS_functionalComponentArgsRest(__VLS_170));
__VLS_172.slots.default;
const __VLS_173 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_174 = __VLS_asFunctionalComponent(__VLS_173, new __VLS_173({
    labelPosition: "top",
}));
const __VLS_175 = __VLS_174({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_174));
__VLS_176.slots.default;
const __VLS_177 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_178 = __VLS_asFunctionalComponent(__VLS_177, new __VLS_177({
    label: "SQL WHERE 子句",
}));
const __VLS_179 = __VLS_178({
    label: "SQL WHERE 子句",
}, ...__VLS_functionalComponentArgsRest(__VLS_178));
__VLS_180.slots.default;
const __VLS_181 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_182 = __VLS_asFunctionalComponent(__VLS_181, new __VLS_181({
    modelValue: (__VLS_ctx.advancedForm.sql),
    type: "textarea",
    rows: "3",
    placeholder: "例如: SELECT * FROM books WHERE price > 50 AND available_quantity > 0",
}));
const __VLS_183 = __VLS_182({
    modelValue: (__VLS_ctx.advancedForm.sql),
    type: "textarea",
    rows: "3",
    placeholder: "例如: SELECT * FROM books WHERE price > 50 AND available_quantity > 0",
}, ...__VLS_functionalComponentArgsRest(__VLS_182));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ style: {} },
});
var __VLS_180;
var __VLS_176;
var __VLS_172;
var __VLS_72;
{
    const { footer: __VLS_thisSlot } = __VLS_68.slots;
    const __VLS_185 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_186 = __VLS_asFunctionalComponent(__VLS_185, new __VLS_185({
        ...{ 'onClick': {} },
    }));
    const __VLS_187 = __VLS_186({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_186));
    let __VLS_189;
    let __VLS_190;
    let __VLS_191;
    const __VLS_192 = {
        onClick: (...[$event]) => {
            __VLS_ctx.advancedSearchVisible = false;
        }
    };
    __VLS_188.slots.default;
    var __VLS_188;
    const __VLS_193 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_194 = __VLS_asFunctionalComponent(__VLS_193, new __VLS_193({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.loading),
    }));
    const __VLS_195 = __VLS_194({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.loading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_194));
    let __VLS_197;
    let __VLS_198;
    let __VLS_199;
    const __VLS_200 = {
        onClick: (__VLS_ctx.handleAdvancedSearch)
    };
    __VLS_196.slots.default;
    var __VLS_196;
    const __VLS_201 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_202 = __VLS_asFunctionalComponent(__VLS_201, new __VLS_201({
        ...{ 'onClick': {} },
    }));
    const __VLS_203 = __VLS_202({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_202));
    let __VLS_205;
    let __VLS_206;
    let __VLS_207;
    const __VLS_208 = {
        onClick: (__VLS_ctx.handleReset)
    };
    __VLS_204.slots.default;
    var __VLS_204;
}
var __VLS_68;
const __VLS_209 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_210 = __VLS_asFunctionalComponent(__VLS_209, new __VLS_209({
    modelValue: (__VLS_ctx.editVisible),
    title: "编辑图书",
    width: "500px",
    destroyOnClose: true,
}));
const __VLS_211 = __VLS_210({
    modelValue: (__VLS_ctx.editVisible),
    title: "编辑图书",
    width: "500px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_210));
__VLS_212.slots.default;
const __VLS_213 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_214 = __VLS_asFunctionalComponent(__VLS_213, new __VLS_213({
    model: (__VLS_ctx.currentBook),
    labelWidth: "80px",
}));
const __VLS_215 = __VLS_214({
    model: (__VLS_ctx.currentBook),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_214));
__VLS_216.slots.default;
const __VLS_217 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_218 = __VLS_asFunctionalComponent(__VLS_217, new __VLS_217({
    label: "书名",
}));
const __VLS_219 = __VLS_218({
    label: "书名",
}, ...__VLS_functionalComponentArgsRest(__VLS_218));
__VLS_220.slots.default;
const __VLS_221 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_222 = __VLS_asFunctionalComponent(__VLS_221, new __VLS_221({
    modelValue: (__VLS_ctx.currentBook.title),
}));
const __VLS_223 = __VLS_222({
    modelValue: (__VLS_ctx.currentBook.title),
}, ...__VLS_functionalComponentArgsRest(__VLS_222));
var __VLS_220;
const __VLS_225 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_226 = __VLS_asFunctionalComponent(__VLS_225, new __VLS_225({
    label: "作者",
}));
const __VLS_227 = __VLS_226({
    label: "作者",
}, ...__VLS_functionalComponentArgsRest(__VLS_226));
__VLS_228.slots.default;
const __VLS_229 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_230 = __VLS_asFunctionalComponent(__VLS_229, new __VLS_229({
    modelValue: (__VLS_ctx.currentBook.author),
}));
const __VLS_231 = __VLS_230({
    modelValue: (__VLS_ctx.currentBook.author),
}, ...__VLS_functionalComponentArgsRest(__VLS_230));
var __VLS_228;
const __VLS_233 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_234 = __VLS_asFunctionalComponent(__VLS_233, new __VLS_233({
    label: "出版社",
}));
const __VLS_235 = __VLS_234({
    label: "出版社",
}, ...__VLS_functionalComponentArgsRest(__VLS_234));
__VLS_236.slots.default;
const __VLS_237 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_238 = __VLS_asFunctionalComponent(__VLS_237, new __VLS_237({
    modelValue: (__VLS_ctx.currentBook.publisher),
}));
const __VLS_239 = __VLS_238({
    modelValue: (__VLS_ctx.currentBook.publisher),
}, ...__VLS_functionalComponentArgsRest(__VLS_238));
var __VLS_236;
const __VLS_241 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_242 = __VLS_asFunctionalComponent(__VLS_241, new __VLS_241({
    label: "定价",
}));
const __VLS_243 = __VLS_242({
    label: "定价",
}, ...__VLS_functionalComponentArgsRest(__VLS_242));
__VLS_244.slots.default;
const __VLS_245 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_246 = __VLS_asFunctionalComponent(__VLS_245, new __VLS_245({
    modelValue: (__VLS_ctx.currentBook.price),
    precision: (2),
    step: (0.1),
}));
const __VLS_247 = __VLS_246({
    modelValue: (__VLS_ctx.currentBook.price),
    precision: (2),
    step: (0.1),
}, ...__VLS_functionalComponentArgsRest(__VLS_246));
var __VLS_244;
const __VLS_249 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_250 = __VLS_asFunctionalComponent(__VLS_249, new __VLS_249({
    label: "总库存",
}));
const __VLS_251 = __VLS_250({
    label: "总库存",
}, ...__VLS_functionalComponentArgsRest(__VLS_250));
__VLS_252.slots.default;
const __VLS_253 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_254 = __VLS_asFunctionalComponent(__VLS_253, new __VLS_253({
    modelValue: (__VLS_ctx.currentBook.total_quantity),
    min: (1),
}));
const __VLS_255 = __VLS_254({
    modelValue: (__VLS_ctx.currentBook.total_quantity),
    min: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_254));
var __VLS_252;
var __VLS_216;
{
    const { footer: __VLS_thisSlot } = __VLS_212.slots;
    const __VLS_257 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_258 = __VLS_asFunctionalComponent(__VLS_257, new __VLS_257({
        ...{ 'onClick': {} },
    }));
    const __VLS_259 = __VLS_258({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_258));
    let __VLS_261;
    let __VLS_262;
    let __VLS_263;
    const __VLS_264 = {
        onClick: (...[$event]) => {
            __VLS_ctx.editVisible = false;
        }
    };
    __VLS_260.slots.default;
    var __VLS_260;
    const __VLS_265 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_266 = __VLS_asFunctionalComponent(__VLS_265, new __VLS_265({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_267 = __VLS_266({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_266));
    let __VLS_269;
    let __VLS_270;
    let __VLS_271;
    const __VLS_272 = {
        onClick: (__VLS_ctx.saveEdit)
    };
    __VLS_268.slots.default;
    var __VLS_268;
}
var __VLS_212;
const __VLS_273 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_274 = __VLS_asFunctionalComponent(__VLS_273, new __VLS_273({
    modelValue: (__VLS_ctx.addVisible),
    title: "新增图书",
    width: "500px",
    destroyOnClose: true,
}));
const __VLS_275 = __VLS_274({
    modelValue: (__VLS_ctx.addVisible),
    title: "新增图书",
    width: "500px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_274));
__VLS_276.slots.default;
const __VLS_277 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_278 = __VLS_asFunctionalComponent(__VLS_277, new __VLS_277({
    model: (__VLS_ctx.addForm),
    labelWidth: "80px",
}));
const __VLS_279 = __VLS_278({
    model: (__VLS_ctx.addForm),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_278));
__VLS_280.slots.default;
const __VLS_281 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_282 = __VLS_asFunctionalComponent(__VLS_281, new __VLS_281({
    label: "书名",
    required: true,
}));
const __VLS_283 = __VLS_282({
    label: "书名",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_282));
__VLS_284.slots.default;
const __VLS_285 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_286 = __VLS_asFunctionalComponent(__VLS_285, new __VLS_285({
    modelValue: (__VLS_ctx.addForm.title),
    placeholder: "请输入书名",
}));
const __VLS_287 = __VLS_286({
    modelValue: (__VLS_ctx.addForm.title),
    placeholder: "请输入书名",
}, ...__VLS_functionalComponentArgsRest(__VLS_286));
var __VLS_284;
const __VLS_289 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_290 = __VLS_asFunctionalComponent(__VLS_289, new __VLS_289({
    label: "作者",
    required: true,
}));
const __VLS_291 = __VLS_290({
    label: "作者",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_290));
__VLS_292.slots.default;
const __VLS_293 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_294 = __VLS_asFunctionalComponent(__VLS_293, new __VLS_293({
    modelValue: (__VLS_ctx.addForm.author),
    placeholder: "请输入作者",
}));
const __VLS_295 = __VLS_294({
    modelValue: (__VLS_ctx.addForm.author),
    placeholder: "请输入作者",
}, ...__VLS_functionalComponentArgsRest(__VLS_294));
var __VLS_292;
const __VLS_297 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_298 = __VLS_asFunctionalComponent(__VLS_297, new __VLS_297({
    label: "出版社",
    required: true,
}));
const __VLS_299 = __VLS_298({
    label: "出版社",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_298));
__VLS_300.slots.default;
const __VLS_301 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_302 = __VLS_asFunctionalComponent(__VLS_301, new __VLS_301({
    modelValue: (__VLS_ctx.addForm.publisher),
    placeholder: "请输入出版社",
}));
const __VLS_303 = __VLS_302({
    modelValue: (__VLS_ctx.addForm.publisher),
    placeholder: "请输入出版社",
}, ...__VLS_functionalComponentArgsRest(__VLS_302));
var __VLS_300;
const __VLS_305 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_306 = __VLS_asFunctionalComponent(__VLS_305, new __VLS_305({
    label: "ISBN",
    required: true,
}));
const __VLS_307 = __VLS_306({
    label: "ISBN",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_306));
__VLS_308.slots.default;
const __VLS_309 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_310 = __VLS_asFunctionalComponent(__VLS_309, new __VLS_309({
    modelValue: (__VLS_ctx.addForm.isbn),
    placeholder: "留空自动生成",
}));
const __VLS_311 = __VLS_310({
    modelValue: (__VLS_ctx.addForm.isbn),
    placeholder: "留空自动生成",
}, ...__VLS_functionalComponentArgsRest(__VLS_310));
__VLS_312.slots.default;
{
    const { append: __VLS_thisSlot } = __VLS_312.slots;
    const __VLS_313 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_314 = __VLS_asFunctionalComponent(__VLS_313, new __VLS_313({
        ...{ 'onClick': {} },
    }));
    const __VLS_315 = __VLS_314({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_314));
    let __VLS_317;
    let __VLS_318;
    let __VLS_319;
    const __VLS_320 = {
        onClick: (...[$event]) => {
            __VLS_ctx.addForm.isbn = 'AUTO';
        }
    };
    __VLS_316.slots.default;
    var __VLS_316;
}
var __VLS_312;
var __VLS_308;
const __VLS_321 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_322 = __VLS_asFunctionalComponent(__VLS_321, new __VLS_321({
    label: "图书类别",
    required: true,
}));
const __VLS_323 = __VLS_322({
    label: "图书类别",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_322));
__VLS_324.slots.default;
const __VLS_325 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_326 = __VLS_asFunctionalComponent(__VLS_325, new __VLS_325({
    modelValue: (__VLS_ctx.addForm.category_id),
    placeholder: "请选择图书类别",
    ...{ style: {} },
}));
const __VLS_327 = __VLS_326({
    modelValue: (__VLS_ctx.addForm.category_id),
    placeholder: "请选择图书类别",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_326));
__VLS_328.slots.default;
for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
    const __VLS_329 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_330 = __VLS_asFunctionalComponent(__VLS_329, new __VLS_329({
        key: (cat.id),
        label: (cat.name),
        value: (cat.id),
    }));
    const __VLS_331 = __VLS_330({
        key: (cat.id),
        label: (cat.name),
        value: (cat.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_330));
}
var __VLS_328;
var __VLS_324;
const __VLS_333 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_334 = __VLS_asFunctionalComponent(__VLS_333, new __VLS_333({
    label: "定价",
}));
const __VLS_335 = __VLS_334({
    label: "定价",
}, ...__VLS_functionalComponentArgsRest(__VLS_334));
__VLS_336.slots.default;
const __VLS_337 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_338 = __VLS_asFunctionalComponent(__VLS_337, new __VLS_337({
    modelValue: (__VLS_ctx.addForm.price),
    precision: (2),
    step: (0.1),
    min: (0),
    ...{ style: {} },
}));
const __VLS_339 = __VLS_338({
    modelValue: (__VLS_ctx.addForm.price),
    precision: (2),
    step: (0.1),
    min: (0),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_338));
var __VLS_336;
const __VLS_341 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_342 = __VLS_asFunctionalComponent(__VLS_341, new __VLS_341({
    label: "总库存",
    required: true,
}));
const __VLS_343 = __VLS_342({
    label: "总库存",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_342));
__VLS_344.slots.default;
const __VLS_345 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_346 = __VLS_asFunctionalComponent(__VLS_345, new __VLS_345({
    modelValue: (__VLS_ctx.addForm.total_quantity),
    min: (1),
    ...{ style: {} },
}));
const __VLS_347 = __VLS_346({
    modelValue: (__VLS_ctx.addForm.total_quantity),
    min: (1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_346));
var __VLS_344;
var __VLS_280;
{
    const { footer: __VLS_thisSlot } = __VLS_276.slots;
    const __VLS_349 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_350 = __VLS_asFunctionalComponent(__VLS_349, new __VLS_349({
        ...{ 'onClick': {} },
    }));
    const __VLS_351 = __VLS_350({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_350));
    let __VLS_353;
    let __VLS_354;
    let __VLS_355;
    const __VLS_356 = {
        onClick: (...[$event]) => {
            __VLS_ctx.addVisible = false;
        }
    };
    __VLS_352.slots.default;
    var __VLS_352;
    const __VLS_357 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_358 = __VLS_asFunctionalComponent(__VLS_357, new __VLS_357({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.addLoading),
    }));
    const __VLS_359 = __VLS_358({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.addLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_358));
    let __VLS_361;
    let __VLS_362;
    let __VLS_363;
    const __VLS_364 = {
        onClick: (__VLS_ctx.handleAddSubmit)
    };
    __VLS_360.slots.default;
    var __VLS_360;
}
var __VLS_276;
const __VLS_365 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_366 = __VLS_asFunctionalComponent(__VLS_365, new __VLS_365({
    modelValue: (__VLS_ctx.exportVisible),
    title: "导出图书数据",
    width: "400px",
    destroyOnClose: true,
}));
const __VLS_367 = __VLS_366({
    modelValue: (__VLS_ctx.exportVisible),
    title: "导出图书数据",
    width: "400px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_366));
__VLS_368.slots.default;
const __VLS_369 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_370 = __VLS_asFunctionalComponent(__VLS_369, new __VLS_369({
    labelPosition: "top",
}));
const __VLS_371 = __VLS_370({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_370));
__VLS_372.slots.default;
const __VLS_373 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_374 = __VLS_asFunctionalComponent(__VLS_373, new __VLS_373({
    label: "选择导出格式",
}));
const __VLS_375 = __VLS_374({
    label: "选择导出格式",
}, ...__VLS_functionalComponentArgsRest(__VLS_374));
__VLS_376.slots.default;
const __VLS_377 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_378 = __VLS_asFunctionalComponent(__VLS_377, new __VLS_377({
    modelValue: (__VLS_ctx.exportFormat),
}));
const __VLS_379 = __VLS_378({
    modelValue: (__VLS_ctx.exportFormat),
}, ...__VLS_functionalComponentArgsRest(__VLS_378));
__VLS_380.slots.default;
const __VLS_381 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_382 = __VLS_asFunctionalComponent(__VLS_381, new __VLS_381({
    value: "csv",
}));
const __VLS_383 = __VLS_382({
    value: "csv",
}, ...__VLS_functionalComponentArgsRest(__VLS_382));
__VLS_384.slots.default;
var __VLS_384;
const __VLS_385 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_386 = __VLS_asFunctionalComponent(__VLS_385, new __VLS_385({
    value: "json",
}));
const __VLS_387 = __VLS_386({
    value: "json",
}, ...__VLS_functionalComponentArgsRest(__VLS_386));
__VLS_388.slots.default;
var __VLS_388;
var __VLS_380;
var __VLS_376;
const __VLS_389 = {}.ElAlert;
/** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
// @ts-ignore
const __VLS_390 = __VLS_asFunctionalComponent(__VLS_389, new __VLS_389({
    title: "提示",
    type: "info",
    closable: (false),
    ...{ style: {} },
}));
const __VLS_391 = __VLS_390({
    title: "提示",
    type: "info",
    closable: (false),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_390));
__VLS_392.slots.default;
var __VLS_392;
var __VLS_372;
{
    const { footer: __VLS_thisSlot } = __VLS_368.slots;
    const __VLS_393 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_394 = __VLS_asFunctionalComponent(__VLS_393, new __VLS_393({
        ...{ 'onClick': {} },
    }));
    const __VLS_395 = __VLS_394({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_394));
    let __VLS_397;
    let __VLS_398;
    let __VLS_399;
    const __VLS_400 = {
        onClick: (...[$event]) => {
            __VLS_ctx.exportVisible = false;
        }
    };
    __VLS_396.slots.default;
    var __VLS_396;
    const __VLS_401 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_402 = __VLS_asFunctionalComponent(__VLS_401, new __VLS_401({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.exportLoading),
    }));
    const __VLS_403 = __VLS_402({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.exportLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_402));
    let __VLS_405;
    let __VLS_406;
    let __VLS_407;
    const __VLS_408 = {
        onClick: (__VLS_ctx.handleExport)
    };
    __VLS_404.slots.default;
    var __VLS_404;
}
var __VLS_368;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "glass-card table-wrapper" },
});
const __VLS_409 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_410 = __VLS_asFunctionalComponent(__VLS_409, new __VLS_409({
    data: (__VLS_ctx.bookList),
    ...{ style: {} },
    size: "large",
}));
const __VLS_411 = __VLS_410({
    data: (__VLS_ctx.bookList),
    ...{ style: {} },
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_410));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
__VLS_412.slots.default;
const __VLS_413 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_414 = __VLS_asFunctionalComponent(__VLS_413, new __VLS_413({
    label: "图书信息",
    minWidth: "280",
}));
const __VLS_415 = __VLS_414({
    label: "图书信息",
    minWidth: "280",
}, ...__VLS_functionalComponentArgsRest(__VLS_414));
__VLS_416.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_416.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "book-info-cell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "book-cover-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.rect)({
        width: "24",
        height: "24",
        rx: "4",
        fill: "#6366f1",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.text, __VLS_intrinsicElements.text)({
        x: "12",
        y: "16",
        'text-anchor': "middle",
        fill: "white",
        'font-size': "8",
        'font-weight': "bold",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "title" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightText(row.book_title)) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "isbn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightText(row.isbn)) }, null, null);
}
var __VLS_416;
const __VLS_417 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_418 = __VLS_asFunctionalComponent(__VLS_417, new __VLS_417({
    prop: "author",
    label: "作者",
    width: "180",
}));
const __VLS_419 = __VLS_418({
    prop: "author",
    label: "作者",
    width: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_418));
__VLS_420.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_420.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightText(row.author)) }, null, null);
}
var __VLS_420;
const __VLS_421 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_422 = __VLS_asFunctionalComponent(__VLS_421, new __VLS_421({
    prop: "category",
    label: "分类",
    width: "120",
}));
const __VLS_423 = __VLS_422({
    prop: "category",
    label: "分类",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_422));
__VLS_424.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_424.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_425 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_426 = __VLS_asFunctionalComponent(__VLS_425, new __VLS_425({
        effect: "plain",
        round: true,
    }));
    const __VLS_427 = __VLS_426({
        effect: "plain",
        round: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_426));
    __VLS_428.slots.default;
    (row.category);
    var __VLS_428;
}
var __VLS_424;
const __VLS_429 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_430 = __VLS_asFunctionalComponent(__VLS_429, new __VLS_429({
    label: "库存状态",
    width: "200",
}));
const __VLS_431 = __VLS_430({
    label: "库存状态",
    width: "200",
}, ...__VLS_functionalComponentArgsRest(__VLS_430));
__VLS_432.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_432.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stock-status" },
    });
    const __VLS_433 = {}.ElProgress;
    /** @type {[typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ]} */ ;
    // @ts-ignore
    const __VLS_434 = __VLS_asFunctionalComponent(__VLS_433, new __VLS_433({
        percentage: (Number((row.available_quantity / row.total_quantity * 100).toFixed(0))),
        status: (row.available_quantity == 0 ? 'exception' : ''),
        strokeWidth: (6),
    }));
    const __VLS_435 = __VLS_434({
        percentage: (Number((row.available_quantity / row.total_quantity * 100).toFixed(0))),
        status: (row.available_quantity == 0 ? 'exception' : ''),
        strokeWidth: (6),
    }, ...__VLS_functionalComponentArgsRest(__VLS_434));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stock-text" },
    });
    (row.available_quantity);
    (row.total_quantity);
}
var __VLS_432;
const __VLS_437 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_438 = __VLS_asFunctionalComponent(__VLS_437, new __VLS_437({
    label: "操作",
    width: "180",
    fixed: "right",
}));
const __VLS_439 = __VLS_438({
    label: "操作",
    width: "180",
    fixed: "right",
}, ...__VLS_functionalComponentArgsRest(__VLS_438));
__VLS_440.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_440.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (__VLS_ctx.canManage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_441 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_442 = __VLS_asFunctionalComponent(__VLS_441, new __VLS_441({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }));
        const __VLS_443 = __VLS_442({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_442));
        let __VLS_445;
        let __VLS_446;
        let __VLS_447;
        const __VLS_448 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.canManage))
                    return;
                __VLS_ctx.handleEdit(row);
            }
        };
        __VLS_444.slots.default;
        var __VLS_444;
        const __VLS_449 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_450 = __VLS_asFunctionalComponent(__VLS_449, new __VLS_449({
            ...{ 'onClick': {} },
            link: true,
            type: "danger",
        }));
        const __VLS_451 = __VLS_450({
            ...{ 'onClick': {} },
            link: true,
            type: "danger",
        }, ...__VLS_functionalComponentArgsRest(__VLS_450));
        let __VLS_453;
        let __VLS_454;
        let __VLS_455;
        const __VLS_456 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.canManage))
                    return;
                __VLS_ctx.handleDelete(row);
            }
        };
        __VLS_452.slots.default;
        var __VLS_452;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_457 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_458 = __VLS_asFunctionalComponent(__VLS_457, new __VLS_457({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
            disabled: (row.available_quantity <= 0 || __VLS_ctx.borrowing.has(row.id)),
            loading: (__VLS_ctx.borrowing.has(row.id)),
        }));
        const __VLS_459 = __VLS_458({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
            disabled: (row.available_quantity <= 0 || __VLS_ctx.borrowing.has(row.id)),
            loading: (__VLS_ctx.borrowing.has(row.id)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_458));
        let __VLS_461;
        let __VLS_462;
        let __VLS_463;
        const __VLS_464 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.canManage))
                    return;
                __VLS_ctx.handleUserBorrow(row);
            }
        };
        __VLS_460.slots.default;
        (__VLS_ctx.borrowing.has(row.id) ? '借阅中...' : '借阅');
        var __VLS_460;
    }
}
var __VLS_440;
var __VLS_412;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "pagination" },
});
const __VLS_465 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_466 = __VLS_asFunctionalComponent(__VLS_465, new __VLS_465({
    background: true,
    layout: "prev, pager, next",
    total: (__VLS_ctx.total),
}));
const __VLS_467 = __VLS_466({
    background: true,
    layout: "prev, pager, next",
    total: (__VLS_ctx.total),
}, ...__VLS_functionalComponentArgsRest(__VLS_466));
/** @type {__VLS_StyleScopedClasses['page-container']} */ ;
/** @type {__VLS_StyleScopedClasses['action-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['title-group']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['gdut-decoration']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-text']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['glow-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['search-card']} */ ;
/** @type {__VLS_StyleScopedClasses['search-row']} */ ;
/** @type {__VLS_StyleScopedClasses['main-search']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['book-info-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['book-cover-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['title']} */ ;
/** @type {__VLS_StyleScopedClasses['isbn']} */ ;
/** @type {__VLS_StyleScopedClasses['stock-status']} */ ;
/** @type {__VLS_StyleScopedClasses['stock-text']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Filter: Filter,
            canManage: canManage,
            bookList: bookList,
            total: total,
            searchQuery: searchQuery,
            category: category,
            loading: loading,
            borrowing: borrowing,
            advancedSearchVisible: advancedSearchVisible,
            searchType: searchType,
            regexError: regexError,
            advancedForm: advancedForm,
            getSearchPlaceholder: getSearchPlaceholder,
            validateRegexPattern: validateRegexPattern,
            editVisible: editVisible,
            currentBook: currentBook,
            addVisible: addVisible,
            addForm: addForm,
            categories: categories,
            addLoading: addLoading,
            exportVisible: exportVisible,
            exportFormat: exportFormat,
            exportLoading: exportLoading,
            handleReset: handleReset,
            fetchData: fetchData,
            handleAdvancedSearch: handleAdvancedSearch,
            highlightText: highlightText,
            handleAdd: handleAdd,
            handleAddSubmit: handleAddSubmit,
            handleExportClick: handleExportClick,
            handleExport: handleExport,
            handleEdit: handleEdit,
            saveEdit: saveEdit,
            handleDelete: handleDelete,
            handleUserBorrow: handleUserBorrow,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=Books.vue.js.map