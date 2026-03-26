/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Loading, WarningFilled, Notebook, User, Reading, Check, RefreshRight, Document } from '@element-plus/icons-vue';
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
// 加载状态
const isBorrowing = ref(false);
const returningBooks = ref(new Set());
const renewingBooks = ref(new Set());
// 角色权限相关
const userRole = computed(() => userStore.user?.role || '');
const isAdmin = computed(() => userRole.value === 'admin');
const isLibrarian = computed(() => userRole.value === 'librarian');
const canViewAllRecords = computed(() => isAdmin.value || isLibrarian.value);
const currentUserName = computed(() => userStore.user?.name || '');
// 根据角色设置默认标签页和页面信息
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
// 搜索结果选择对话框
const readerSelectDialogVisible = ref(false);
const bookSelectDialogVisible = ref(false);
const searchReaderResults = ref([]);
const searchBookResults = ref([]);
const selectedReader = ref(null);
const selectedBook = ref(null);
// 过滤记录：教师和学生只能看到自己的记录
const filterRecordsByUser = (records) => {
    if (canViewAllRecords.value) {
        return records;
    }
    return records.filter((record) => record.reader_name && currentUserName.value &&
        (record.reader_name.includes(currentUserName.value) ||
            currentUserName.value.includes(record.reader_name)));
};
// 搜索读者
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
// 选择读者
const handleSelectReader = (reader) => {
    selectedReader.value = reader;
    readerSelectDialogVisible.value = false;
    ElMessage.success(`已选择读者：${reader.name}`);
};
// 搜索图书
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
// 选择图书
const handleSelectBook = (book) => {
    selectedBook.value = book;
    bookSelectDialogVisible.value = false;
    ElMessage.success(`已选择图书：${book.title}`);
};
// 借书操作
const handleBorrow = async () => {
    if (!selectedReader.value) {
        ElMessage.warning('请先选择读者（输入编号或姓名后点击搜索图标）');
        return;
    }
    if (!selectedBook.value) {
        ElMessage.warning('请先选择图书（输入ISBN或书名后点击搜索图标）');
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
                ElMessage.error(`该读者已达到最大借阅数量，请先归还部分图书`);
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
// 还书操作
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
// 续借操作
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
const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
};
const getRowClassName = ({ row }) => {
    if (isOverdue(row.due_date)) {
        return 'overdue-row';
    }
    return '';
};
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
const handleTabChange = (name) => {
    if (name === 'return') {
        searchBorrowedBooks();
    }
    else if (name === 'history') {
        loadAllRecords();
    }
};
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
/** @type {__VLS_StyleScopedClasses['header-text']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['overdue-row']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button--text']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "title-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "page-title" },
});
(__VLS_ctx.pageTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "gdut-bar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "page-description" },
});
(__VLS_ctx.pageDescription);
if (!__VLS_ctx.canViewAllRecords && __VLS_ctx.overdueCount > 0) {
    const __VLS_0 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        type: "error",
        title: (`您有 ${__VLS_ctx.overdueCount} 本图书已逾期，请尽快归还！`),
        closable: (false),
        showIcon: true,
        ...{ class: "alert-banner" },
    }));
    const __VLS_2 = __VLS_1({
        type: "error",
        title: (`您有 ${__VLS_ctx.overdueCount} 本图书已逾期，请尽快归还！`),
        closable: (false),
        showIcon: true,
        ...{ class: "alert-banner" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_3.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert-content" },
        });
    }
    var __VLS_3;
}
const __VLS_4 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onTabChange': {} },
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "custom-tabs" },
}));
const __VLS_6 = __VLS_5({
    ...{ 'onTabChange': {} },
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "custom-tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onTabChange: (__VLS_ctx.handleTabChange)
};
__VLS_7.slots.default;
if (__VLS_ctx.canViewAllRecords) {
    const __VLS_12 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        name: "borrow",
    }));
    const __VLS_14 = __VLS_13({
        name: "borrow",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    {
        const { label: __VLS_thisSlot } = __VLS_15.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tab-label" },
        });
        const __VLS_16 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({}));
        const __VLS_18 = __VLS_17({}, ...__VLS_functionalComponentArgsRest(__VLS_17));
        __VLS_19.slots.default;
        const __VLS_20 = {}.Notebook;
        /** @type {[typeof __VLS_components.Notebook, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
        const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
        var __VLS_19;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "glass-card borrow-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "icon-box primary" },
    });
    const __VLS_24 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
    const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    const __VLS_28 = {}.Notebook;
    /** @type {[typeof __VLS_components.Notebook, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({}));
    const __VLS_30 = __VLS_29({}, ...__VLS_functionalComponentArgsRest(__VLS_29));
    var __VLS_27;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "header-text" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    const __VLS_32 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        inline: (true),
        model: (__VLS_ctx.borrowForm),
        labelWidth: "100px",
        ...{ class: "borrow-form" },
    }));
    const __VLS_34 = __VLS_33({
        inline: (true),
        model: (__VLS_ctx.borrowForm),
        labelWidth: "100px",
        ...{ class: "borrow-form" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    const __VLS_36 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        label: "读者",
    }));
    const __VLS_38 = __VLS_37({
        label: "读者",
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_39.slots.default;
    const __VLS_40 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.borrowForm.readerNo),
        placeholder: "输入编号或姓名搜索",
        ...{ style: {} },
        size: "large",
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.borrowForm.readerNo),
        placeholder: "输入编号或姓名搜索",
        ...{ style: {} },
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onKeyup: (__VLS_ctx.searchReader)
    };
    __VLS_43.slots.default;
    {
        const { prefix: __VLS_thisSlot } = __VLS_43.slots;
        const __VLS_48 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({}));
        const __VLS_50 = __VLS_49({}, ...__VLS_functionalComponentArgsRest(__VLS_49));
        __VLS_51.slots.default;
        const __VLS_52 = {}.User;
        /** @type {[typeof __VLS_components.User, ]} */ ;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({}));
        const __VLS_54 = __VLS_53({}, ...__VLS_functionalComponentArgsRest(__VLS_53));
        var __VLS_51;
    }
    {
        const { append: __VLS_thisSlot } = __VLS_43.slots;
        const __VLS_56 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Search),
        }));
        const __VLS_58 = __VLS_57({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Search),
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        let __VLS_60;
        let __VLS_61;
        let __VLS_62;
        const __VLS_63 = {
            onClick: (__VLS_ctx.searchReader)
        };
        __VLS_59.slots.default;
        var __VLS_59;
    }
    var __VLS_43;
    var __VLS_39;
    const __VLS_64 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        label: "图书",
    }));
    const __VLS_66 = __VLS_65({
        label: "图书",
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_67.slots.default;
    const __VLS_68 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.borrowForm.bookIsbn),
        placeholder: "输入ISBN或书名搜索",
        ...{ style: {} },
        size: "large",
    }));
    const __VLS_70 = __VLS_69({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.borrowForm.bookIsbn),
        placeholder: "输入ISBN或书名搜索",
        ...{ style: {} },
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    let __VLS_72;
    let __VLS_73;
    let __VLS_74;
    const __VLS_75 = {
        onKeyup: (__VLS_ctx.searchBook)
    };
    __VLS_71.slots.default;
    {
        const { prefix: __VLS_thisSlot } = __VLS_71.slots;
        const __VLS_76 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({}));
        const __VLS_78 = __VLS_77({}, ...__VLS_functionalComponentArgsRest(__VLS_77));
        __VLS_79.slots.default;
        const __VLS_80 = {}.Reading;
        /** @type {[typeof __VLS_components.Reading, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({}));
        const __VLS_82 = __VLS_81({}, ...__VLS_functionalComponentArgsRest(__VLS_81));
        var __VLS_79;
    }
    {
        const { append: __VLS_thisSlot } = __VLS_71.slots;
        const __VLS_84 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Search),
        }));
        const __VLS_86 = __VLS_85({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Search),
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        let __VLS_88;
        let __VLS_89;
        let __VLS_90;
        const __VLS_91 = {
            onClick: (__VLS_ctx.searchBook)
        };
        __VLS_87.slots.default;
        var __VLS_87;
    }
    var __VLS_71;
    var __VLS_67;
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
        type: "primary",
        loading: (__VLS_ctx.isBorrowing),
        disabled: (__VLS_ctx.isBorrowing),
        size: "large",
        ...{ class: "borrow-btn" },
    }));
    const __VLS_98 = __VLS_97({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.isBorrowing),
        disabled: (__VLS_ctx.isBorrowing),
        size: "large",
        ...{ class: "borrow-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    let __VLS_100;
    let __VLS_101;
    let __VLS_102;
    const __VLS_103 = {
        onClick: (__VLS_ctx.handleBorrow)
    };
    __VLS_99.slots.default;
    if (__VLS_ctx.isBorrowing) {
        const __VLS_104 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
            ...{ class: "is-loading" },
        }));
        const __VLS_106 = __VLS_105({
            ...{ class: "is-loading" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_105));
        __VLS_107.slots.default;
        const __VLS_108 = {}.Loading;
        /** @type {[typeof __VLS_components.Loading, ]} */ ;
        // @ts-ignore
        const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({}));
        const __VLS_110 = __VLS_109({}, ...__VLS_functionalComponentArgsRest(__VLS_109));
        var __VLS_107;
    }
    else {
        const __VLS_112 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({}));
        const __VLS_114 = __VLS_113({}, ...__VLS_functionalComponentArgsRest(__VLS_113));
        __VLS_115.slots.default;
        const __VLS_116 = {}.Check;
        /** @type {[typeof __VLS_components.Check, ]} */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({}));
        const __VLS_118 = __VLS_117({}, ...__VLS_functionalComponentArgsRest(__VLS_117));
        var __VLS_115;
    }
    var __VLS_99;
    var __VLS_95;
    var __VLS_35;
    if (__VLS_ctx.selectedReader || __VLS_ctx.selectedBook) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "selected-info" },
        });
        if (__VLS_ctx.selectedReader) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "info-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "value" },
            });
            (__VLS_ctx.selectedReader.name);
            (__VLS_ctx.selectedReader.reader_no);
        }
        if (__VLS_ctx.selectedBook) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "info-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "value" },
            });
            (__VLS_ctx.selectedBook.title);
            (__VLS_ctx.selectedBook.isbn);
        }
    }
    var __VLS_15;
}
const __VLS_120 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    name: "return",
}));
const __VLS_122 = __VLS_121({
    name: "return",
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_123.slots.default;
{
    const { label: __VLS_thisSlot } = __VLS_123.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tab-label" },
    });
    const __VLS_124 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({}));
    const __VLS_126 = __VLS_125({}, ...__VLS_functionalComponentArgsRest(__VLS_125));
    __VLS_127.slots.default;
    const __VLS_128 = {}.RefreshRight;
    /** @type {[typeof __VLS_components.RefreshRight, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({}));
    const __VLS_130 = __VLS_129({}, ...__VLS_functionalComponentArgsRest(__VLS_129));
    var __VLS_127;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "glass-card return-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "search-bar" },
});
const __VLS_132 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.returnSearchKeyword),
    placeholder: "搜索读者编号/姓名、图书ISBN/书名...",
    ...{ style: {} },
    size: "large",
    clearable: true,
}));
const __VLS_134 = __VLS_133({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.returnSearchKeyword),
    placeholder: "搜索读者编号/姓名、图书ISBN/书名...",
    ...{ style: {} },
    size: "large",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
let __VLS_136;
let __VLS_137;
let __VLS_138;
const __VLS_139 = {
    onKeyup: (__VLS_ctx.searchBorrowedBooks)
};
__VLS_135.slots.default;
{
    const { prefix: __VLS_thisSlot } = __VLS_135.slots;
    const __VLS_140 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({}));
    const __VLS_142 = __VLS_141({}, ...__VLS_functionalComponentArgsRest(__VLS_141));
    __VLS_143.slots.default;
    const __VLS_144 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({}));
    const __VLS_146 = __VLS_145({}, ...__VLS_functionalComponentArgsRest(__VLS_145));
    var __VLS_143;
}
{
    const { append: __VLS_thisSlot } = __VLS_135.slots;
    const __VLS_148 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.Search),
    }));
    const __VLS_150 = __VLS_149({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.Search),
    }, ...__VLS_functionalComponentArgsRest(__VLS_149));
    let __VLS_152;
    let __VLS_153;
    let __VLS_154;
    const __VLS_155 = {
        onClick: (__VLS_ctx.searchBorrowedBooks)
    };
    __VLS_151.slots.default;
    var __VLS_151;
}
var __VLS_135;
const __VLS_156 = {}.ElDatePicker;
/** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.dateRange),
    type: "daterange",
    rangeSeparator: "至",
    startPlaceholder: "借书起始日期",
    endPlaceholder: "借书结束日期",
    size: "large",
    clearable: true,
}));
const __VLS_158 = __VLS_157({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.dateRange),
    type: "daterange",
    rangeSeparator: "至",
    startPlaceholder: "借书起始日期",
    endPlaceholder: "借书结束日期",
    size: "large",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
let __VLS_160;
let __VLS_161;
let __VLS_162;
const __VLS_163 = {
    onChange: (__VLS_ctx.searchBorrowedBooks)
};
var __VLS_159;
const __VLS_164 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    data: (__VLS_ctx.borrowedBooks),
    ...{ style: {} },
    rowClassName: (__VLS_ctx.getRowClassName),
    ...{ class: "custom-table" },
}));
const __VLS_166 = __VLS_165({
    data: (__VLS_ctx.borrowedBooks),
    ...{ style: {} },
    rowClassName: (__VLS_ctx.getRowClassName),
    ...{ class: "custom-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
__VLS_167.slots.default;
if (__VLS_ctx.canViewAllRecords) {
    const __VLS_168 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        prop: "reader_name",
        label: "读者",
        width: "120",
    }));
    const __VLS_170 = __VLS_169({
        prop: "reader_name",
        label: "读者",
        width: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
}
const __VLS_172 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
    prop: "book_title",
    label: "图书",
}));
const __VLS_174 = __VLS_173({
    prop: "book_title",
    label: "图书",
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
const __VLS_176 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    prop: "borrow_date",
    label: "借书日期",
    width: "110",
}));
const __VLS_178 = __VLS_177({
    prop: "borrow_date",
    label: "借书日期",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
const __VLS_180 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
    prop: "due_date",
    label: "应还日期",
    width: "110",
}));
const __VLS_182 = __VLS_181({
    prop: "due_date",
    label: "应还日期",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_181));
__VLS_183.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_183.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
    if (__VLS_ctx.isOverdue(row.due_date)) {
        const __VLS_184 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
            color: "#f56c6c",
            size: (16),
        }));
        const __VLS_186 = __VLS_185({
            color: "#f56c6c",
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_185));
        __VLS_187.slots.default;
        const __VLS_188 = {}.WarningFilled;
        /** @type {[typeof __VLS_components.WarningFilled, ]} */ ;
        // @ts-ignore
        const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({}));
        const __VLS_190 = __VLS_189({}, ...__VLS_functionalComponentArgsRest(__VLS_189));
        var __VLS_187;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: ({
                color: __VLS_ctx.isOverdue(row.due_date) ? '#f56c6c' : '#303133',
                fontWeight: __VLS_ctx.isOverdue(row.due_date) ? '600' : '400'
            }) },
    });
    (row.due_date);
}
var __VLS_183;
if (!__VLS_ctx.canViewAllRecords) {
    const __VLS_192 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
        label: "状态",
        width: "100",
    }));
    const __VLS_194 = __VLS_193({
        label: "状态",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    __VLS_195.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_195.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.isOverdue(row.due_date)) {
            const __VLS_196 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
                type: "danger",
                effect: "dark",
            }));
            const __VLS_198 = __VLS_197({
                type: "danger",
                effect: "dark",
            }, ...__VLS_functionalComponentArgsRest(__VLS_197));
            __VLS_199.slots.default;
            var __VLS_199;
        }
        else {
            const __VLS_200 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
                type: "success",
            }));
            const __VLS_202 = __VLS_201({
                type: "success",
            }, ...__VLS_functionalComponentArgsRest(__VLS_201));
            __VLS_203.slots.default;
            var __VLS_203;
        }
    }
    var __VLS_195;
}
const __VLS_204 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
    label: "操作",
    width: "200",
}));
const __VLS_206 = __VLS_205({
    label: "操作",
    width: "200",
}, ...__VLS_functionalComponentArgsRest(__VLS_205));
__VLS_207.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_207.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_208 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
        ...{ 'onClick': {} },
        type: "success",
        link: true,
        loading: (__VLS_ctx.returningBooks.has(row.id)),
        disabled: (__VLS_ctx.returningBooks.has(row.id)),
    }));
    const __VLS_210 = __VLS_209({
        ...{ 'onClick': {} },
        type: "success",
        link: true,
        loading: (__VLS_ctx.returningBooks.has(row.id)),
        disabled: (__VLS_ctx.returningBooks.has(row.id)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    let __VLS_212;
    let __VLS_213;
    let __VLS_214;
    const __VLS_215 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleReturn(row);
        }
    };
    __VLS_211.slots.default;
    if (__VLS_ctx.returningBooks.has(row.id)) {
        const __VLS_216 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({}));
        const __VLS_218 = __VLS_217({}, ...__VLS_functionalComponentArgsRest(__VLS_217));
        __VLS_219.slots.default;
        const __VLS_220 = {}.Loading;
        /** @type {[typeof __VLS_components.Loading, ]} */ ;
        // @ts-ignore
        const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({}));
        const __VLS_222 = __VLS_221({}, ...__VLS_functionalComponentArgsRest(__VLS_221));
        var __VLS_219;
    }
    else {
    }
    var __VLS_211;
    const __VLS_224 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
        disabled: (__VLS_ctx.isOverdue(row.due_date) || __VLS_ctx.renewingBooks.has(row.id)),
        loading: (__VLS_ctx.renewingBooks.has(row.id)),
    }));
    const __VLS_226 = __VLS_225({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
        disabled: (__VLS_ctx.isOverdue(row.due_date) || __VLS_ctx.renewingBooks.has(row.id)),
        loading: (__VLS_ctx.renewingBooks.has(row.id)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_225));
    let __VLS_228;
    let __VLS_229;
    let __VLS_230;
    const __VLS_231 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleRenew(row);
        }
    };
    __VLS_227.slots.default;
    if (__VLS_ctx.renewingBooks.has(row.id)) {
        const __VLS_232 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({}));
        const __VLS_234 = __VLS_233({}, ...__VLS_functionalComponentArgsRest(__VLS_233));
        __VLS_235.slots.default;
        const __VLS_236 = {}.Loading;
        /** @type {[typeof __VLS_components.Loading, ]} */ ;
        // @ts-ignore
        const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({}));
        const __VLS_238 = __VLS_237({}, ...__VLS_functionalComponentArgsRest(__VLS_237));
        var __VLS_235;
    }
    else {
    }
    var __VLS_227;
}
var __VLS_207;
var __VLS_167;
var __VLS_123;
const __VLS_240 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
    name: "history",
}));
const __VLS_242 = __VLS_241({
    name: "history",
}, ...__VLS_functionalComponentArgsRest(__VLS_241));
__VLS_243.slots.default;
{
    const { label: __VLS_thisSlot } = __VLS_243.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tab-label" },
    });
    const __VLS_244 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({}));
    const __VLS_246 = __VLS_245({}, ...__VLS_functionalComponentArgsRest(__VLS_245));
    __VLS_247.slots.default;
    const __VLS_248 = {}.Document;
    /** @type {[typeof __VLS_components.Document, ]} */ ;
    // @ts-ignore
    const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({}));
    const __VLS_250 = __VLS_249({}, ...__VLS_functionalComponentArgsRest(__VLS_249));
    var __VLS_247;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "glass-card history-section" },
});
const __VLS_252 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
    data: (__VLS_ctx.allRecords),
    ...{ style: {} },
    ...{ class: "custom-table" },
}));
const __VLS_254 = __VLS_253({
    data: (__VLS_ctx.allRecords),
    ...{ style: {} },
    ...{ class: "custom-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_253));
__VLS_255.slots.default;
const __VLS_256 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
    type: "index",
    label: "#",
    width: "60",
}));
const __VLS_258 = __VLS_257({
    type: "index",
    label: "#",
    width: "60",
}, ...__VLS_functionalComponentArgsRest(__VLS_257));
const __VLS_260 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
    prop: "reader_name",
    label: "读者",
    width: "120",
}));
const __VLS_262 = __VLS_261({
    prop: "reader_name",
    label: "读者",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_261));
