/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { Collection, User, Timer, WarningFilled } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { bookApi } from '../api/book.api';
import { borrowingApi } from '../api/borrowing.api';
const activeTab = ref('books');
const tabs = [
    { key: 'books', label: '图书统计' },
    { key: 'readers', label: '读者统计' },
    { key: 'borrowing', label: '借阅统计' },
];
const categoryStats = ref([]);
const popularBooks = ref([]);
const activeReaders = ref([]);
const borrowStats = ref({});
const overdueRecords = ref([]);
const pieChartRef = ref();
const barChartRef = ref();
const readerChartRef = ref();
const COLORS = ['#C8102E', '#7C3AED', '#0EA5E9', '#059669', '#D97706', '#EC4899', '#6366F1', '#14B8A6', '#D97706', '#DC2626'];
const borrowKpis = computed(() => [
    { label: '总借阅量', value: borrowStats.value.total_borrowed || 0, icon: Collection, color: '#C8102E', tint: '#FEF2F2' },
    { label: '当前在借', value: borrowStats.value.currently_borrowed || 0, icon: Timer, color: '#059669', tint: '#ECFDF5' },
    { label: '逾期未还', value: borrowStats.value.overdue_count || 0, icon: WarningFilled, color: '#DC2626', tint: '#FEF2F2' },
    { label: '逾期记录', value: overdueRecords.value.length, icon: User, color: '#7C3AED', tint: '#F3EFFE' },
]);
const calcOverdueDays = (dueDate) => {
    const diff = new Date().getTime() - new Date(dueDate).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};
