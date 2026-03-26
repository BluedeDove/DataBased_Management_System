/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, onMounted, onUnmounted } from 'vue';
import { Collection, User, Timer, Trophy } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { borrowingApi } from '../api/borrowing.api';
const dashboardTitle = '运营概览';
const statCards = ref([
    { label: '藏书总量', value: '-', icon: Collection, color: 'blue' },
    { label: '借阅总次', value: '-', icon: User, color: 'green' },
    { label: '当前借出', value: '-', icon: Timer, color: 'orange' },
    { label: '逾期图书', value: '-', icon: Trophy, color: 'pink' }
]);
const hotBooks = ref([]);
const chartRef = ref(null);
let chartInstance = null;
const initChart = (data) => {
    if (!chartRef.value)
        return;
    chartInstance = echarts.init(chartRef.value);
    const option = {
        tooltip: {
            trigger: 'axis'
        },
        grid: {
            top: '10%',
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data.map(item => item.date),
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#94a3b8' }
        },
        yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: '#f1f5f9' } },
            axisLabel: { color: '#94a3b8' }
        },
        series: [
            {
                name: '借阅量',
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: data.map(item => item.count),
                itemStyle: { color: '#6366f1' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(99, 102, 241, 0.2)' },
                        { offset: 1, color: 'rgba(99, 102, 241, 0)' }
                    ])
                },
                lineStyle: { width: 3 }
            }
        ]
    };
    chartInstance.setOption(option);
};
const fetchData = async () => {
    try {
        // 1. 获取图书总数
        const bookCountResult = await borrowingApi.getBookCount();
        if (bookCountResult.success) {
            statCards.value[0].value = bookCountResult.data.toString();
        }
        else {
            statCards.value[0].value = '0';
        }
        // 2. 获取借阅统计数据
        const statsResult = await borrowingApi.getStatistics();
        if (statsResult.success) {
            const stats = statsResult.data;
            statCards.value[1].value = stats.total_borrowed.toString();
            statCards.value[2].value = stats.currently_borrowed.toString();
            statCards.value[3].value = stats.overdue_count.toString();
            statCards.value[3].label = '逾期未还';
        }
        // 2. 获取热门图书
        const hotResult = await borrowingApi.getPopular(5);
        if (hotResult.success) {
            hotBooks.value = hotResult.data;
        }
        // 3. 获取趋势数据
        const trendResult = await borrowingApi.getTrend(30);
        if (trendResult.success) {
            initChart(trendResult.data);
        }
    }
    catch (error) {
        console.error('Failed to fetch dashboard data:', error);
    }
};
const handleResize = () => {
    chartInstance?.resize();
};
onMounted(() => {
    fetchData();
    window.addEventListener('resize', handleResize);
});
onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    chartInstance?.dispose();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['book-item']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['book-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['book-detail']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "page-title" },
});
(__VLS_ctx.dashboardTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "gdut-accent" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-secondary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stat-grid" },
});
for (const [item, i] of __VLS_getVForSourceType((__VLS_ctx.statCards))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (i),
        ...{ class: "glass-card stat-card" },
        ...{ style: ({ animationDelay: i * 0.1 + 's' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-icon" },
        ...{ class: (item.color) },
    });
    const __VLS_0 = ((item.icon));
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-value" },
    });
    (item.value);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-label" },
    });
    (item.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "stat-decoration" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dashboard-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "glass-card chart-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
const __VLS_4 = {}.ElTag;
/** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: "small",
    effect: "dark",
}));
const __VLS_6 = __VLS_5({
    size: "small",
    effect: "dark",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
var __VLS_7;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ref: "chartRef",
    ...{ class: "chart-container" },
});
/** @type {typeof __VLS_ctx.chartRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "glass-card list-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "book-list" },
});
for (const [book, index] of __VLS_getVForSourceType((__VLS_ctx.hotBooks))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (index),
        ...{ class: "book-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rank-badge" },
        ...{ class: ({ 'top-3': index < 3 }) },
    });
    (index + 1);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "book-detail" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "name" },
    });
    (book.book_title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "author" },
    });
    (book.book_author);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "count" },
    });
    (book.borrow_count);
}
if (__VLS_ctx.hotBooks.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-tip" },
    });
}
/** @type {__VLS_StyleScopedClasses['page-container']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['header-content']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['gdut-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-info']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-decoration']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-content']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-section']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-container']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['list-section']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['book-list']} */ ;
/** @type {__VLS_StyleScopedClasses['book-item']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['book-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['name']} */ ;
/** @type {__VLS_StyleScopedClasses['author']} */ ;
/** @type {__VLS_StyleScopedClasses['count']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-tip']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            dashboardTitle: dashboardTitle,
            statCards: statCards,
            hotBooks: hotBooks,
            chartRef: chartRef,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=Dashboard.vue.js.map