const __VLS_264 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
    prop: "book_title",
    label: "图书",
}));
const __VLS_266 = __VLS_265({
    prop: "book_title",
    label: "图书",
}, ...__VLS_functionalComponentArgsRest(__VLS_265));
const __VLS_268 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
    prop: "borrow_date",
    label: "借书日期",
    width: "110",
}));
const __VLS_270 = __VLS_269({
    prop: "borrow_date",
    label: "借书日期",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_269));
const __VLS_272 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
    prop: "return_date",
    label: "还书日期",
    width: "110",
}));
const __VLS_274 = __VLS_273({
    prop: "return_date",
    label: "还书日期",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_273));
const __VLS_276 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
    label: "状态",
    width: "100",
}));
const __VLS_278 = __VLS_277({
    label: "状态",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_277));
__VLS_279.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_279.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (row.status === 'borrowed') {
        const __VLS_280 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
            type: "warning",
        }));
        const __VLS_282 = __VLS_281({
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_281));
        __VLS_283.slots.default;
        var __VLS_283;
    }
    else if (row.status === 'returned') {
        const __VLS_284 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
            type: "success",
        }));
        const __VLS_286 = __VLS_285({
            type: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_285));
        __VLS_287.slots.default;
        var __VLS_287;
    }
    else if (row.status === 'overdue') {
        const __VLS_288 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
            type: "danger",
        }));
        const __VLS_290 = __VLS_289({
            type: "danger",
        }, ...__VLS_functionalComponentArgsRest(__VLS_289));
        __VLS_291.slots.default;
        var __VLS_291;
    }
    else {
        const __VLS_292 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
            type: "info",
        }));
        const __VLS_294 = __VLS_293({
            type: "info",
        }, ...__VLS_functionalComponentArgsRest(__VLS_293));
        __VLS_295.slots.default;
        var __VLS_295;
    }
}
var __VLS_279;
const __VLS_296 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
    label: "操作",
    width: "120",
}));
const __VLS_298 = __VLS_297({
    label: "操作",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_297));
