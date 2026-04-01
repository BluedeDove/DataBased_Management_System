/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { User, Lock } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/store/user';
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const loading = ref(false);
const formRef = ref();
const form = reactive({
    username: '',
    password: '',
    remember: false
});
const goRegister = () => {
    router.push('/register');
};
const handleLogin = async () => {
    if (!form.username.trim()) {
        ElMessage.warning('请输入账号');
        return;
    }
    if (!form.password.trim()) {
        ElMessage.warning('请输入密码');
        return;
    }
    loading.value = true;
    try {
        await userStore.login({ username: form.username, password: form.password });
        ElMessage.success('登录成功，欢迎回来！');
        const redirect = route.query.redirect || '/dashboard';
        router.push(redirect);
    }
    catch (error) {
        ElMessage.error(error?.message || '登录失败，请检查账号密码');
    }
    finally {
        loading.value = false;
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['book']} */ ;
/** @type {__VLS_StyleScopedClasses['book']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-top-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['login-form']} */ ;
/** @type {__VLS_StyleScopedClasses['login-form']} */ ;
/** @type {__VLS_StyleScopedClasses['login-form']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['login-form']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['login-form']} */ ;
/** @type {__VLS_StyleScopedClasses['checkbox-input']} */ ;
/** @type {__VLS_StyleScopedClasses['checkbox-custom']} */ ;
/** @type {__VLS_StyleScopedClasses['checkbox-input']} */ ;
/** @type {__VLS_StyleScopedClasses['checkbox-custom']} */ ;
/** @type {__VLS_StyleScopedClasses['register-link']} */ ;
/** @type {__VLS_StyleScopedClasses['register-link']} */ ;
/** @type {__VLS_StyleScopedClasses['register-link']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['demo-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['demo-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['demo-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-side']} */ ;
/** @type {__VLS_StyleScopedClasses['form-side']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card']} */ ;
/** @type {__VLS_StyleScopedClasses['copyright']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card']} */ ;
/** @type {__VLS_StyleScopedClasses['login-form']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['demo-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand-side" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "halo halo-red" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "halo halo-purple" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "halo halo-blue" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "halo halo-accent" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "grid-bg" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "scanline" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "logo-mark" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "logo-pulse" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "logo-ring" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "logo-letter" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "brand-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "brand-highlight" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "book-illustration" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "bookshelf" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "book book-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "book book-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "book book-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "book book-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "book book-5" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "book book-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "shelf-line" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tagline-block" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "tagline" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "tagline-desc" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stats-bar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stats-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stats-num" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stats-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "stats-divider" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stats-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stats-num" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stats-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "stats-divider" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stats-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stats-num" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stats-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "particle p1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "particle p2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "particle p3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "particle p4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "particle p5" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "particle p6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "particle p7" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "particle p8" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-side" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "form-halo form-halo-red" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "form-halo form-halo-purple" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "form-halo form-halo-blue" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "form-particle fp1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "form-particle fp2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "form-particle fp3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "card-top-bar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    width: "28",
    height: "28",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "card-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "card-subtitle" },
});
const __VLS_0 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onSubmit': {} },
    ref: "formRef",
    model: (__VLS_ctx.form),
    ...{ class: "login-form" },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onSubmit': {} },
    ref: "formRef",
    model: (__VLS_ctx.form),
    ...{ class: "login-form" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onSubmit: (__VLS_ctx.handleLogin)
};
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_8 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "field-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field-label" },
});
const __VLS_10 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.form.username),
    placeholder: "请输入您的账号",
    size: "large",
    clearable: true,
}));
const __VLS_12 = __VLS_11({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.form.username),
    placeholder: "请输入您的账号",
    size: "large",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
let __VLS_14;
let __VLS_15;
let __VLS_16;
const __VLS_17 = {
    onKeyup: (__VLS_ctx.handleLogin)
};
__VLS_13.slots.default;
{
    const { prefix: __VLS_thisSlot } = __VLS_13.slots;
    const __VLS_18 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
    const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
    __VLS_21.slots.default;
    const __VLS_22 = {}.User;
    /** @type {[typeof __VLS_components.User, ]} */ ;
    // @ts-ignore
    const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({}));
    const __VLS_24 = __VLS_23({}, ...__VLS_functionalComponentArgsRest(__VLS_23));
    var __VLS_21;
}
var __VLS_13;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "field-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field-label" },
});
const __VLS_26 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.form.password),
    type: "password",
    placeholder: "请输入您的密码",
    size: "large",
    showPassword: true,
}));
const __VLS_28 = __VLS_27({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.form.password),
    type: "password",
    placeholder: "请输入您的密码",
    size: "large",
    showPassword: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
let __VLS_30;
let __VLS_31;
let __VLS_32;
const __VLS_33 = {
    onKeyup: (__VLS_ctx.handleLogin)
};
__VLS_29.slots.default;
{
    const { prefix: __VLS_thisSlot } = __VLS_29.slots;
    const __VLS_34 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({}));
    const __VLS_36 = __VLS_35({}, ...__VLS_functionalComponentArgsRest(__VLS_35));
    __VLS_37.slots.default;
    const __VLS_38 = {}.Lock;
    /** @type {[typeof __VLS_components.Lock, ]} */ ;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({}));
    const __VLS_40 = __VLS_39({}, ...__VLS_functionalComponentArgsRest(__VLS_39));
    var __VLS_37;
}
var __VLS_29;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-options" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "remember-me" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
    ...{ class: "checkbox-input" },
});
(__VLS_ctx.form.remember);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
    ...{ class: "checkbox-custom" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "checkbox-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.goRegister) },
    type: "button",
    ...{ class: "register-link" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleLogin) },
    type: "submit",
    ...{ class: "submit-btn" },
    ...{ class: ({ 'is-loading': __VLS_ctx.loading }) },
    disabled: (__VLS_ctx.loading),
});
if (!__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ class: "btn-arrow" },
        viewBox: "0 0 20 20",
        fill: "currentColor",
        width: "18",
        height: "18",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        'fill-rule': "evenodd",
        d: "M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z",
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "spinner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "demo-hint" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    viewBox: "0 0 20 20",
    fill: "currentColor",
    width: "16",
    height: "16",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    'fill-rule': "evenodd",
    d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "copyright" },
});
/** @type {__VLS_StyleScopedClasses['login-page']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-side']} */ ;
/** @type {__VLS_StyleScopedClasses['halo']} */ ;
/** @type {__VLS_StyleScopedClasses['halo-red']} */ ;
/** @type {__VLS_StyleScopedClasses['halo']} */ ;
/** @type {__VLS_StyleScopedClasses['halo-purple']} */ ;
/** @type {__VLS_StyleScopedClasses['halo']} */ ;
/** @type {__VLS_StyleScopedClasses['halo-blue']} */ ;
/** @type {__VLS_StyleScopedClasses['halo']} */ ;
/** @type {__VLS_StyleScopedClasses['halo-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['scanline']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-content']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-pulse']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-ring']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-letter']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-title']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-highlight']} */ ;
/** @type {__VLS_StyleScopedClasses['book-illustration']} */ ;
/** @type {__VLS_StyleScopedClasses['bookshelf']} */ ;
/** @type {__VLS_StyleScopedClasses['book']} */ ;
/** @type {__VLS_StyleScopedClasses['book-1']} */ ;
/** @type {__VLS_StyleScopedClasses['book']} */ ;
/** @type {__VLS_StyleScopedClasses['book-2']} */ ;
/** @type {__VLS_StyleScopedClasses['book']} */ ;
/** @type {__VLS_StyleScopedClasses['book-3']} */ ;
/** @type {__VLS_StyleScopedClasses['book']} */ ;
/** @type {__VLS_StyleScopedClasses['book-4']} */ ;
/** @type {__VLS_StyleScopedClasses['book']} */ ;
/** @type {__VLS_StyleScopedClasses['book-5']} */ ;
/** @type {__VLS_StyleScopedClasses['book']} */ ;
/** @type {__VLS_StyleScopedClasses['book-6']} */ ;
/** @type {__VLS_StyleScopedClasses['shelf-line']} */ ;
/** @type {__VLS_StyleScopedClasses['tagline-block']} */ ;
/** @type {__VLS_StyleScopedClasses['tagline']} */ ;
/** @type {__VLS_StyleScopedClasses['tagline-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-num']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-num']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-num']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-label']} */ ;
/** @type {__VLS_StyleScopedClasses['particle']} */ ;
/** @type {__VLS_StyleScopedClasses['p1']} */ ;
/** @type {__VLS_StyleScopedClasses['particle']} */ ;
/** @type {__VLS_StyleScopedClasses['p2']} */ ;
/** @type {__VLS_StyleScopedClasses['particle']} */ ;
/** @type {__VLS_StyleScopedClasses['p3']} */ ;
/** @type {__VLS_StyleScopedClasses['particle']} */ ;
/** @type {__VLS_StyleScopedClasses['p4']} */ ;
/** @type {__VLS_StyleScopedClasses['particle']} */ ;
/** @type {__VLS_StyleScopedClasses['p5']} */ ;
/** @type {__VLS_StyleScopedClasses['particle']} */ ;
/** @type {__VLS_StyleScopedClasses['p6']} */ ;
/** @type {__VLS_StyleScopedClasses['particle']} */ ;
/** @type {__VLS_StyleScopedClasses['p7']} */ ;
/** @type {__VLS_StyleScopedClasses['particle']} */ ;
/** @type {__VLS_StyleScopedClasses['p8']} */ ;
/** @type {__VLS_StyleScopedClasses['form-side']} */ ;
/** @type {__VLS_StyleScopedClasses['form-halo']} */ ;
/** @type {__VLS_StyleScopedClasses['form-halo-red']} */ ;
/** @type {__VLS_StyleScopedClasses['form-halo']} */ ;
/** @type {__VLS_StyleScopedClasses['form-halo-purple']} */ ;
/** @type {__VLS_StyleScopedClasses['form-halo']} */ ;
/** @type {__VLS_StyleScopedClasses['form-halo-blue']} */ ;
/** @type {__VLS_StyleScopedClasses['form-particle']} */ ;
/** @type {__VLS_StyleScopedClasses['fp1']} */ ;
/** @type {__VLS_StyleScopedClasses['form-particle']} */ ;
/** @type {__VLS_StyleScopedClasses['fp2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-particle']} */ ;
/** @type {__VLS_StyleScopedClasses['fp3']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-top-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['card-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['card-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['login-form']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-options']} */ ;
/** @type {__VLS_StyleScopedClasses['remember-me']} */ ;
/** @type {__VLS_StyleScopedClasses['checkbox-input']} */ ;
/** @type {__VLS_StyleScopedClasses['checkbox-custom']} */ ;
/** @type {__VLS_StyleScopedClasses['checkbox-label']} */ ;
/** @type {__VLS_StyleScopedClasses['register-link']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['demo-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['copyright']} */ ;
// @ts-ignore
var __VLS_9 = __VLS_8;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            User: User,
            Lock: Lock,
            loading: loading,
            formRef: formRef,
            form: form,
            goRegister: goRegister,
            handleLogin: handleLogin,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=Login.vue.js.map