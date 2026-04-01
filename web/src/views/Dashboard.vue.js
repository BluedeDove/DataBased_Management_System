/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { Collection, Timer, Warning, DataLine, Reading, ArrowRight, TrendCharts, MagicStick, PieChart, ArrowUp, ArrowDown } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { borrowingApi } from '../api/borrowing.api';
import { useUserStore } from '@/store/user';
const userStore = useUserStore();
// ── Computed helpers ──
const userName = computed(() => userStore.user?.name || '同学');
const currentDate = computed(() => {
    const d = new Date();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 星期${weekdays[d.getDay()]}`;
});
// ── KPI Cards ──
const kpiCards = ref([
    {
        label: '馆藏总量',
        value: '--',
        icon: Collection,
        iconBg: 'rgba(29, 78, 216, 0.10)',
        lineColor: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
        trendType: 'up',
        trendIcon: ArrowUp,
        trendText: '实时'
    },
    {
        label: '借阅总次',
        value: '--',
        icon: DataLine,
        iconBg: 'rgba(5, 150, 105, 0.10)',
        lineColor: 'linear-gradient(90deg, #059669, #34D399)',
        trendType: 'up',
        trendIcon: ArrowUp,
        trendText: '累计'
    },
    {
        label: '当前借出',
        value: '--',
        icon: Timer,
        iconBg: 'rgba(217, 119, 6, 0.10)',
        lineColor: 'linear-gradient(90deg, #D97706, #FBBF24)',
        trendType: 'neutral',
        trendIcon: ArrowRight,
        trendText: '进行中'
    },
    {
        label: '逾期未还',
        value: '--',
        icon: Warning,
        iconBg: 'rgba(200, 16, 46, 0.10)',
        lineColor: 'linear-gradient(90deg, #C8102E, #F87171)',
        trendType: 'down',
        trendIcon: ArrowDown,
        trendText: '需关注'
    }
]);
// ── Hot Books ──
const hotBooks = ref([]);
const maxBorrow = computed(() => hotBooks.value.reduce((m, b) => Math.max(m, b.borrow_count || 0), 1));
const barWidth = (count) => Math.round((count / maxBorrow.value) * 100);
// ── Trend Chart ──
const trendChartRef = ref(null);
let trendChart = null;
const initTrendChart = (data) => {
    if (!trendChartRef.value)
        return;
    if (trendChart)
        trendChart.dispose();
    trendChart = echarts.init(trendChartRef.value, undefined, { renderer: 'svg' });
    const display = data.length > 15 ? data.slice(-15) : data;
    const xLabels = display.map((d) => {
        const s = String(d.date || d.day || '');
        return s.slice(5); // MM-DD
    });
    const values = display.map((d) => d.count || d.total || 0);
    trendChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(28, 16, 51, 0.92)',
            borderColor: 'transparent',
            padding: [8, 14],
            textStyle: { color: '#fff', fontSize: 12, fontFamily: 'var(--font-sans)' },
            formatter: (params) => {
                const p = params[0];
                return `<div style="font-weight:600;margin-bottom:2px">${p.name}</div><div style="color:#FF6B8A">借阅 ${p.value} 次</div>`;
            }
        },
        grid: {
            top: '10%', left: '3%', right: '3%', bottom: '6%', containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: xLabels,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11 }
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
            axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11 }
        },
        series: [{
                name: '借阅量',
                type: 'line',
                smooth: true,
                showSymbol: true,
                symbolSize: 6,
                data: values,
                itemStyle: { color: '#FF6B8A', borderWidth: 2, borderColor: '#FF6B8A' },
                lineStyle: { width: 3, color: '#FF6B8A', shadowColor: 'rgba(255,107,138,0.3)', shadowBlur: 10 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(200, 16, 46, 0.35)' },
                        { offset: 0.5, color: 'rgba(200, 16, 46, 0.12)' },
                        { offset: 1, color: 'rgba(200, 16, 46, 0.02)' }
                    ])
                }
            }]
    });
};
// ── Quick Links ──
const quickLinks = [
    {
        title: '图书管理',
        desc: '浏览与管理馆藏图书',
        icon: Reading,
        bg: 'linear-gradient(135deg, #C8102E20, #C8102E08)',
        path: '/books'
    },
    {
        title: '借还管理',
        desc: '办理借书与还书手续',
        icon: TrendCharts,
        bg: 'linear-gradient(135deg, #7C3AED20, #7C3AED08)',
        path: '/borrowing'
    },
    {
        title: '统计分析',
        desc: '查看借阅数据报表',
        icon: PieChart,
        bg: 'linear-gradient(135deg, #05966920, #05966908)',
        path: '/statistics'
    },
    {
        title: 'AI 助手',
        desc: '智能图书推荐与问答',
        icon: MagicStick,
        bg: 'linear-gradient(135deg, #D9770620, #D9770608)',
        path: '/ai-assistant'
    }
];
// ── Data Fetching ──
const fetchData = async () => {
    try {
        const [bookRes, statsRes, hotRes, trendRes] = await Promise.allSettled([
            borrowingApi.getBookCount(),
            borrowingApi.getStatistics(),
            borrowingApi.getPopular(5),
            borrowingApi.getTrend(30)
        ]);
        // Book count
        if (bookRes.status === 'fulfilled' && bookRes.value?.success) {
            kpiCards.value[0].value = String(bookRes.value.data ?? 0);
        }
        else {
            kpiCards.value[0].value = '0';
        }
        // Statistics
        if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
            const s = statsRes.value.data;
            kpiCards.value[1].value = String(s?.total_borrows ?? s?.total_borrowed ?? 0);
            kpiCards.value[2].value = String(s?.current_borrows ?? s?.currently_borrowed ?? 0);
            kpiCards.value[3].value = String(s?.overdue_count ?? 0);
        }
        // Popular books
        if (hotRes.status === 'fulfilled' && hotRes.value?.success) {
            hotBooks.value = hotRes.value.data || [];
        }
        // Trend chart
        if (trendRes.status === 'fulfilled' && trendRes.value?.success) {
            await nextTick();
            initTrendChart(trendRes.value.data || []);
        }
    }
    catch (e) {
        console.error('Dashboard fetch error:', e);
    }
};
// ── Resize handler ──
const handleResize = () => trendChart?.resize();
onMounted(() => {
    fetchData();
    window.addEventListener('resize', handleResize);
});
onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    trendChart?.dispose();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['anim-sheen']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-card']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-trend']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-trend']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-trend']} */ ;
/** @type {__VLS_StyleScopedClasses['anim-float']} */ ;
/** @type {__VLS_StyleScopedClasses['anim-sheen']} */ ;
/** @type {__VLS_StyleScopedClasses['anim-sheen']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-item']} */ ;
/** @type {__VLS_StyleScopedClasses['ql-card']} */ ;
/** @type {__VLS_StyleScopedClasses['ql-card']} */ ;
/** @type {__VLS_StyleScopedClasses['ql-arrow']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dashboard" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "hero-bar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "hero-bg-pattern" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "hero-greeting" },
});
(__VLS_ctx.userName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "hero-brand" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "hero-date" },
});
(__VLS_ctx.currentDate);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-decor" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "decor-ring r1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "decor-ring r2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "decor-ring r3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "kpi-grid" },
});
for (const [card, i] of __VLS_getVForSourceType((__VLS_ctx.kpiCards))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (i),
        ...{ class: "kpi-card glass-card anim-float animate-fade-in" },
        ...{ class: ('anim-float-delay-' + (i % 4)) },
        ...{ style: ({ animationDelay: i * 0.08 + 's' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-icon" },
        ...{ style: ({ background: card.iconBg }) },
    });
    const __VLS_0 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        size: (22),
    }));
    const __VLS_2 = __VLS_1({
        size: (22),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    const __VLS_4 = ((card.icon));
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
    const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
    var __VLS_3;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "kpi-value" },
    });
    (card.value);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "kpi-label" },
    });
    (card.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-trend" },
        ...{ class: (card.trendType) },
    });
    const __VLS_8 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        size: (12),
    }));
    const __VLS_10 = __VLS_9({
        size: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    const __VLS_12 = ((card.trendIcon));
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    var __VLS_11;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (card.trendText);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "kpi-line" },
        ...{ style: ({ background: card.lineColor }) },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "charts-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-panel glass-card-dark anim-sheen" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "panel-dot" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "pill-badge" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ref: "trendChartRef",
    ...{ class: "chart-canvas" },
});
/** @type {typeof __VLS_ctx.trendChartRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-panel glass-card anim-sheen" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "panel-dot purple" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rank-list" },
});
for (const [book, idx] of __VLS_getVForSourceType((__VLS_ctx.hotBooks))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (idx),
        ...{ class: "rank-item animate-fade-in" },
        ...{ style: ({ animationDelay: idx * 0.06 + 's' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rank-badge" },
        ...{ class: ({ 'rank-badge--top': idx < 3 }) },
    });
    (idx + 1);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rank-meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "rank-title" },
    });
    (book.book_title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "rank-author" },
    });
    (book.author);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rank-bar-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rank-bar-track" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "rank-bar-fill" },
        ...{ style: ({
                width: __VLS_ctx.barWidth(book.borrow_count) + '%',
                animationDelay: idx * 0.1 + 's'
            }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "rank-count" },
    });
    (book.borrow_count);
}
if (!__VLS_ctx.hotBooks.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rank-empty" },
    });
    const __VLS_16 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        size: (32),
        color: "#CBD5E1",
    }));
    const __VLS_18 = __VLS_17({
        size: (32),
        color: "#CBD5E1",
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    const __VLS_20 = {}.Reading;
    /** @type {[typeof __VLS_components.Reading, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
    const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
    var __VLS_19;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "quick-links" },
});
for (const [link, i] of __VLS_getVForSourceType((__VLS_ctx.quickLinks))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$router.push(link.path);
            } },
        key: (i),
        ...{ class: "ql-card glass-card animate-fade-in anim-sheen" },
        ...{ style: ({ animationDelay: i * 0.06 + 's' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ql-icon" },
        ...{ style: ({ background: link.bg }) },
    });
    const __VLS_24 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        size: (20),
    }));
    const __VLS_26 = __VLS_25({
        size: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    const __VLS_28 = ((link.icon));
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({}));
    const __VLS_30 = __VLS_29({}, ...__VLS_functionalComponentArgsRest(__VLS_29));
    var __VLS_27;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ql-text" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ql-title" },
    });
    (link.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ql-desc" },
    });
    (link.desc);
    const __VLS_32 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ class: "ql-arrow" },
        size: (16),
    }));
    const __VLS_34 = __VLS_33({
        ...{ class: "ql-arrow" },
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    const __VLS_36 = {}.ArrowRight;
    /** @type {[typeof __VLS_components.ArrowRight, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({}));
    const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
    var __VLS_35;
}
/** @type {__VLS_StyleScopedClasses['dashboard']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-bg-pattern']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-text']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-greeting']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-brand']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-date']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-decor']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-ring']} */ ;
/** @type {__VLS_StyleScopedClasses['r1']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-ring']} */ ;
/** @type {__VLS_StyleScopedClasses['r2']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-ring']} */ ;
/** @type {__VLS_StyleScopedClasses['r3']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['anim-float']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-body']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-value']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-label']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-trend']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-line']} */ ;
/** @type {__VLS_StyleScopedClasses['charts-row']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['anim-sheen']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title-group']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['anim-sheen']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title-group']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['purple']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-list']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-item']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-title']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-author']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-bar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-bar-track']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-bar-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-count']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-links']} */ ;
/** @type {__VLS_StyleScopedClasses['ql-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
/** @type {__VLS_StyleScopedClasses['anim-sheen']} */ ;
/** @type {__VLS_StyleScopedClasses['ql-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['ql-text']} */ ;
/** @type {__VLS_StyleScopedClasses['ql-title']} */ ;
/** @type {__VLS_StyleScopedClasses['ql-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['ql-arrow']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Reading: Reading,
            ArrowRight: ArrowRight,
            userName: userName,
            currentDate: currentDate,
            kpiCards: kpiCards,
            hotBooks: hotBooks,
            barWidth: barWidth,
            trendChartRef: trendChartRef,
            quickLinks: quickLinks,
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