__VLS_299.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_299.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_300 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
        ...{ 'onClick': {} },
        type: "danger",
        link: true,
        size: "small",
        disabled: (row.status !== 'returned'),
    }));
    const __VLS_302 = __VLS_301({
        ...{ 'onClick': {} },
        type: "danger",
        link: true,
        size: "small",
        disabled: (row.status !== 'returned'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_301));
    let __VLS_304;
    let __VLS_305;
    let __VLS_306;
    const __VLS_307 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleDeleteRecord(row);
        }
    };
    __VLS_303.slots.default;
    var __VLS_303;
}
var __VLS_299;
var __VLS_255;
var __VLS_243;
var __VLS_7;
const __VLS_308 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
    modelValue: (__VLS_ctx.readerSelectDialogVisible),
    title: "选择读者",
    width: "600px",
    destroyOnClose: true,
}));
const __VLS_310 = __VLS_309({
    modelValue: (__VLS_ctx.readerSelectDialogVisible),
    title: "选择读者",
    width: "600px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_309));
__VLS_311.slots.default;
const __VLS_312 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
    data: (__VLS_ctx.searchReaderResults),
    ...{ style: {} },
    maxHeight: "400px",
}));
const __VLS_314 = __VLS_313({
    data: (__VLS_ctx.searchReaderResults),
    ...{ style: {} },
    maxHeight: "400px",
}, ...__VLS_functionalComponentArgsRest(__VLS_313));
__VLS_315.slots.default;
const __VLS_316 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
    prop: "reader_no",
    label: "编号",
    width: "120",
}));
const __VLS_318 = __VLS_317({
    prop: "reader_no",
    label: "编号",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_317));
