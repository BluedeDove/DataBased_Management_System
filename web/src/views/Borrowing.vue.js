/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { User, Reading } from '@element-plus/icons-vue';
import { useUserStore } from '@/store/user';
import { readerApi } from '../api/reader.api';
import { bookApi } from '../api/book.api';
import { borrowingApi } from '../api/borrowing.api';
const userStore = useUserStore();
const borrowedBooks = ref([]);
const allRecords = ref([]);
const returnSearchKeyword = ref('');
const dateRange = ref(null);
const overdueCount = ref(0);
// Loading states
const isBorrowing = ref(false);
const returningBooks = ref(new Set());
const renewingBooks = ref(new Set());
// Role permissions
const userRole = computed(() => userStore.user?.role || '');
const isAdmin = computed(() => userRole.value === 'admin');
const isLibrarian = computed(() => userRole.value === 'librarian');
const canViewAllRecords = computed(() => isAdmin.value || isLibrarian.value);
const currentUserName = computed(() => userStore.user?.name || '');
// Tabs
const activeTab = ref(canViewAllRecords.value ? 'borrow' : 'return');
const pageTitle = computed(() => {
    return canViewAllRecords.value ? '借还管理' : '我的借还';
});
const pageDescription = computed(() => {
    return canViewAllRecords.value ? '处理图书借阅和归还' : '管理我的借阅记录';
});
const borrowForm = reactive({
    readerNo: '',
    bookIsbn: ''
});
// Search result dialogs
const readerSelectDialogVisible = ref(false);
const bookSelectDialogVisible = ref(false);
const searchReaderResults = ref([]);
const searchBookResults = ref([]);
const selectedReader = ref(null);
const selectedBook = ref(null);
// Status label helper
const statusLabel = (status) => {
    switch (status) {
        case 'borrowed': return '借阅中';
        case 'returned': return '已归还';
        case 'overdue': return '逾期';
        case 'lost': return '丢失';
        default: return status;
    }
};
// Filter records: teacher / student can only see their own
const filterRecordsByUser = (records) => {
    if (canViewAllRecords.value) {
        return records;
    }
    return records.filter((record) => record.reader_name && currentUserName.value &&
        (record.reader_name.includes(currentUserName.value) ||
            currentUserName.value.includes(record.reader_name)));
};
// Switch tab
const switchTab = (name) => {
    activeTab.value = name;
    handleTabChange(name);
};
// Search reader
const searchReader = async () => {
    if (!borrowForm.readerNo) {
        ElMessage.warning('请输入读者编号或姓名');
        return;
    }
    const result = await readerApi.search(borrowForm.readerNo);
    if (result.success && result.data.length > 0) {
        if (result.data.length === 1) {
            selectedReader.value = result.data[0];
            ElMessage.success(`找到读者：${result.data[0].name}`);
        }
        else {
            searchReaderResults.value = result.data;
            readerSelectDialogVisible.value = true;
        }
    }
    else {
        ElMessage.warning('未找到匹配的读者');
    }
};
// Select reader from dialog
const handleSelectReader = (reader) => {
    selectedReader.value = reader;
    readerSelectDialogVisible.value = false;
    ElMessage.success(`已选择读者：${reader.name}`);
};
// Search book
const searchBook = async () => {
    if (!borrowForm.bookIsbn) {
        ElMessage.warning('请输入图书ISBN或书名');
        return;
    }
    const result = await bookApi.getAll({ keyword: borrowForm.bookIsbn });
    if (result.success && result.data.length > 0) {
        if (result.data.length === 1) {
            selectedBook.value = result.data[0];
            ElMessage.success(`找到图书：${result.data[0].title}`);
        }
        else {
            searchBookResults.value = result.data;
            bookSelectDialogVisible.value = true;
        }
    }
    else {
        ElMessage.warning('未找到匹配的图书');
    }
};
// Select book from dialog
const handleSelectBook = (book) => {
    selectedBook.value = book;
    bookSelectDialogVisible.value = false;
    ElMessage.success(`已选择图书：${book.title}`);
};
// Borrow operation
const handleBorrow = async () => {
    if (!selectedReader.value) {
        ElMessage.warning('请先选择读者（输入编号或姓名后点击搜索）');
        return;
    }
    if (!selectedBook.value) {
        ElMessage.warning('请先选择图书（输入ISBN或书名后点击搜索）');
        return;
    }
    if (selectedBook.value.available_quantity <= 0) {
        ElMessage.error('该图书暂时无可借库存，请选择其他图书');
        return;
    }
    isBorrowing.value = true;
    try {
        const borrowResult = await borrowingApi.borrow(selectedReader.value.id, selectedBook.value.id);
        if (borrowResult.success) {
            ElMessage.success('借阅成功！');
            borrowForm.readerNo = '';
            borrowForm.bookIsbn = '';
            selectedReader.value = null;
            selectedBook.value = null;
            await searchBorrowedBooks();
        }
        else {
            const errorMsg = borrowResult.error?.message || '借阅失败';
            if (errorMsg.includes('暂无可借图书')) {
                ElMessage.error('该图书暂时无可借库存，请稍后再试');
            }
            else if (errorMsg.includes('已达到最大借阅数量')) {
                ElMessage.error('该读者已达到最大借阅数量，请先归还部分图书');
            }
            else if (errorMsg.includes('逾期未还')) {
                ElMessage.error('该读者有图书逾期未还，请先归还逾期图书');
            }
            else {
                ElMessage.error(errorMsg);
            }
        }
    }
    catch (error) {
        ElMessage.error('借阅操作失败，请重试');
    }
    finally {
        isBorrowing.value = false;
    }
};
// Return operation
const handleReturn = async (row) => {
    const bookId = row.id;
    returningBooks.value.add(bookId);
    try {
        const result = await borrowingApi.return(bookId);
        if (result.success) {
            ElMessage.success('还书成功！');
            searchBorrowedBooks();
        }
        else {
            ElMessage.error(result.error?.message || '还书失败');
        }
    }
    catch (error) {
        console.error('还书操作失败:', error);
    }
    finally {
        returningBooks.value.delete(bookId);
    }
};
// Renew operation
const handleRenew = async (row) => {
    const bookId = row.id;
    renewingBooks.value.add(bookId);
    try {
        const result = await borrowingApi.renew(bookId);
        if (result.success) {
            ElMessage.success('续借成功！');
            searchBorrowedBooks();
        }
        else {
            ElMessage.error(result.error?.message || '续借失败');
        }
    }
    catch (error) {
        console.error('续借操作失败:', error);
    }
    finally {
        renewingBooks.value.delete(bookId);
    }
};
// Search borrowed books (return tab)
const searchBorrowedBooks = async () => {
    const searchParams = {
        status: 'borrowed'
    };
    if (returnSearchKeyword.value) {
        searchParams.keyword = returnSearchKeyword.value;
    }
    if (dateRange.value && dateRange.value.length === 2) {
        searchParams.borrow_date_from = dateRange.value[0].toISOString().split('T')[0];
        searchParams.borrow_date_to = dateRange.value[1].toISOString().split('T')[0];
    }
    const result = await borrowingApi.getAll(searchParams);
    if (result.success) {
        borrowedBooks.value = filterRecordsByUser(result.data);
        if (!canViewAllRecords.value) {
            overdueCount.value = borrowedBooks.value.filter((r) => isOverdue(r.due_date)).length;
        }
    }
};
// Check if overdue
const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
};
// Load all records (history tab)
const loadAllRecords = async () => {
    const searchParams = {};
    if (returnSearchKeyword.value) {
        searchParams.keyword = returnSearchKeyword.value;
    }
    if (dateRange.value && dateRange.value.length === 2) {
        searchParams.borrow_date_from = dateRange.value[0].toISOString().split('T')[0];
        searchParams.borrow_date_to = dateRange.value[1].toISOString().split('T')[0];
    }
    const result = await borrowingApi.getAll(searchParams);
    if (result.success) {
        allRecords.value = filterRecordsByUser(result.data);
    }
};
// Tab change handler
const handleTabChange = (name) => {
    if (name === 'return') {
        searchBorrowedBooks();
    }
    else if (name === 'history') {
        loadAllRecords();
    }
};
// Delete record
const handleDeleteRecord = async (row) => {
    if (row.status !== 'returned') {
        ElMessage.warning('只能删除已归还的借阅记录');
        return;
    }
    try {
        await ElMessageBox.confirm(`确定要删除这条借阅记录吗？\n读者：${row.reader_name}\n图书：${row.book_title}`, '删除确认', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        });
        const result = await borrowingApi.delete(row.id);
        if (result.success) {
            ElMessage.success('删除成功');
            loadAllRecords();
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
onMounted(() => {
    searchBorrowedBooks();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['header-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['banner-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['book-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['gradient-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['gradient-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['gradient-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['gradient-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['search-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-table']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-table']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-table']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-table']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-table']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-table']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-table']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-table']} */ ;
/** @type {__VLS_StyleScopedClasses['overdue-row']} */ ;
/** @type {__VLS_StyleScopedClasses['overdue-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['action-success']} */ ;
/** @type {__VLS_StyleScopedClasses['action-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['action-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['gradient-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['search-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['search-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['search-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "borrowing-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-left" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
    x1: "12",
    y1: "6",
    x2: "12",
    y2: "13",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
    x1: "9",
    y1: "10",
    x2: "15",
    y2: "10",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "page-title" },
});
(__VLS_ctx.pageTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "header-bar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "page-sub" },
});
(__VLS_ctx.pageDescription);
if (!__VLS_ctx.canViewAllRecords && __VLS_ctx.overdueCount > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overdue-banner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "banner-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        x1: "12",
        y1: "9",
        x2: "12",
        y2: "13",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        x1: "12",
        y1: "17",
        x2: "12.01",
        y2: "17",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "banner-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "banner-title" },
    });
    (__VLS_ctx.overdueCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "banner-desc" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "pill-tabs" },
});
if (__VLS_ctx.canViewAllRecords) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.canViewAllRecords))
                    return;
                __VLS_ctx.switchTab('borrow');
            } },
        ...{ class: "pill-tab" },
        ...{ class: ({ active: __VLS_ctx.activeTab === 'borrow' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        ...{ class: "tab-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        x1: "12",
        y1: "6",
        x2: "12",
        y2: "13",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        x1: "9",
        y1: "10",
        x2: "15",
        y2: "10",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.switchTab('return');
        } },
    ...{ class: "pill-tab" },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'return' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    ...{ class: "tab-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
    points: "1 4 1 10 7 10",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M3.51 15a9 9 0 1 0 2.13-9.36L1 10",
});
(__VLS_ctx.canViewAllRecords ? '还书' : '当前借阅');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.switchTab('history');
        } },
    ...{ class: "pill-tab" },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'history' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    ...{ class: "tab-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
    points: "14 2 14 8 20 8",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
    x1: "16",
    y1: "13",
    x2: "8",
    y2: "13",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
    x1: "16",
    y1: "17",
    x2: "8",
    y2: "17",
});
(__VLS_ctx.canViewAllRecords ? '借阅记录' : '历史记录');
if (__VLS_ctx.activeTab === 'borrow' && __VLS_ctx.canViewAllRecords) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tab-content borrow-tab" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card borrow-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        x1: "12",
        y1: "6",
        x2: "12",
        y2: "13",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        x1: "9",
        y1: "10",
        x2: "15",
        y2: "10",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "section-desc" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-fields" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "field-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        ...{ class: "field-label-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        cx: "12",
        cy: "7",
        r: "4",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-input-row" },
    });
    const __VLS_0 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.borrowForm.readerNo),
        placeholder: "输入编号或姓名搜索",
        size: "large",
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.borrowForm.readerNo),
        placeholder: "输入编号或姓名搜索",
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onKeyup: (__VLS_ctx.searchReader)
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
        const __VLS_12 = {}.User;
        /** @type {[typeof __VLS_components.User, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
        const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
        var __VLS_11;
    }
    var __VLS_3;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.searchReader) },
        ...{ class: "icon-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        cx: "11",
        cy: "11",
        r: "8",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        x1: "21",
        y1: "21",
        x2: "16.65",
        y2: "16.65",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "field-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        ...{ class: "field-label-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-input-row" },
    });
    const __VLS_16 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.borrowForm.bookIsbn),
        placeholder: "输入ISBN或书名搜索",
        size: "large",
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.borrowForm.bookIsbn),
        placeholder: "输入ISBN或书名搜索",
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onKeyup: (__VLS_ctx.searchBook)
    };
    __VLS_19.slots.default;
    {
        const { prefix: __VLS_thisSlot } = __VLS_19.slots;
        const __VLS_24 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
        const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_27.slots.default;
        const __VLS_28 = {}.Reading;
        /** @type {[typeof __VLS_components.Reading, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({}));
        const __VLS_30 = __VLS_29({}, ...__VLS_functionalComponentArgsRest(__VLS_29));
        var __VLS_27;
    }
    var __VLS_19;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.searchBook) },
        ...{ class: "icon-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        cx: "11",
        cy: "11",
        r: "8",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        x1: "21",
        y1: "21",
        x2: "16.65",
        y2: "16.65",
    });
    if (__VLS_ctx.selectedReader || __VLS_ctx.selectedBook) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "selected-panel" },
        });
        if (__VLS_ctx.selectedReader) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "selected-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "selected-avatar" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                'stroke-width': "2",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
                d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
                cx: "12",
                cy: "7",
                r: "4",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "selected-detail" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "selected-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "selected-value" },
            });
            (__VLS_ctx.selectedReader.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "pill-badge badge-blue" },
            });
            (__VLS_ctx.selectedReader.reader_no);
        }
        if (__VLS_ctx.selectedBook) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "selected-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "selected-avatar book-avatar" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                'stroke-width': "2",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
                d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
                d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "selected-detail" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "selected-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "selected-value" },
            });
            (__VLS_ctx.selectedBook.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "pill-badge badge-purple" },
            });
            (__VLS_ctx.selectedBook.isbn);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "pill-badge" },
                ...{ class: (__VLS_ctx.selectedBook.available_quantity > 0 ? 'badge-green' : 'badge-red') },
            });
            (__VLS_ctx.selectedBook.available_quantity);
            (__VLS_ctx.selectedBook.total_quantity);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "borrow-action" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleBorrow) },
        ...{ class: "gradient-btn" },
        ...{ class: ({ loading: __VLS_ctx.isBorrowing }) },
        disabled: (__VLS_ctx.isBorrowing),
    });
    if (!__VLS_ctx.isBorrowing) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
            points: "20 6 9 17 4 12",
        });
    }
    if (__VLS_ctx.isBorrowing) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "spinner" },
        });
    }
    (__VLS_ctx.isBorrowing ? '借书中...' : '确认借书');
}
if (__VLS_ctx.activeTab === 'return') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tab-content return-tab" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-bar" },
    });
    const __VLS_32 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.returnSearchKeyword),
        placeholder: "搜索读者编号/姓名、图书ISBN/书名...",
        size: "large",
        clearable: true,
        ...{ class: "search-input" },
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.returnSearchKeyword),
        placeholder: "搜索读者编号/姓名、图书ISBN/书名...",
        size: "large",
        clearable: true,
        ...{ class: "search-input" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_36;
    let __VLS_37;
    let __VLS_38;
    const __VLS_39 = {
        onKeyup: (__VLS_ctx.searchBorrowedBooks)
    };
    __VLS_35.slots.default;
    {
        const { prefix: __VLS_thisSlot } = __VLS_35.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
            cx: "11",
            cy: "11",
            r: "8",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
            x1: "21",
            y1: "21",
            x2: "16.65",
            y2: "16.65",
        });
    }
    var __VLS_35;
    const __VLS_40 = {}.ElDatePicker;
    /** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.dateRange),
        type: "daterange",
        rangeSeparator: "-",
        startPlaceholder: "起始日期",
        endPlaceholder: "结束日期",
        size: "large",
        clearable: true,
        ...{ style: {} },
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.dateRange),
        type: "daterange",
        rangeSeparator: "-",
        startPlaceholder: "起始日期",
        endPlaceholder: "结束日期",
        size: "large",
        clearable: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onChange: (__VLS_ctx.searchBorrowedBooks)
    };
    var __VLS_43;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.searchBorrowedBooks) },
        ...{ class: "icon-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        cx: "11",
        cy: "11",
        r: "8",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        x1: "21",
        y1: "21",
        x2: "16.65",
        y2: "16.65",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modern-table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "modern-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    if (__VLS_ctx.canViewAllRecords) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    if (!__VLS_ctx.canViewAllRecords) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.borrowedBooks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (row.id),
            ...{ class: ({ 'overdue-row': __VLS_ctx.isOverdue(row.due_date) }) },
        });
        if (__VLS_ctx.canViewAllRecords) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "td-reader" },
            });
            (row.reader_name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "td-book" },
        });
        (row.book_title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "td-date" },
        });
        (row.borrow_date);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "td-date" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "due-cell" },
        });
        if (__VLS_ctx.isOverdue(row.due_date)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "overdue-indicator" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                'stroke-width': "2",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
                d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
                x1: "12",
                y1: "9",
                x2: "12",
                y2: "13",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
                x1: "12",
                y1: "17",
                x2: "12.01",
                y2: "17",
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.isOverdue(row.due_date) ? 'text-danger' : '') },
        });
        (row.due_date);
        if (!__VLS_ctx.canViewAllRecords) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            if (__VLS_ctx.isOverdue(row.due_date)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "pill-badge badge-red" },
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "pill-badge badge-green" },
                });
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "td-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'return'))
                        return;
                    __VLS_ctx.handleReturn(row);
                } },
            ...{ class: "action-btn action-success" },
            ...{ class: ({ loading: __VLS_ctx.returningBooks.has(row.id) }) },
            disabled: (__VLS_ctx.returningBooks.has(row.id)),
        });
        if (__VLS_ctx.returningBooks.has(row.id)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                ...{ class: "spinner small" },
            });
        }
        (__VLS_ctx.returningBooks.has(row.id) ? '还书中' : '还书');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'return'))
                        return;
                    __VLS_ctx.handleRenew(row);
                } },
            ...{ class: "action-btn action-primary" },
            disabled: (__VLS_ctx.isOverdue(row.due_date) || __VLS_ctx.renewingBooks.has(row.id)),
            ...{ class: ({ loading: __VLS_ctx.renewingBooks.has(row.id) }) },
        });
        if (__VLS_ctx.renewingBooks.has(row.id)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                ...{ class: "spinner small" },
            });
        }
        (__VLS_ctx.renewingBooks.has(row.id) ? '续借中' : '续借');
    }
    if (__VLS_ctx.borrowedBooks.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: (__VLS_ctx.canViewAllRecords ? 5 : 5),
            ...{ class: "empty-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "1.5",
            ...{ class: "empty-icon" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
if (__VLS_ctx.activeTab === 'history') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tab-content history-tab" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modern-table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "modern-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        ...{ class: "th-index" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    if (__VLS_ctx.canViewAllRecords) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [row, idx] of __VLS_getVForSourceType((__VLS_ctx.allRecords))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (row.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "td-index" },
        });
        (idx + 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "td-reader" },
        });
        (row.reader_name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "td-book" },
        });
        (row.book_title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "td-date" },
        });
        (row.borrow_date);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "td-date" },
        });
        (row.return_date || '-');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "pill-badge" },
            ...{ class: ({
                    'badge-warning': row.status === 'borrowed',
                    'badge-green': row.status === 'returned',
                    'badge-red': row.status === 'overdue',
                    'badge-blue': row.status === 'lost'
                }) },
        });
        (__VLS_ctx.statusLabel(row.status));
        if (__VLS_ctx.canViewAllRecords) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "td-actions" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeTab === 'history'))
                            return;
                        if (!(__VLS_ctx.canViewAllRecords))
                            return;
                        __VLS_ctx.handleDeleteRecord(row);
                    } },
                ...{ class: "action-btn action-danger" },
                disabled: (row.status !== 'returned'),
            });
        }
    }
    if (__VLS_ctx.allRecords.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: (__VLS_ctx.canViewAllRecords ? 7 : 6),
            ...{ class: "empty-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "1.5",
            ...{ class: "empty-icon" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
            points: "14 2 14 8 20 8",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
const __VLS_48 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    modelValue: (__VLS_ctx.readerSelectDialogVisible),
    title: "选择读者",
    width: "600px",
    destroyOnClose: true,
    ...{ class: "modern-dialog" },
}));
const __VLS_50 = __VLS_49({
    modelValue: (__VLS_ctx.readerSelectDialogVisible),
    title: "选择读者",
    width: "600px",
    destroyOnClose: true,
    ...{ class: "modern-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
const __VLS_52 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    data: (__VLS_ctx.searchReaderResults),
    ...{ style: {} },
    maxHeight: "400px",
    ...{ class: "custom-table" },
}));
const __VLS_54 = __VLS_53({
    data: (__VLS_ctx.searchReaderResults),
    ...{ style: {} },
    maxHeight: "400px",
    ...{ class: "custom-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    prop: "reader_no",
    label: "编号",
    width: "120",
}));
const __VLS_58 = __VLS_57({
    prop: "reader_no",
    label: "编号",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
const __VLS_60 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    prop: "name",
    label: "姓名",
    width: "120",
}));
const __VLS_62 = __VLS_61({
    prop: "name",
    label: "姓名",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
const __VLS_64 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    prop: "category_name",
    label: "类型",
    width: "100",
}));
const __VLS_66 = __VLS_65({
    prop: "category_name",
    label: "类型",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
const __VLS_68 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    prop: "phone",
    label: "电话",
}));
const __VLS_70 = __VLS_69({
    prop: "phone",
    label: "电话",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
const __VLS_72 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    label: "操作",
    width: "80",
}));
const __VLS_74 = __VLS_73({
    label: "操作",
    width: "80",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_75.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_75.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.handleSelectReader(row);
            } },
        ...{ class: "action-btn action-primary" },
    });
}
var __VLS_75;
var __VLS_55;
var __VLS_51;
const __VLS_76 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    modelValue: (__VLS_ctx.bookSelectDialogVisible),
    title: "选择图书",
    width: "800px",
    destroyOnClose: true,
    ...{ class: "modern-dialog" },
}));
const __VLS_78 = __VLS_77({
    modelValue: (__VLS_ctx.bookSelectDialogVisible),
    title: "选择图书",
    width: "800px",
    destroyOnClose: true,
    ...{ class: "modern-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
const __VLS_80 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    data: (__VLS_ctx.searchBookResults),
    ...{ style: {} },
    maxHeight: "400px",
    ...{ class: "custom-table" },
}));
const __VLS_82 = __VLS_81({
    data: (__VLS_ctx.searchBookResults),
    ...{ style: {} },
    maxHeight: "400px",
    ...{ class: "custom-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
const __VLS_84 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    prop: "isbn",
    label: "ISBN",
    width: "140",
}));
const __VLS_86 = __VLS_85({
    prop: "isbn",
    label: "ISBN",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
const __VLS_88 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    prop: "title",
    label: "书名",
}));
const __VLS_90 = __VLS_89({
    prop: "title",
    label: "书名",
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
const __VLS_92 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    prop: "author",
    label: "作者",
    width: "120",
}));
const __VLS_94 = __VLS_93({
    prop: "author",
    label: "作者",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
const __VLS_96 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    label: "库存",
    width: "100",
}));
const __VLS_98 = __VLS_97({
    label: "库存",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_99.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (row.available_quantity);
    (row.total_quantity);
}
var __VLS_99;
const __VLS_100 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    label: "操作",
    width: "80",
}));
const __VLS_102 = __VLS_101({
    label: "操作",
    width: "80",
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_103.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_103.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.handleSelectBook(row);
            } },
        ...{ class: "action-btn action-primary" },
    });
}
var __VLS_103;
var __VLS_83;
var __VLS_79;
/** @type {__VLS_StyleScopedClasses['borrowing-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['header-left']} */ ;
/** @type {__VLS_StyleScopedClasses['header-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['header-text']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['header-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['page-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['overdue-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['banner-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['banner-body']} */ ;
/** @type {__VLS_StyleScopedClasses['banner-title']} */ ;
/** @type {__VLS_StyleScopedClasses['banner-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-content']} */ ;
/** @type {__VLS_StyleScopedClasses['borrow-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['borrow-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['section-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['search-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-item']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-label']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-value']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['badge-blue']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-item']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['book-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-label']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-value']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['badge-purple']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['borrow-action']} */ ;
/** @type {__VLS_StyleScopedClasses['gradient-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-content']} */ ;
/** @type {__VLS_StyleScopedClasses['return-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['search-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-table']} */ ;
/** @type {__VLS_StyleScopedClasses['td-reader']} */ ;
/** @type {__VLS_StyleScopedClasses['td-book']} */ ;
/** @type {__VLS_StyleScopedClasses['td-date']} */ ;
/** @type {__VLS_StyleScopedClasses['td-date']} */ ;
/** @type {__VLS_StyleScopedClasses['due-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['overdue-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['badge-red']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['badge-green']} */ ;
/** @type {__VLS_StyleScopedClasses['td-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['action-success']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['action-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-row']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-content']} */ ;
/** @type {__VLS_StyleScopedClasses['history-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-table']} */ ;
/** @type {__VLS_StyleScopedClasses['th-index']} */ ;
/** @type {__VLS_StyleScopedClasses['td-index']} */ ;
/** @type {__VLS_StyleScopedClasses['td-reader']} */ ;
/** @type {__VLS_StyleScopedClasses['td-book']} */ ;
/** @type {__VLS_StyleScopedClasses['td-date']} */ ;
/** @type {__VLS_StyleScopedClasses['td-date']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['td-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['action-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-row']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-table']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['action-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['modern-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-table']} */ ;
/** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['action-primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            User: User,
            Reading: Reading,
            borrowedBooks: borrowedBooks,
            allRecords: allRecords,
            returnSearchKeyword: returnSearchKeyword,
            dateRange: dateRange,
            overdueCount: overdueCount,
            isBorrowing: isBorrowing,
            returningBooks: returningBooks,
            renewingBooks: renewingBooks,
            canViewAllRecords: canViewAllRecords,
            activeTab: activeTab,
            pageTitle: pageTitle,
            pageDescription: pageDescription,
            borrowForm: borrowForm,
            readerSelectDialogVisible: readerSelectDialogVisible,
            bookSelectDialogVisible: bookSelectDialogVisible,
            searchReaderResults: searchReaderResults,
            searchBookResults: searchBookResults,
            selectedReader: selectedReader,
            selectedBook: selectedBook,
            statusLabel: statusLabel,
            switchTab: switchTab,
            searchReader: searchReader,
            handleSelectReader: handleSelectReader,
            searchBook: searchBook,
            handleSelectBook: handleSelectBook,
            handleBorrow: handleBorrow,
            handleReturn: handleReturn,
            handleRenew: handleRenew,
            searchBorrowedBooks: searchBorrowedBooks,
            isOverdue: isOverdue,
            handleDeleteRecord: handleDeleteRecord,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=Borrowing.vue.js.map