const initPieChart = () => {
    if (!pieChartRef.value || !categoryStats.value.length)
        return;
    const chart = echarts.init(pieChartRef.value);
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', formatter: '{b}: {c} 册 ({d}%)' },
        legend: { bottom: '2%', left: 'center', textStyle: { color: '#64748B', fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
        series: [{
                type: 'pie', radius: ['42%', '68%'], center: ['50%', '45%'],
                avoidLabelOverlap: true,
                itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
                label: { show: false },
                emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
                data: categoryStats.value.slice(0, 10).map((c, i) => ({
                    name: c.category_name, value: c.book_count,
                    itemStyle: { color: COLORS[i % COLORS.length] }
                }))
            }]
    });
    window.addEventListener('resize', () => chart.resize());
};
const initBarChart = () => {
    if (!barChartRef.value || !popularBooks.value.length)
        return;
    const chart = echarts.init(barChartRef.value);
    const top10 = popularBooks.value.slice(0, 10).reverse();
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { top: '4%', left: '2%', right: '6%', bottom: '4%', containLabel: true },
        xAxis: { type: 'value', axisLabel: { color: '#94A3B8', fontSize: 11 }, splitLine: { lineStyle: { color: '#F1EFF0', type: 'dashed' } } },
        yAxis: {
            type: 'category',
            data: top10.map((b) => b.book_title?.length > 12 ? b.book_title.slice(0, 12) + '…' : b.book_title),
            axisLabel: { color: '#64748B', fontSize: 12 }, axisLine: { show: false }, axisTick: { show: false }
        },
        series: [{
                type: 'bar', barMaxWidth: 20,
                data: top10.map((b, i) => ({
                    value: b.borrow_count,
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: COLORS[i % COLORS.length] },
                            { offset: 1, color: COLORS[(i + 2) % COLORS.length] }
                        ]),
                        borderRadius: [0, 6, 6, 0]
                    }
                })),
                label: { show: true, position: 'right', color: '#64748B', fontSize: 11, formatter: '{c}' }
            }]
    });
    window.addEventListener('resize', () => chart.resize());
};
const initReaderChart = () => {
    if (!readerChartRef.value || !activeReaders.value.length)
        return;
    const chart = echarts.init(readerChartRef.value);
    const top10 = activeReaders.value.slice(0, 10).reverse();
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { top: '4%', left: '2%', right: '8%', bottom: '4%', containLabel: true },
        xAxis: { type: 'value', axisLabel: { color: '#94A3B8', fontSize: 11 }, splitLine: { lineStyle: { color: '#F1EFF0', type: 'dashed' } } },
        yAxis: {
            type: 'category', data: top10.map((r) => r.reader_name || ''),
            axisLabel: { color: '#64748B', fontSize: 12 }, axisLine: { show: false }, axisTick: { show: false }
        },
        series: [{
                type: 'bar', barMaxWidth: 20,
                data: top10.map((r) => ({
                    value: r.borrow_count,
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: '#7C3AED' }, { offset: 1, color: '#C8102E' }
                        ]),
                        borderRadius: [0, 6, 6, 0]
                    }
                })),
                label: { show: true, position: 'right', color: '#64748B', fontSize: 11, formatter: '{c}' }
            }]
    });
    window.addEventListener('resize', () => chart.resize());
};
const loadStatistics = async () => {
    const [catRes, popRes, readRes, statsRes, overdueRes] = await Promise.allSettled([
        bookApi.getCategoryStatistics(),
        borrowingApi.getPopular(20),
        borrowingApi.getActiveReaders(20),
        borrowingApi.getStatistics(),
        borrowingApi.getOverdue()
    ]);
    if (catRes.status === 'fulfilled' && catRes.value?.success)
        categoryStats.value = catRes.value.data;
    if (popRes.status === 'fulfilled' && popRes.value?.success)
        popularBooks.value = popRes.value.data;
    if (readRes.status === 'fulfilled' && readRes.value?.success)
        activeReaders.value = readRes.value.data;
    if (statsRes.status === 'fulfilled' && statsRes.value?.success)
        borrowStats.value = statsRes.value.data;
    if (overdueRes.status === 'fulfilled' && overdueRes.value?.success)
        overdueRecords.value = overdueRes.value.data;
    await nextTick();
    initPieChart();
    initBarChart();
    initReaderChart();
};
watch(activeTab, async () => {
    await nextTick();
    initPieChart();
    initBarChart();
    initReaderChart();
});
onMounted(() => loadStatistics());
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-num']} */ ;
/** @type {__VLS_StyleScopedClasses['two-col-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stats-page" },
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
for (const [tab] of __VLS_getVForSourceType((__VLS_ctx.tabs))) {
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
if (__VLS_ctx.activeTab === 'books') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "two-col-grid animate-fade-in-delay-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "card-dot" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-title" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "card-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ref: "pieChartRef",
        ...{ class: "chart-area" },
    });
    /** @type {typeof __VLS_ctx.pieChartRef} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "card-dot" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-title" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pill-badge red" },
    });
    (__VLS_ctx.categoryStats.length);
    const __VLS_0 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        data: (__VLS_ctx.categoryStats),
        size: "small",
        ...{ style: {} },
    }));
    const __VLS_2 = __VLS_1({
        data: (__VLS_ctx.categoryStats),
        size: "small",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    const __VLS_4 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        prop: "category_name",
        label: "类别",
    }));
    const __VLS_6 = __VLS_5({
        prop: "category_name",
        label: "类别",
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    const __VLS_8 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        prop: "book_count",
        label: "总册数",
        align: "right",
        width: "80",
    }));
    const __VLS_10 = __VLS_9({
        prop: "book_count",
        label: "总册数",
        align: "right",
        width: "80",
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_11.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ style: {} },
        });
        (row.book_count);
    }
    var __VLS_11;
    const __VLS_12 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        prop: "available_count",
        label: "可借",
        align: "right",
        width: "80",
    }));
    const __VLS_14 = __VLS_13({
        prop: "available_count",
        label: "可借",
        align: "right",
        width: "80",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_15.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ style: {} },
        });
        (row.available_count);
    }
    var __VLS_15;
    var __VLS_3;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card animate-fade-in-delay-3" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "card-dot" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-title" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "card-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ref: "barChartRef",
        ...{ class: "chart-area" },
        ...{ style: {} },
    });
    /** @type {typeof __VLS_ctx.barChartRef} */ ;
}
if (__VLS_ctx.activeTab === 'readers') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "two-col-grid animate-fade-in-delay-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "card-dot" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-title" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ref: "readerChartRef",
        ...{ class: "chart-area" },
    });
    /** @type {typeof __VLS_ctx.readerChartRef} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "card-dot" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-title" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pill-badge purple" },
    });
    const __VLS_16 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        data: (__VLS_ctx.activeReaders),
        size: "small",
        ...{ style: {} },
    }));
    const __VLS_18 = __VLS_17({
        data: (__VLS_ctx.activeReaders),
        size: "small",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    const __VLS_20 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        type: "index",
        label: "#",
        width: "44",
    }));
    const __VLS_22 = __VLS_21({
        type: "index",
        label: "#",
        width: "44",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_23.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_23.slots;
        const [{ $index }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "rank-num" },
            ...{ class: ({ top: $index < 3 }) },
        });
        ($index + 1);
    }
    var __VLS_23;
    const __VLS_24 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        prop: "reader_name",
        label: "姓名",
    }));
    const __VLS_26 = __VLS_25({
        prop: "reader_name",
        label: "姓名",
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    const __VLS_28 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        prop: "reader_no",
        label: "编号",
        width: "100",
    }));
    const __VLS_30 = __VLS_29({
        prop: "reader_no",
        label: "编号",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    const __VLS_32 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        prop: "borrow_count",
        label: "借阅",
        align: "right",
        width: "70",
    }));
    const __VLS_34 = __VLS_33({
        prop: "borrow_count",
        label: "借阅",
        align: "right",
        width: "70",
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_35.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ style: {} },
        });
        (row.borrow_count);
    }
    var __VLS_35;
    var __VLS_19;
}
if (__VLS_ctx.activeTab === 'borrowing') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-grid animate-fade-in-delay-2" },
    });
    for (const [kpi] of __VLS_getVForSourceType((__VLS_ctx.borrowKpis))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (kpi.label),
            ...{ class: "stat-card kpi-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "kpi-icon-wrap" },
            ...{ style: ({ background: kpi.tint }) },
        });
        const __VLS_36 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            ...{ style: ({ color: kpi.color, fontSize: '20px' }) },
        }));
        const __VLS_38 = __VLS_37({
            ...{ style: ({ color: kpi.color, fontSize: '20px' }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        __VLS_39.slots.default;
        const __VLS_40 = ((kpi.icon));
        // @ts-ignore
        const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({}));
        const __VLS_42 = __VLS_41({}, ...__VLS_functionalComponentArgsRest(__VLS_41));
        var __VLS_39;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "kpi-val" },
        });
        (kpi.value);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "kpi-lbl" },
        });
        (kpi.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "stat-decor" },
            ...{ style: ({ background: kpi.color }) },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "light-card animate-fade-in-delay-3" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "card-dot" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-title" },
        ...{ style: {} },
    });
    if (__VLS_ctx.overdueRecords.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "pill-badge danger" },
        });
        (__VLS_ctx.overdueRecords.length);
    }
    const __VLS_44 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        data: (__VLS_ctx.overdueRecords),
        size: "small",
        ...{ style: {} },
    }));
    const __VLS_46 = __VLS_45({
        data: (__VLS_ctx.overdueRecords),
        size: "small",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_47.slots.default;
    const __VLS_48 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        prop: "reader_name",
        label: "读者",
        width: "120",
    }));
    const __VLS_50 = __VLS_49({
        prop: "reader_name",
        label: "读者",
        width: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    const __VLS_52 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        prop: "book_title",
        label: "图书",
    }));
    const __VLS_54 = __VLS_53({
        prop: "book_title",
        label: "图书",
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    const __VLS_56 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        prop: "due_date",
        label: "应还日期",
        width: "120",
    }));
    const __VLS_58 = __VLS_57({
        prop: "due_date",
        label: "应还日期",
        width: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    const __VLS_60 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        label: "逾期天数",
        align: "center",
        width: "100",
    }));
    const __VLS_62 = __VLS_61({
        label: "逾期天数",
        align: "center",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    __VLS_63.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_63.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "pill-badge danger" },
        });
        (__VLS_ctx.calcOverdueDays(row.due_date));
    }
    var __VLS_63;
    var __VLS_47;
}
/** @type {__VLS_StyleScopedClasses['stats-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header-left']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-1']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['two-col-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-2']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['card-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['card-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-area']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['card-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['red']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['card-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['card-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-area']} */ ;
/** @type {__VLS_StyleScopedClasses['two-col-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-2']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['card-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-area']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['card-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['purple']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-num']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-2']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-card']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-icon-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-val']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-lbl']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-decor']} */ ;
/** @type {__VLS_StyleScopedClasses['light-card']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in-delay-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['card-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            activeTab: activeTab,
            tabs: tabs,
            categoryStats: categoryStats,
            activeReaders: activeReaders,
            overdueRecords: overdueRecords,
            pieChartRef: pieChartRef,
            barChartRef: barChartRef,
            readerChartRef: readerChartRef,
            borrowKpis: borrowKpis,
            calcOverdueDays: calcOverdueDays,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=Statistics.vue.js.map