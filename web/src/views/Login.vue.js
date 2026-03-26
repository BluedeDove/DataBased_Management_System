/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { User, Lock } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/store/user';
const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);
const form = ref({ username: '', password: '' });
const handleLogin = async () => {
    if (!form.value.username || !form.value.password)
        return;
    loading.value = true;
    try {
        // 调用 store 中的 login action
        await userStore.login(form.value);
        ElMessage.success('登录成功');
        router.push('/dashboard');
    }
    catch (error) {
        console.error('Login failed:', error);
        ElMessage.error(error.message || '登录失败，请检查账号密码');
    }
    finally {
        loading.value = false;
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['gdut-logo-large']} */ ;
/** @type {__VLS_StyleScopedClasses['login-right']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "background-blobs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "blob blob-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "blob blob-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "background-image" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-box glass-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-left" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "gdut-logo-large" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    viewBox: "0 0 100 100",
    xmlns: "http://www.w3.org/2000/svg",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
    cx: "50",
    cy: "50",
    r: "45",
    fill: "rgba(255,255,255,0.2)",
    stroke: "rgba(255,255,255,0.5)",
    'stroke-width': "2",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.text, __VLS_intrinsicElements.text)({
    x: "50",
    y: "55",
    'text-anchor': "middle",
    fill: "white",
    'font-size': "24",
    'font-weight': "bold",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.text, __VLS_intrinsicElements.text)({
    x: "50",
    y: "70",
    'text-anchor': "middle",
    fill: "rgba(255,255,255,0.8)",
    'font-size': "8",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "gdut-tagline" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-right" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "subtitle" },
});
const __VLS_0 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ref: "formRef",
    model: (__VLS_ctx.form),
    ...{ class: "login-form" },
}));
const __VLS_2 = __VLS_1({
    ref: "formRef",
    model: (__VLS_ctx.form),
    ...{ class: "login-form" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_4 = {};
__VLS_3.slots.default;
const __VLS_6 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
__VLS_9.slots.default;
const __VLS_10 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
    modelValue: (__VLS_ctx.form.username),
    placeholder: "请输入账号",
    prefixIcon: (__VLS_ctx.User),
    size: "large",
}));
const __VLS_12 = __VLS_11({
    modelValue: (__VLS_ctx.form.username),
    placeholder: "请输入账号",
    prefixIcon: (__VLS_ctx.User),
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
var __VLS_9;
const __VLS_14 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({}));
const __VLS_16 = __VLS_15({}, ...__VLS_functionalComponentArgsRest(__VLS_15));
__VLS_17.slots.default;
const __VLS_18 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
    modelValue: (__VLS_ctx.form.password),
    type: "password",
    placeholder: "请输入密码",
    prefixIcon: (__VLS_ctx.Lock),
    showPassword: true,
    size: "large",
}));
const __VLS_20 = __VLS_19({
    modelValue: (__VLS_ctx.form.password),
    type: "password",
    placeholder: "请输入密码",
    prefixIcon: (__VLS_ctx.Lock),
    showPassword: true,
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
var __VLS_17;
const __VLS_22 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loading),
    ...{ class: "submit-btn" },
    size: "large",
}));
const __VLS_24 = __VLS_23({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loading),
    ...{ class: "submit-btn" },
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
let __VLS_26;
let __VLS_27;
let __VLS_28;
const __VLS_29 = {
    onClick: (__VLS_ctx.handleLogin)
};
__VLS_25.slots.default;
(__VLS_ctx.loading ? '登录中...' : '立即登录');
var __VLS_25;
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "footer-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "tip" },
});
const __VLS_30 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
}));
const __VLS_32 = __VLS_31({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
let __VLS_34;
let __VLS_35;
let __VLS_36;
const __VLS_37 = {
    onClick: (...[$event]) => {
        __VLS_ctx.$router.push('/register');
    }
};
__VLS_33.slots.default;
var __VLS_33;
/** @type {__VLS_StyleScopedClasses['login-container']} */ ;
/** @type {__VLS_StyleScopedClasses['background-blobs']} */ ;
/** @type {__VLS_StyleScopedClasses['blob']} */ ;
/** @type {__VLS_StyleScopedClasses['blob-1']} */ ;
/** @type {__VLS_StyleScopedClasses['blob']} */ ;
/** @type {__VLS_StyleScopedClasses['blob-2']} */ ;
/** @type {__VLS_StyleScopedClasses['background-image']} */ ;
/** @type {__VLS_StyleScopedClasses['login-box']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['login-left']} */ ;
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
/** @type {__VLS_StyleScopedClasses['gdut-logo-large']} */ ;
/** @type {__VLS_StyleScopedClasses['gdut-tagline']} */ ;
/** @type {__VLS_StyleScopedClasses['login-right']} */ ;
/** @type {__VLS_StyleScopedClasses['subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['login-form']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['tip']} */ ;
// @ts-ignore
var __VLS_5 = __VLS_4;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            User: User,
            Lock: Lock,
            loading: loading,
            form: form,
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