const __VLS_320 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
    prop: "name",
    label: "姓名",
    width: "120",
}));
const __VLS_322 = __VLS_321({
    prop: "name",
    label: "姓名",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_321));
const __VLS_324 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
    prop: "category_name",
    label: "类型",
    width: "100",
}));
const __VLS_326 = __VLS_325({
    prop: "category_name",
    label: "类型",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_325));
const __VLS_328 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
    prop: "phone",
    label: "电话",
}));
const __VLS_330 = __VLS_329({
    prop: "phone",
    label: "电话",
}, ...__VLS_functionalComponentArgsRest(__VLS_329));
const __VLS_332 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
    label: "操作",
    width: "80",
}));
const __VLS_334 = __VLS_333({
    label: "操作",
    width: "80",
}, ...__VLS_functionalComponentArgsRest(__VLS_333));
__VLS_335.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_335.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_336 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
    }));
    const __VLS_338 = __VLS_337({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_337));
    let __VLS_340;
    let __VLS_341;
    let __VLS_342;
    const __VLS_343 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleSelectReader(row);
        }
    };
    __VLS_339.slots.default;
    var __VLS_339;
}
var __VLS_335;
var __VLS_315;
var __VLS_311;
const __VLS_344 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
    modelValue: (__VLS_ctx.bookSelectDialogVisible),
    title: "选择图书",
    width: "800px",
    destroyOnClose: true,
}));
const __VLS_346 = __VLS_345({
    modelValue: (__VLS_ctx.bookSelectDialogVisible),
    title: "选择图书",
    width: "800px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_345));
__VLS_347.slots.default;
const __VLS_348 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
    data: (__VLS_ctx.searchBookResults),
    ...{ style: {} },
    maxHeight: "400px",
}));
const __VLS_350 = __VLS_349({
    data: (__VLS_ctx.searchBookResults),
    ...{ style: {} },
    maxHeight: "400px",
}, ...__VLS_functionalComponentArgsRest(__VLS_349));
__VLS_351.slots.default;
const __VLS_352 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({
    prop: "isbn",
    label: "ISBN",
    width: "140",
}));
const __VLS_354 = __VLS_353({
    prop: "isbn",
    label: "ISBN",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_353));
