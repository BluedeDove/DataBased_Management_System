/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive, onMounted, computed } from 'vue';
import { Search, Plus, Download, Operation, Refresh, Edit, Delete, Tickets, Warning } from '@element-plus/icons-vue';
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
const loading = ref(false);
const borrowing = ref(new Set());
const page = ref(1);
// Search
const searchQuery = ref('');
const selectedCategory = ref('');
let debounceTimer;
const debounceFetch = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(fetchData, 500); };
const resetFilters = () => { searchQuery.value = ''; selectedCategory.value = ''; page.value = 1; fetchData(); };
// Categories
const categories = ref([]);
const categoryNames = computed(() => categories.value.map(c => c.name));
// Advanced Search
const advancedSearchVisible = ref(false);
const searchType = ref('regex');
const advTabs = [{ key: 'regex', label: '正则匹配' }, { key: 'vector', label: '语义检索' }, { key: 'sql', label: 'SQL 查询' }];
const regexError = ref('');
const advancedForm = reactive({
    category_id: null,
    pattern: '',
    searchMode: 'contains',
    fields: ['title', 'author'],
    sql: '',
    vectorQuery: ''
});
const getSearchPlaceholder = () => {
    const map = { contains: '输入要包含的文本', exact: '精确匹配文本', startsWith: '输入开头文本', endsWith: '输入结尾文本', regex: '输入正则表达式' };
    return map[advancedForm.searchMode] || '输入搜索内容';
};
const validateRegex = () => {
    if (advancedForm.searchMode === 'regex' && advancedForm.pattern) {
        try {
            new RegExp(advancedForm.pattern);
            regexError.value = '';
        }
        catch (e) {
            regexError.value = `无效的正则: ${e.message}`;
        }
    }
    else
        regexError.value = '';
};
const escapeRegex = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Spine colors
const SPINE_COLORS = ['#C8102E', '#7C3AED', '#0EA5E9', '#059669', '#D97706', '#EC4899', '#6366F1', '#14B8A6'];
const getSpineColor = (row) => SPINE_COLORS[((row.category_id || 0) + (row.book_title || row.title || '').charCodeAt(0)) % SPINE_COLORS.length];
// Stock helpers
const availOf = (row) => row.available_quantity ?? row.available_copies ?? 0;
const totalOf = (row) => row.total_quantity ?? row.total_copies ?? row.copies ?? 0;
const stockPercent = (row) => { const t = totalOf(row); return t > 0 ? Math.round(availOf(row) / t * 100) : 0; };
const stockStatus = (row) => availOf(row) === 0 ? 'exception' : '';
// Highlight
const highlightText = (text) => {
    if (!text)
        return '';
    if (searchType.value === 'regex' && advancedForm.pattern) {
        try {
            let p = advancedForm.pattern;
            if (advancedForm.searchMode === 'exact')
                p = `^${escapeRegex(p)}$`;
            else if (advancedForm.searchMode === 'startsWith')
                p = `^${escapeRegex(p)}`;
            else if (advancedForm.searchMode === 'endsWith')
                p = `${escapeRegex(p)}$`;
            else if (advancedForm.searchMode === 'contains')
                p = escapeRegex(p);
            return text.replace(new RegExp(`(${p})`, 'gi'), '<span style="background:#FEF08A;color:#854D0E">$1</span>');
        }
        catch {
            return text;
        }
    }
    if (searchQuery.value) {
        try {
            return text.replace(new RegExp(`(${escapeRegex(searchQuery.value)})`, 'gi'), '<span style="background:#FEF08A;color:#854D0E">$1</span>');
        }
        catch {
            return text;
        }
    }
    return text;
};
// CRUD
const addVisible = ref(false);
const addForm = reactive({ title: '', author: '', publisher: '', isbn: 'AUTO', category_id: null, price: null, total_quantity: 1 });
const addLoading = ref(false);
const editVisible = ref(false);
const currentBook = ref({});
const exportVisible = ref(false);
const exportFormat = ref('csv');
const exportLoading = ref(false);
// Fetch
const fetchData = async () => {
    loading.value = true;
    try {
        const result = await bookApi.getAll({ keyword: searchQuery.value });
        if (result.success) {
            bookList.value = result.data.map((book) => ({ ...book, book_title: book.title, category: book.category_name || '通用' }));
            total.value = result.data.length;
        }
        else
            ElMessage.error(result.error?.message || '获取图书失败');
    }
    catch {
        ElMessage.error('加载失败');
    }
    finally {
        loading.value = false;
    }
};
const fetchCategories = async () => {
    try {
        const r = await bookCategoryApi.getAll();
        if (r.success)
            categories.value = r.data;
    }
    catch { }
};
// Advanced search
const handleAdvancedSearch = async () => {
    loading.value = true;
    advancedSearchVisible.value = false;
    try {
        let result;
        if (searchType.value === 'regex') {
            if (advancedForm.searchMode === 'regex' && advancedForm.pattern) {
                try {
                    new RegExp(advancedForm.pattern);
                }
                catch (e) {
                    ElMessage.error(e.message);
                    loading.value = false;
                    return;
                }
            }
            const fields = Array.isArray(advancedForm.fields) ? [...advancedForm.fields] : ['title', 'author'];
            result = await bookApi.regexSearch(advancedForm.pattern, fields, advancedForm.category_id ?? undefined, advancedForm.searchMode);
        }
        else if (searchType.value === 'sql') {
            result = await searchApi.executeSql(advancedForm.sql);
        }
        else if (searchType.value === 'vector') {
            result = await aiApi.semanticSearch(advancedForm.vectorQuery, 20);
        }
        if (result?.success) {
            bookList.value = (result.data || []).map((b) => ({ ...b, book_title: b.title || b.book_title, category: b.category_name || '未知' }));
            total.value = bookList.value.length;
            ElMessage.success(`搜索到 ${total.value} 条结果`);
        }
        else
            ElMessage.error(result?.error?.message || '搜索失败');
    }
    catch (e) {
        ElMessage.error('搜索失败: ' + (e.message || '未知错误'));
    }
    finally {
        loading.value = false;
    }
};
const openAddDialog = () => { addVisible.value = true; };
const handleAddSubmit = async () => {
    if (!addForm.title || !addForm.author || !addForm.publisher || !addForm.category_id) {
        ElMessage.error('请填写所有必填字段');
        return;
    }
    addLoading.value = true;
    try {
        const result = await bookApi.create({ ...addForm, available_quantity: addForm.total_quantity, status: 'normal', registration_date: new Date().toISOString().split('T')[0] });
        if (result.success) {
            ElMessage.success('图书添加成功');
            addVisible.value = false;
            Object.assign(addForm, { title: '', author: '', publisher: '', isbn: 'AUTO', category_id: null, price: null, total_quantity: 1 });
            fetchData();
        }
        else
            ElMessage.error(result.error?.message || '添加失败');
    }
    catch {
        ElMessage.error('操作失败');
    }
    finally {
        addLoading.value = false;
    }
};
const openEditDialog = (row) => { currentBook.value = { ...row, title: row.book_title || row.title }; editVisible.value = true; };
const saveEdit = async () => {
    try {
        const result = await bookApi.update(currentBook.value.id, { title: currentBook.value.title, author: currentBook.value.author, publisher: currentBook.value.publisher, price: currentBook.value.price, total_quantity: currentBook.value.total_quantity });
        if (result.success) {
            ElMessage.success('更新成功');
            editVisible.value = false;
            fetchData();
        }
        else
            ElMessage.error('更新失败');
    }
    catch {
        ElMessage.error('操作失败');
    }
};
const handleDelete = async (book) => {
    try {
        await ElMessageBox.confirm('确定要下架这本图书吗？', '提示', { type: 'warning' });
        const result = await bookApi.delete(book.id);
        if (result.success) {
            ElMessage.success('删除成功');
            fetchData();
        }
        else
            ElMessage.error(result.error?.message || '删除失败');
    }
    catch { }
};
const handleExport = async () => {
    exportLoading.value = true;
    try {
        const blob = exportFormat.value === 'csv' ? await exportApi.booksToCSV() : await exportApi.booksToJSON();
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), { href: url, download: `books.${exportFormat.value}` });
        a.click();
        URL.revokeObjectURL(url);
        ElMessage.success('导出成功！');
        exportVisible.value = false;
    }
    catch {
        ElMessage.error('导出失败');
    }
    finally {
        exportLoading.value = false;
    }
};
const handleUserBorrow = async (book) => {
    if (!userStore.user?.reader_id) {
        ElMessage.info('请使用借阅管理页面');
        return;
    }
    if (borrowing.value.has(book.id))
        return;
    try {
        borrowing.value.add(book.id);
        const result = await borrowingApi.borrow(userStore.user.reader_id, book.id);
        if (result.success) {
            ElMessage.success(`借阅成功：《${book.book_title || book.title}》`);
            await fetchData();
        }
        else {
            const msg = result.error?.message || '借阅失败';
            if (msg.includes('暂无可借'))
                ElMessage.error('该图书暂时无可借库存');
            else if (msg.includes('最大借阅'))
                ElMessage.error('已达到最大借阅数量');
            else if (msg.includes('逾期'))
                ElMessage.error('有图书逾期未还');
            else
                ElMessage.error(msg);
        }
    }
    catch (e) {
        ElMessage.error('借阅失败: ' + e.message);
    }
    finally {
        borrowing.value.delete(book.id);
    }
};
onMounted(() => { fetchData(); fetchCategories(); });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['filter-card']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['stock-avail']} */ ;
/** @type {__VLS_StyleScopedClasses['el-progress-bar__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "books-page" },
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
(__VLS_ctx.total);
(__VLS_ctx.categories.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-actions" },
});
if (__VLS_ctx.canManage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.canManage))
                    return;
                __VLS_ctx.exportVisible = true;
            } },
        ...{ class: "action-btn secondary" },
    });
    const __VLS_0 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    const __VLS_4 = {}.Download;
    /** @type {[typeof __VLS_components.Download, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
    const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
    var __VLS_3;
}
if (__VLS_ctx.canManage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openAddDialog) },
        ...{ class: "gradient-btn" },
    });
    const __VLS_8 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
    const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    const __VLS_12 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    var __VLS_11;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "filter-card animate-fade-in-delay-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "filter-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "search-bar" },
    ...{ style: {} },
});
const __VLS_16 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ class: "search-icon" },
}));
const __VLS_18 = __VLS_17({
    ...{ class: "search-icon" },
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.Search;
/** @type {[typeof __VLS_components.Search, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
var __VLS_19;
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onKeydown: (__VLS_ctx.fetchData) },
    ...{ onInput: (__VLS_ctx.debounceFetch) },
    placeholder: "搜索书名、作者、ISBN…",
});
(__VLS_ctx.searchQuery);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.advancedSearchVisible = true;
        } },
    ...{ class: "action-btn secondary" },
});
const __VLS_24 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
const __VLS_28 = {}.Operation;
/** @type {[typeof __VLS_components.Operation, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({}));
const __VLS_30 = __VLS_29({}, ...__VLS_functionalComponentArgsRest(__VLS_29));
var __VLS_27;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.resetFilters) },
    ...{ class: "action-btn secondary" },
});
const __VLS_32 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({}));
const __VLS_34 = __VLS_33({}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.Refresh;
/** @type {[typeof __VLS_components.Refresh, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({}));
const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
var __VLS_35;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cat-chips" },
});
for (const [cat] of __VLS_getVForSourceType((['全部', ...__VLS_ctx.categoryNames]))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectedCategory = cat === '全部' ? '' : cat;
                __VLS_ctx.fetchData();
            } },
        key: (cat),
        ...{ class: "cat-chip" },
        ...{ class: ({ active: __VLS_ctx.selectedCategory === (cat === '全部' ? '' : cat) }) },
    });
    (cat);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "table-card animate-fade-in-delay-2" },
});
const __VLS_40 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    data: (__VLS_ctx.bookList),
    ...{ style: {} },
}));
const __VLS_42 = __VLS_41({
    data: (__VLS_ctx.bookList),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
__VLS_43.slots.default;
const __VLS_44 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "图书",
    minWidth: "260",
}));
const __VLS_46 = __VLS_45({
    label: "图书",
    minWidth: "260",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_47.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "book-cell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "book-spine" },
        ...{ style: ({ background: __VLS_ctx.getSpineColor(row) }) },
    });
    ((row.book_title || row.title || '?')[0]);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "book-meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "book-title" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightText(row.book_title || row.title)) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "book-isbn" },
    });
    (row.isbn || '—');
}
var __VLS_47;
const __VLS_48 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    prop: "author",
    label: "作者",
    width: "140",
}));
const __VLS_50 = __VLS_49({
    prop: "author",
    label: "作者",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_51.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightText(row.author)) }, null, null);
}
var __VLS_51;
const __VLS_52 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "分类",
    width: "120",
}));
const __VLS_54 = __VLS_53({
    label: "分类",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_55.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pill-badge purple" },
    });
    (row.category || row.category_name || '未分类');
}
var __VLS_55;
const __VLS_56 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    prop: "publisher",
    label: "出版社",
    width: "150",
}));
const __VLS_58 = __VLS_57({
    prop: "publisher",
    label: "出版社",
    width: "150",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
__VLS_59.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_59.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-secondary-small" },
    });
    (row.publisher || '—');
}
var __VLS_59;
const __VLS_60 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: "库存",
    width: "140",
    align: "center",
}));
const __VLS_62 = __VLS_61({
    label: "库存",
    width: "140",
    align: "center",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_63.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stock-cell" },
    });
    const __VLS_64 = {}.ElProgress;
    /** @type {[typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        percentage: (__VLS_ctx.stockPercent(row)),
        strokeWidth: (5),
        showText: (false),
        status: (__VLS_ctx.stockStatus(row)),
    }));
    const __VLS_66 = __VLS_65({
        percentage: (__VLS_ctx.stockPercent(row)),
        strokeWidth: (5),
        showText: (false),
        status: (__VLS_ctx.stockStatus(row)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stock-text" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stock-avail" },
        ...{ class: ({ empty: __VLS_ctx.availOf(row) === 0 }) },
    });
    (__VLS_ctx.availOf(row));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stock-total" },
    });
    (__VLS_ctx.totalOf(row));
}
var __VLS_63;
const __VLS_68 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    label: "操作",
    width: "160",
    align: "right",
    fixed: "right",
}));
const __VLS_70 = __VLS_69({
    label: "操作",
    width: "160",
    align: "right",
    fixed: "right",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_71.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_71.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "action-cell" },
    });
    if (__VLS_ctx.canManage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.canManage))
                        return;
                    __VLS_ctx.openEditDialog(row);
                } },
            ...{ class: "icon-btn" },
        });
        const __VLS_72 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({}));
        const __VLS_74 = __VLS_73({}, ...__VLS_functionalComponentArgsRest(__VLS_73));
        __VLS_75.slots.default;
        const __VLS_76 = {}.Edit;
        /** @type {[typeof __VLS_components.Edit, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({}));
        const __VLS_78 = __VLS_77({}, ...__VLS_functionalComponentArgsRest(__VLS_77));
        var __VLS_75;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.canManage))
                        return;
                    __VLS_ctx.handleDelete(row);
                } },
            ...{ class: "icon-btn danger" },
        });
        const __VLS_80 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({}));
        const __VLS_82 = __VLS_81({}, ...__VLS_functionalComponentArgsRest(__VLS_81));
        __VLS_83.slots.default;
        const __VLS_84 = {}.Delete;
        /** @type {[typeof __VLS_components.Delete, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({}));
        const __VLS_86 = __VLS_85({}, ...__VLS_functionalComponentArgsRest(__VLS_85));
        var __VLS_83;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.canManage))
                        return;
                    __VLS_ctx.handleUserBorrow(row);
                } },
            ...{ class: "action-btn-sm primary" },
            disabled: (__VLS_ctx.availOf(row) <= 0 || __VLS_ctx.borrowing.has(row.id)),
        });
        const __VLS_88 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
        const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
        __VLS_91.slots.default;
        const __VLS_92 = {}.Tickets;
        /** @type {[typeof __VLS_components.Tickets, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({}));
        const __VLS_94 = __VLS_93({}, ...__VLS_functionalComponentArgsRest(__VLS_93));
        var __VLS_91;
    }
}
var __VLS_71;
var __VLS_43;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "pagination-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "pagination-info" },
});
(__VLS_ctx.total);
const __VLS_96 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    ...{ 'onCurrentChange': {} },
    background: true,
    layout: "prev, pager, next",
    total: (__VLS_ctx.total),
    pageSize: (20),
    currentPage: (__VLS_ctx.page),
}));
const __VLS_98 = __VLS_97({
    ...{ 'onCurrentChange': {} },
    background: true,
    layout: "prev, pager, next",
    total: (__VLS_ctx.total),
    pageSize: (20),
    currentPage: (__VLS_ctx.page),
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
let __VLS_100;
let __VLS_101;
let __VLS_102;
const __VLS_103 = {
    onCurrentChange: (__VLS_ctx.fetchData)
};
var __VLS_99;
const __VLS_104 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    modelValue: (__VLS_ctx.advancedSearchVisible),
    title: "高级搜索",
    width: "680px",
    alignCenter: true,
}));
const __VLS_106 = __VLS_105({
    modelValue: (__VLS_ctx.advancedSearchVisible),
    title: "高级搜索",
    width: "680px",
    alignCenter: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_107.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "pill-tabs" },
    ...{ style: {} },
});
for (const [t] of __VLS_getVForSourceType((__VLS_ctx.advTabs))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.searchType = t.key;
            } },
        key: (t.key),
        ...{ class: "pill-tab" },
        ...{ class: ({ active: __VLS_ctx.searchType === t.key }) },
    });
    (t.label);
}
if (__VLS_ctx.searchType === 'regex') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_108 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        labelWidth: "80px",
    }));
    const __VLS_110 = __VLS_109({
        labelWidth: "80px",
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    __VLS_111.slots.default;
    const __VLS_112 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        label: "搜索模式",
    }));
    const __VLS_114 = __VLS_113({
        label: "搜索模式",
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_115.slots.default;
    const __VLS_116 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        modelValue: (__VLS_ctx.advancedForm.searchMode),
        ...{ style: {} },
    }));
    const __VLS_118 = __VLS_117({
        modelValue: (__VLS_ctx.advancedForm.searchMode),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    __VLS_119.slots.default;
    const __VLS_120 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        label: "包含匹配",
        value: "contains",
    }));
    const __VLS_122 = __VLS_121({
        label: "包含匹配",
        value: "contains",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    const __VLS_124 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        label: "精确匹配",
        value: "exact",
    }));
    const __VLS_126 = __VLS_125({
        label: "精确匹配",
        value: "exact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    const __VLS_128 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        label: "前缀匹配",
        value: "startsWith",
    }));
    const __VLS_130 = __VLS_129({
        label: "前缀匹配",
        value: "startsWith",
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    const __VLS_132 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        label: "后缀匹配",
        value: "endsWith",
    }));
    const __VLS_134 = __VLS_133({
        label: "后缀匹配",
        value: "endsWith",
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    const __VLS_136 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        label: "正则表达式",
        value: "regex",
    }));
    const __VLS_138 = __VLS_137({
        label: "正则表达式",
        value: "regex",
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    var __VLS_119;
    var __VLS_115;
    const __VLS_140 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        label: "搜索内容",
    }));
    const __VLS_142 = __VLS_141({
        label: "搜索内容",
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    __VLS_143.slots.default;
    const __VLS_144 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        ...{ 'onInput': {} },
        modelValue: (__VLS_ctx.advancedForm.pattern),
        placeholder: (__VLS_ctx.getSearchPlaceholder()),
    }));
    const __VLS_146 = __VLS_145({
        ...{ 'onInput': {} },
        modelValue: (__VLS_ctx.advancedForm.pattern),
        placeholder: (__VLS_ctx.getSearchPlaceholder()),
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    let __VLS_148;
    let __VLS_149;
    let __VLS_150;
    const __VLS_151 = {
        onInput: (__VLS_ctx.validateRegex)
    };
    var __VLS_147;
    if (__VLS_ctx.regexError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ style: {} },
        });
        (__VLS_ctx.regexError);
    }
    var __VLS_143;
    const __VLS_152 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        label: "匹配字段",
    }));
    const __VLS_154 = __VLS_153({
        label: "匹配字段",
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    __VLS_155.slots.default;
    const __VLS_156 = {}.ElCheckboxGroup;
    /** @type {[typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        modelValue: (__VLS_ctx.advancedForm.fields),
    }));
    const __VLS_158 = __VLS_157({
        modelValue: (__VLS_ctx.advancedForm.fields),
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    __VLS_159.slots.default;
    const __VLS_160 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
        label: "title",
    }));
    const __VLS_162 = __VLS_161({
        label: "title",
    }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    __VLS_163.slots.default;
    var __VLS_163;
    const __VLS_164 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
        label: "author",
    }));
    const __VLS_166 = __VLS_165({
        label: "author",
    }, ...__VLS_functionalComponentArgsRest(__VLS_165));
    __VLS_167.slots.default;
    var __VLS_167;
    const __VLS_168 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        label: "isbn",
    }));
    const __VLS_170 = __VLS_169({
        label: "isbn",
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    __VLS_171.slots.default;
    var __VLS_171;
    var __VLS_159;
    var __VLS_155;
    var __VLS_111;
}
if (__VLS_ctx.searchType === 'vector') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_172 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
        labelWidth: "80px",
    }));
    const __VLS_174 = __VLS_173({
        labelWidth: "80px",
    }, ...__VLS_functionalComponentArgsRest(__VLS_173));
    __VLS_175.slots.default;
    const __VLS_176 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
        label: "描述",
    }));
    const __VLS_178 = __VLS_177({
        label: "描述",
    }, ...__VLS_functionalComponentArgsRest(__VLS_177));
    __VLS_179.slots.default;
    const __VLS_180 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
        modelValue: (__VLS_ctx.advancedForm.vectorQuery),
        type: "textarea",
        rows: (3),
        placeholder: "用自然语言描述你想找的书",
    }));
    const __VLS_182 = __VLS_181({
        modelValue: (__VLS_ctx.advancedForm.vectorQuery),
        type: "textarea",
        rows: (3),
        placeholder: "用自然语言描述你想找的书",
    }, ...__VLS_functionalComponentArgsRest(__VLS_181));
    var __VLS_179;
    var __VLS_175;
}
if (__VLS_ctx.searchType === 'sql') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_184 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
        labelWidth: "80px",
    }));
    const __VLS_186 = __VLS_185({
        labelWidth: "80px",
    }, ...__VLS_functionalComponentArgsRest(__VLS_185));
    __VLS_187.slots.default;
    const __VLS_188 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
        label: "SQL 条件",
    }));
    const __VLS_190 = __VLS_189({
        label: "SQL 条件",
    }, ...__VLS_functionalComponentArgsRest(__VLS_189));
    __VLS_191.slots.default;
    const __VLS_192 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
        modelValue: (__VLS_ctx.advancedForm.sql),
        type: "textarea",
        rows: (4),
        placeholder: "如：category = '计算机' AND available_quantity > 0",
        ...{ style: {} },
    }));
    const __VLS_194 = __VLS_193({
        modelValue: (__VLS_ctx.advancedForm.sql),
        type: "textarea",
        rows: (4),
        placeholder: "如：category = '计算机' AND available_quantity > 0",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    var __VLS_191;
    var __VLS_187;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
    const __VLS_196 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({}));
    const __VLS_198 = __VLS_197({}, ...__VLS_functionalComponentArgsRest(__VLS_197));
    __VLS_199.slots.default;
    const __VLS_200 = {}.Warning;
    /** @type {[typeof __VLS_components.Warning, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({}));
    const __VLS_202 = __VLS_201({}, ...__VLS_functionalComponentArgsRest(__VLS_201));
    var __VLS_199;
}
{
    const { footer: __VLS_thisSlot } = __VLS_107.slots;
    const __VLS_204 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
        ...{ 'onClick': {} },
    }));
    const __VLS_206 = __VLS_205({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    let __VLS_208;
    let __VLS_209;
    let __VLS_210;
    const __VLS_211 = {
        onClick: (...[$event]) => {
            __VLS_ctx.advancedSearchVisible = false;
        }
    };
    __VLS_207.slots.default;
    var __VLS_207;
    const __VLS_212 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_214 = __VLS_213({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_213));
    let __VLS_216;
    let __VLS_217;
    let __VLS_218;
    const __VLS_219 = {
        onClick: (__VLS_ctx.handleAdvancedSearch)
    };
    __VLS_215.slots.default;
    const __VLS_220 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({}));
    const __VLS_222 = __VLS_221({}, ...__VLS_functionalComponentArgsRest(__VLS_221));
    __VLS_223.slots.default;
    const __VLS_224 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({}));
    const __VLS_226 = __VLS_225({}, ...__VLS_functionalComponentArgsRest(__VLS_225));
    var __VLS_223;
    var __VLS_215;
}
var __VLS_107;
const __VLS_228 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
    modelValue: (__VLS_ctx.addVisible),
    title: "新增图书",
    width: "560px",
    alignCenter: true,
}));
const __VLS_230 = __VLS_229({
    modelValue: (__VLS_ctx.addVisible),
    title: "新增图书",
    width: "560px",
    alignCenter: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_229));
__VLS_231.slots.default;
const __VLS_232 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
    model: (__VLS_ctx.addForm),
    labelWidth: "80px",
}));
const __VLS_234 = __VLS_233({
    model: (__VLS_ctx.addForm),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_233));
__VLS_235.slots.default;
const __VLS_236 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
    label: "书名",
    required: true,
}));
const __VLS_238 = __VLS_237({
    label: "书名",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_237));
__VLS_239.slots.default;
const __VLS_240 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
    modelValue: (__VLS_ctx.addForm.title),
    placeholder: "图书标题",
}));
const __VLS_242 = __VLS_241({
    modelValue: (__VLS_ctx.addForm.title),
    placeholder: "图书标题",
}, ...__VLS_functionalComponentArgsRest(__VLS_241));
var __VLS_239;
const __VLS_244 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
    label: "作者",
    required: true,
}));
const __VLS_246 = __VLS_245({
    label: "作者",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_245));
__VLS_247.slots.default;
const __VLS_248 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
    modelValue: (__VLS_ctx.addForm.author),
    placeholder: "作者姓名",
}));
const __VLS_250 = __VLS_249({
    modelValue: (__VLS_ctx.addForm.author),
    placeholder: "作者姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_249));
var __VLS_247;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ style: {} },
});
const __VLS_252 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
    label: "出版社",
    required: true,
}));
const __VLS_254 = __VLS_253({
    label: "出版社",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_253));
__VLS_255.slots.default;
const __VLS_256 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
    modelValue: (__VLS_ctx.addForm.publisher),
}));
const __VLS_258 = __VLS_257({
    modelValue: (__VLS_ctx.addForm.publisher),
}, ...__VLS_functionalComponentArgsRest(__VLS_257));
var __VLS_255;
const __VLS_260 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
    label: "ISBN",
}));
const __VLS_262 = __VLS_261({
    label: "ISBN",
}, ...__VLS_functionalComponentArgsRest(__VLS_261));
__VLS_263.slots.default;
const __VLS_264 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
    modelValue: (__VLS_ctx.addForm.isbn),
    placeholder: "留空自动生成",
}));
const __VLS_266 = __VLS_265({
    modelValue: (__VLS_ctx.addForm.isbn),
    placeholder: "留空自动生成",
}, ...__VLS_functionalComponentArgsRest(__VLS_265));
var __VLS_263;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ style: {} },
});
const __VLS_268 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
    label: "分类",
    required: true,
}));
const __VLS_270 = __VLS_269({
    label: "分类",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_269));
__VLS_271.slots.default;
const __VLS_272 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
    modelValue: (__VLS_ctx.addForm.category_id),
    ...{ style: {} },
}));
const __VLS_274 = __VLS_273({
    modelValue: (__VLS_ctx.addForm.category_id),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_273));
__VLS_275.slots.default;
for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
    const __VLS_276 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
        key: (cat.id),
        label: (cat.name),
        value: (cat.id),
    }));
    const __VLS_278 = __VLS_277({
        key: (cat.id),
        label: (cat.name),
        value: (cat.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_277));
}
var __VLS_275;
var __VLS_271;
const __VLS_280 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
    label: "定价",
}));
const __VLS_282 = __VLS_281({
    label: "定价",
}, ...__VLS_functionalComponentArgsRest(__VLS_281));
__VLS_283.slots.default;
const __VLS_284 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
    modelValue: (__VLS_ctx.addForm.price),
    precision: (2),
    min: (0),
    ...{ style: {} },
}));
const __VLS_286 = __VLS_285({
    modelValue: (__VLS_ctx.addForm.price),
    precision: (2),
    min: (0),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_285));
var __VLS_283;
const __VLS_288 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
    label: "库存",
    required: true,
}));
const __VLS_290 = __VLS_289({
    label: "库存",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_289));
__VLS_291.slots.default;
const __VLS_292 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
    modelValue: (__VLS_ctx.addForm.total_quantity),
    min: (1),
    ...{ style: {} },
}));
const __VLS_294 = __VLS_293({
    modelValue: (__VLS_ctx.addForm.total_quantity),
    min: (1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_293));
var __VLS_291;
var __VLS_235;
{
    const { footer: __VLS_thisSlot } = __VLS_231.slots;
    const __VLS_296 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
        ...{ 'onClick': {} },
    }));
    const __VLS_298 = __VLS_297({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
    let __VLS_300;
    let __VLS_301;
    let __VLS_302;
    const __VLS_303 = {
        onClick: (...[$event]) => {
            __VLS_ctx.addVisible = false;
        }
    };
    __VLS_299.slots.default;
    var __VLS_299;
    const __VLS_304 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.addLoading),
    }));
    const __VLS_306 = __VLS_305({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.addLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_305));
    let __VLS_308;
    let __VLS_309;
    let __VLS_310;
    const __VLS_311 = {
        onClick: (__VLS_ctx.handleAddSubmit)
    };
    __VLS_307.slots.default;
    var __VLS_307;
}
var __VLS_231;
const __VLS_312 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
    modelValue: (__VLS_ctx.editVisible),
    title: "编辑图书",
    width: "500px",
    alignCenter: true,
}));
const __VLS_314 = __VLS_313({
    modelValue: (__VLS_ctx.editVisible),
    title: "编辑图书",
    width: "500px",
    alignCenter: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_313));
__VLS_315.slots.default;
const __VLS_316 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
    model: (__VLS_ctx.currentBook),
    labelWidth: "80px",
}));
const __VLS_318 = __VLS_317({
    model: (__VLS_ctx.currentBook),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_317));
__VLS_319.slots.default;
const __VLS_320 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
    label: "书名",
}));
const __VLS_322 = __VLS_321({
    label: "书名",
}, ...__VLS_functionalComponentArgsRest(__VLS_321));
__VLS_323.slots.default;
const __VLS_324 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
    modelValue: (__VLS_ctx.currentBook.title),
}));
const __VLS_326 = __VLS_325({
    modelValue: (__VLS_ctx.currentBook.title),
}, ...__VLS_functionalComponentArgsRest(__VLS_325));
var __VLS_323;
const __VLS_328 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
    label: "作者",
}));
const __VLS_330 = __VLS_329({
    label: "作者",
}, ...__VLS_functionalComponentArgsRest(__VLS_329));
__VLS_331.slots.default;
const __VLS_332 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
    modelValue: (__VLS_ctx.currentBook.author),
}));
const __VLS_334 = __VLS_333({
    modelValue: (__VLS_ctx.currentBook.author),
}, ...__VLS_functionalComponentArgsRest(__VLS_333));
var __VLS_331;
const __VLS_336 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
    label: "出版社",
}));
const __VLS_338 = __VLS_337({
    label: "出版社",
}, ...__VLS_functionalComponentArgsRest(__VLS_337));
__VLS_339.slots.default;
const __VLS_340 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({
    modelValue: (__VLS_ctx.currentBook.publisher),
}));
const __VLS_342 = __VLS_341({
    modelValue: (__VLS_ctx.currentBook.publisher),
}, ...__VLS_functionalComponentArgsRest(__VLS_341));
var __VLS_339;
const __VLS_344 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
    label: "定价",
}));
const __VLS_346 = __VLS_345({
    label: "定价",
}, ...__VLS_functionalComponentArgsRest(__VLS_345));
__VLS_347.slots.default;
const __VLS_348 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
    modelValue: (__VLS_ctx.currentBook.price),
    precision: (2),
    step: (0.1),
}));
const __VLS_350 = __VLS_349({
    modelValue: (__VLS_ctx.currentBook.price),
    precision: (2),
    step: (0.1),
}, ...__VLS_functionalComponentArgsRest(__VLS_349));
var __VLS_347;
const __VLS_352 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({
    label: "总库存",
}));
const __VLS_354 = __VLS_353({
    label: "总库存",
}, ...__VLS_functionalComponentArgsRest(__VLS_353));
__VLS_355.slots.default;
const __VLS_356 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({
    modelValue: (__VLS_ctx.currentBook.total_quantity),
    min: (1),
}));
const __VLS_358 = __VLS_357({
    modelValue: (__VLS_ctx.currentBook.total_quantity),
    min: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_357));
var __VLS_355;
var __VLS_319;
{
    const { footer: __VLS_thisSlot } = __VLS_315.slots;
    const __VLS_360 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
        ...{ 'onClick': {} },
    }));
    const __VLS_362 = __VLS_361({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_361));
    let __VLS_364;
    let __VLS_365;
    let __VLS_366;
    const __VLS_367 = {
        onClick: (...[$event]) => {
            __VLS_ctx.editVisible = false;
        }
    };
    __VLS_363.slots.default;
    var __VLS_363;
    const __VLS_368 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_369 = __VLS_asFunctionalComponent(__VLS_368, new __VLS_368({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_370 = __VLS_369({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_369));
    let __VLS_372;
    let __VLS_373;
    let __VLS_374;
    const __VLS_375 = {
        onClick: (__VLS_ctx.saveEdit)
    };
    __VLS_371.slots.default;
    var __VLS_371;
}
var __VLS_315;
const __VLS_376 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_377 = __VLS_asFunctionalComponent(__VLS_376, new __VLS_376({
    modelValue: (__VLS_ctx.exportVisible),
    title: "导出图书数据",
    width: "400px",
    alignCenter: true,
}));
const __VLS_378 = __VLS_377({
    modelValue: (__VLS_ctx.exportVisible),
    title: "导出图书数据",
    width: "400px",
    alignCenter: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_377));
__VLS_379.slots.default;
const __VLS_380 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_381 = __VLS_asFunctionalComponent(__VLS_380, new __VLS_380({
    labelPosition: "top",
}));
const __VLS_382 = __VLS_381({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_381));
__VLS_383.slots.default;
const __VLS_384 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_385 = __VLS_asFunctionalComponent(__VLS_384, new __VLS_384({
    label: "选择导出格式",
}));
const __VLS_386 = __VLS_385({
    label: "选择导出格式",
}, ...__VLS_functionalComponentArgsRest(__VLS_385));
__VLS_387.slots.default;
const __VLS_388 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_389 = __VLS_asFunctionalComponent(__VLS_388, new __VLS_388({
    modelValue: (__VLS_ctx.exportFormat),
}));
const __VLS_390 = __VLS_389({
    modelValue: (__VLS_ctx.exportFormat),
}, ...__VLS_functionalComponentArgsRest(__VLS_389));
__VLS_391.slots.default;
const __VLS_392 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
    value: "csv",
}));
const __VLS_394 = __VLS_393({
    value: "csv",
}, ...__VLS_functionalComponentArgsRest(__VLS_393));
__VLS_395.slots.default;
var __VLS_395;
const __VLS_396 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_397 = __VLS_asFunctionalComponent(__VLS_396, new __VLS_396({
    value: "json",
}));
const __VLS_398 = __VLS_397({
    value: "json",
}, ...__VLS_functionalComponentArgsRest(__VLS_397));
__VLS_399.slots.default;
var __VLS_399;
var __VLS_391;
var __VLS_387;
var __VLS_383;
{
    const { footer: __VLS_thisSlot } = __VLS_379.slots;
    const __VLS_400 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_401 = __VLS_asFunctionalComponent(__VLS_400, new __VLS_400({
        ...{ 'onClick': {} },
    }));
    const __VLS_402 = __VLS_401({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_401));
    let __VLS_404;
    let __VLS_405;
    let __VLS_406;
    const __VLS_407 = {
        onClick: (...[$event]) => {
            __VLS_ctx.exportVisible = false;
        }
    };
    __VLS_403.slots.default;
    var __VLS_403;
    const __VLS_408 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_409 = __VLS_asFunctionalComponent(__VLS_408, new __VLS_408({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.exportLoading),
    }));
    const __VLS_410 = __VLS_409({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.exportLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_409));
    let __VLS_412;
    let __VLS_413;
    let __VLS_414;
    const __VLS_415 = {
        onClick: (__VLS_ctx.handleExport)
    };
    __VLS_411.slots.default;
    var __VLS_411;
}
var __VLS_379;
/** @type {__VLS_StyleScopedClasses['books-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header-left']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['header-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['gradient-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-card']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-1']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-row']} */ ;
/** @type {__VLS_StyleScopedClasses['search-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['search-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-chips']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-2']} */ ;
/** @type {__VLS_StyleScopedClasses['book-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['book-spine']} */ ;
/** @type {__VLS_StyleScopedClasses['book-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['book-title']} */ ;
/** @type {__VLS_StyleScopedClasses['book-isbn']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['purple']} */ ;
/** @type {__VLS_StyleScopedClasses['text-secondary-small']} */ ;
/** @type {__VLS_StyleScopedClasses['stock-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['stock-text']} */ ;
/** @type {__VLS_StyleScopedClasses['stock-avail']} */ ;
/** @type {__VLS_StyleScopedClasses['stock-total']} */ ;
/** @type {__VLS_StyleScopedClasses['action-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-info']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tab']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Search: Search,
            Plus: Plus,
            Download: Download,
            Operation: Operation,
            Refresh: Refresh,
            Edit: Edit,
            Delete: Delete,
            Tickets: Tickets,
            Warning: Warning,
            canManage: canManage,
            bookList: bookList,
            total: total,
            loading: loading,
            borrowing: borrowing,
            page: page,
            searchQuery: searchQuery,
            selectedCategory: selectedCategory,
            debounceFetch: debounceFetch,
            resetFilters: resetFilters,
            categories: categories,
            categoryNames: categoryNames,
            advancedSearchVisible: advancedSearchVisible,
            searchType: searchType,
            advTabs: advTabs,
            regexError: regexError,
            advancedForm: advancedForm,
            getSearchPlaceholder: getSearchPlaceholder,
            validateRegex: validateRegex,
            getSpineColor: getSpineColor,
            availOf: availOf,
            totalOf: totalOf,
            stockPercent: stockPercent,
            stockStatus: stockStatus,
            highlightText: highlightText,
            addVisible: addVisible,
            addForm: addForm,
            addLoading: addLoading,
            editVisible: editVisible,
            currentBook: currentBook,
            exportVisible: exportVisible,
            exportFormat: exportFormat,
            exportLoading: exportLoading,
            fetchData: fetchData,
            handleAdvancedSearch: handleAdvancedSearch,
            openAddDialog: openAddDialog,
            handleAddSubmit: handleAddSubmit,
            openEditDialog: openEditDialog,
            saveEdit: saveEdit,
            handleDelete: handleDelete,
            handleExport: handleExport,
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