const __VLS_356 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({
    prop: "title",
    label: "书名",
}));
const __VLS_358 = __VLS_357({
    prop: "title",
    label: "书名",
}, ...__VLS_functionalComponentArgsRest(__VLS_357));
const __VLS_360 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
    prop: "author",
    label: "作者",
    width: "120",
}));
const __VLS_362 = __VLS_361({
    prop: "author",
    label: "作者",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_361));
const __VLS_364 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
    label: "库存",
    width: "100",
}));
const __VLS_366 = __VLS_365({
    label: "库存",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_365));
__VLS_367.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_367.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (row.available_quantity);
    (row.total_quantity);
}
var __VLS_367;
const __VLS_368 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_369 = __VLS_asFunctionalComponent(__VLS_368, new __VLS_368({
    label: "操作",
    width: "80",
}));
const __VLS_370 = __VLS_369({
    label: "操作",
    width: "80",
}, ...__VLS_functionalComponentArgsRest(__VLS_369));
__VLS_371.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_371.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_372 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
    }));
    const __VLS_374 = __VLS_373({
        ...{ 'onClick': {} },
        type: "primary",
        link: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_373));
    let __VLS_376;
    let __VLS_377;
    let __VLS_378;
    const __VLS_379 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleSelectBook(row);
        }
    };
    __VLS_375.slots.default;
    var __VLS_375;
}
var __VLS_371;
var __VLS_351;
var __VLS_347;
/** @type {__VLS_StyleScopedClasses['page-container']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['title-container']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['gdut-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['page-description']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-content']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-label']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['borrow-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-box']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['header-text']} */ ;
/** @type {__VLS_StyleScopedClasses['borrow-form']} */ ;
/** @type {__VLS_StyleScopedClasses['borrow-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['is-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-info']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-label']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['return-section']} */ ;
/** @type {__VLS_StyleScopedClasses['search-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-table']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-label']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['history-section']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-table']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Search: Search,
            Loading: Loading,
            WarningFilled: WarningFilled,
            Notebook: Notebook,
            User: User,
            Reading: Reading,
            Check: Check,
            RefreshRight: RefreshRight,
            Document: Document,
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
            searchReader: searchReader,
            handleSelectReader: handleSelectReader,
            searchBook: searchBook,
            handleSelectBook: handleSelectBook,
            handleBorrow: handleBorrow,
            handleReturn: handleReturn,
            handleRenew: handleRenew,
            searchBorrowedBooks: searchBorrowedBooks,
            isOverdue: isOverdue,
            getRowClassName: getRowClassName,
            handleTabChange: handleTabChange,
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