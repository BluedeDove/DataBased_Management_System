/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock, UserFilled, Postcard, Iphone, Message, Location } from '@element-plus/icons-vue';
import { authApi } from '../api/auth.api';
const router = useRouter();
const formRef = ref();
const loading = ref(false);
const form = reactive({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    identity: '',
    id_card: '',
    phone: '',
    email: '',
    address: ''
});
const validateConfirmPassword = (_rule, value, callback) => {
    if (value === '') {
        callback(new Error('请再次输入密码'));
    }
    else if (value !== form.password) {
        callback(new Error('两次输入的密码不一致'));
    }
    else {
        callback();
    }
};
const validatePhone = (_rule, value, callback) => {
    if (!value) {
        callback(new Error('请输入手机号'));
    }
    else {
        callback();
    }
};
const validateEmail = (_rule, value, callback) => {
    if (value && value.trim()) {
        callback();
    }
    else {
        callback();
    }
};
const rules = {
    name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
    username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 3, max: 20, message: '用户名长度在3到20个字符之间', trigger: 'blur' }
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, message: '密码长度不能小于6位', trigger: 'blur' }
    ],
    confirmPassword: [
        { required: true, validator: validateConfirmPassword, trigger: 'blur' }
    ],
    identity: [{ required: true, message: '请选择身份类型', trigger: 'change' }],
    id_card: [{ message: '请输入学号或工号', trigger: 'blur' }],
    phone: [{ required: true, validator: validatePhone, trigger: 'blur' }],
    email: [{ validator: validateEmail, trigger: 'blur' }],
    address: []
};
const handleRegister = async () => {
    if (!formRef.value)
        return;
    try {
        await formRef.value.validate();
        loading.value = true;
        const response = await authApi.register({
            username: form.username,
            password: form.password,
            name: form.name,
            identity: form.identity,
            id_card: form.id_card || undefined,
            phone: form.phone,
            email: form.email || undefined,
            address: form.address || undefined
        });
        if (response.success) {
            ElMessage.success('注册成功！请使用您的账号登录');
            router.push('/login');
        }
        else {
            ElMessage.error(response.error?.message || '注册失败');
        }
    }
    catch (error) {
        console.error('注册失败:', error);
        if (error instanceof Error) {
            ElMessage.error(error.message || '注册失败，请稍后重试');
        }
    }
    finally {
        loading.value = false;
    }
};
const goToLogin = () => {
    router.push('/login');
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['register-button']} */ ;
/** @type {__VLS_StyleScopedClasses['register-button']} */ ;
/** @type {__VLS_StyleScopedClasses['login-link']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "register-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "register-bg" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "bg-decoration" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "register-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "register-header" },
});
const __VLS_0 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "logo-icon" },
    size: (48),
}));
const __VLS_2 = __VLS_1({
    ...{ class: "logo-icon" },
    size: (48),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.UserFilled;
/** @type {[typeof __VLS_components.UserFilled, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "register-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "register-subtitle" },
});
const __VLS_8 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    ...{ class: "register-form" },
    labelWidth: "100px",
}));
const __VLS_10 = __VLS_9({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    ...{ class: "register-form" },
    labelWidth: "100px",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_12 = {};
__VLS_11.slots.default;
const __VLS_14 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
    label: "姓名",
    prop: "name",
}));
const __VLS_16 = __VLS_15({
    label: "姓名",
    prop: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
__VLS_17.slots.default;
const __VLS_18 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入真实姓名",
    size: "large",
    prefixIcon: (__VLS_ctx.User),
}));
const __VLS_20 = __VLS_19({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入真实姓名",
    size: "large",
    prefixIcon: (__VLS_ctx.User),
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
var __VLS_17;
const __VLS_22 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
    label: "用户名",
    prop: "username",
}));
const __VLS_24 = __VLS_23({
    label: "用户名",
    prop: "username",
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
__VLS_25.slots.default;
const __VLS_26 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    modelValue: (__VLS_ctx.form.username),
    placeholder: "请输入用户名（用于登录）",
    size: "large",
    prefixIcon: (__VLS_ctx.User),
}));
const __VLS_28 = __VLS_27({
    modelValue: (__VLS_ctx.form.username),
    placeholder: "请输入用户名（用于登录）",
    size: "large",
    prefixIcon: (__VLS_ctx.User),
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
var __VLS_25;
const __VLS_30 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
    label: "密码",
    prop: "password",
}));
const __VLS_32 = __VLS_31({
    label: "密码",
    prop: "password",
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
__VLS_33.slots.default;
const __VLS_34 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
    modelValue: (__VLS_ctx.form.password),
    type: "password",
    placeholder: "请输入密码（至少6位）",
    size: "large",
    showPassword: true,
    prefixIcon: (__VLS_ctx.Lock),
}));
const __VLS_36 = __VLS_35({
    modelValue: (__VLS_ctx.form.password),
    type: "password",
    placeholder: "请输入密码（至少6位）",
    size: "large",
    showPassword: true,
    prefixIcon: (__VLS_ctx.Lock),
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
var __VLS_33;
const __VLS_38 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
    label: "确认密码",
    prop: "confirmPassword",
}));
const __VLS_40 = __VLS_39({
    label: "确认密码",
    prop: "confirmPassword",
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
__VLS_41.slots.default;
const __VLS_42 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
    modelValue: (__VLS_ctx.form.confirmPassword),
    type: "password",
    placeholder: "请再次输入密码",
    size: "large",
    showPassword: true,
    prefixIcon: (__VLS_ctx.Lock),
}));
const __VLS_44 = __VLS_43({
    modelValue: (__VLS_ctx.form.confirmPassword),
    type: "password",
    placeholder: "请再次输入密码",
    size: "large",
    showPassword: true,
    prefixIcon: (__VLS_ctx.Lock),
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
var __VLS_41;
const __VLS_46 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
    label: "身份类型",
    prop: "identity",
}));
const __VLS_48 = __VLS_47({
    label: "身份类型",
    prop: "identity",
}, ...__VLS_functionalComponentArgsRest(__VLS_47));
__VLS_49.slots.default;
const __VLS_50 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
    modelValue: (__VLS_ctx.form.identity),
    placeholder: "请选择身份类型",
    size: "large",
    ...{ style: {} },
}));
const __VLS_52 = __VLS_51({
    modelValue: (__VLS_ctx.form.identity),
    placeholder: "请选择身份类型",
    size: "large",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_51));
__VLS_53.slots.default;
const __VLS_54 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
    label: "教师",
    value: "teacher",
}));
const __VLS_56 = __VLS_55({
    label: "教师",
    value: "teacher",
}, ...__VLS_functionalComponentArgsRest(__VLS_55));
const __VLS_58 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
    label: "学生",
    value: "student",
}));
const __VLS_60 = __VLS_59({
    label: "学生",
    value: "student",
}, ...__VLS_functionalComponentArgsRest(__VLS_59));
var __VLS_53;
var __VLS_49;
const __VLS_62 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({
    label: "学号/工号",
    prop: "id_card",
}));
const __VLS_64 = __VLS_63({
    label: "学号/工号",
    prop: "id_card",
}, ...__VLS_functionalComponentArgsRest(__VLS_63));
__VLS_65.slots.default;
const __VLS_66 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
    modelValue: (__VLS_ctx.form.id_card),
    placeholder: "请输入学号或工号（可选，留空自动生成）",
    size: "large",
    prefixIcon: (__VLS_ctx.Postcard),
}));
const __VLS_68 = __VLS_67({
    modelValue: (__VLS_ctx.form.id_card),
    placeholder: "请输入学号或工号（可选，留空自动生成）",
    size: "large",
    prefixIcon: (__VLS_ctx.Postcard),
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
var __VLS_65;
const __VLS_70 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
    label: "手机号",
    prop: "phone",
}));
const __VLS_72 = __VLS_71({
    label: "手机号",
    prop: "phone",
}, ...__VLS_functionalComponentArgsRest(__VLS_71));
__VLS_73.slots.default;
const __VLS_74 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
    modelValue: (__VLS_ctx.form.phone),
    placeholder: "请输入手机号",
    size: "large",
    prefixIcon: (__VLS_ctx.Iphone),
}));
const __VLS_76 = __VLS_75({
    modelValue: (__VLS_ctx.form.phone),
    placeholder: "请输入手机号",
    size: "large",
    prefixIcon: (__VLS_ctx.Iphone),
}, ...__VLS_functionalComponentArgsRest(__VLS_75));
var __VLS_73;
const __VLS_78 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
    label: "邮箱",
    prop: "email",
}));
const __VLS_80 = __VLS_79({
    label: "邮箱",
    prop: "email",
}, ...__VLS_functionalComponentArgsRest(__VLS_79));
__VLS_81.slots.default;
const __VLS_82 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
    modelValue: (__VLS_ctx.form.email),
    placeholder: "请输入邮箱（可选）",
    size: "large",
    prefixIcon: (__VLS_ctx.Message),
}));
const __VLS_84 = __VLS_83({
    modelValue: (__VLS_ctx.form.email),
    placeholder: "请输入邮箱（可选）",
    size: "large",
    prefixIcon: (__VLS_ctx.Message),
}, ...__VLS_functionalComponentArgsRest(__VLS_83));
var __VLS_81;
const __VLS_86 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_87 = __VLS_asFunctionalComponent(__VLS_86, new __VLS_86({
    label: "家庭地址",
}));
const __VLS_88 = __VLS_87({
    label: "家庭地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_87));
__VLS_89.slots.default;
const __VLS_90 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
    modelValue: (__VLS_ctx.form.address),
    placeholder: "请输入家庭地址（可选）",
    size: "large",
    prefixIcon: (__VLS_ctx.Location),
}));
const __VLS_92 = __VLS_91({
    modelValue: (__VLS_ctx.form.address),
    placeholder: "请输入家庭地址（可选）",
    size: "large",
    prefixIcon: (__VLS_ctx.Location),
}, ...__VLS_functionalComponentArgsRest(__VLS_91));
var __VLS_89;
const __VLS_94 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({}));
const __VLS_96 = __VLS_95({}, ...__VLS_functionalComponentArgsRest(__VLS_95));
__VLS_97.slots.default;
const __VLS_98 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    loading: (__VLS_ctx.loading),
    ...{ class: "register-button" },
}));
const __VLS_100 = __VLS_99({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    loading: (__VLS_ctx.loading),
    ...{ class: "register-button" },
}, ...__VLS_functionalComponentArgsRest(__VLS_99));
let __VLS_102;
let __VLS_103;
let __VLS_104;
const __VLS_105 = {
    onClick: (__VLS_ctx.handleRegister)
};
__VLS_101.slots.default;
(__VLS_ctx.loading ? '注册中...' : '立即注册');
var __VLS_101;
var __VLS_97;
const __VLS_106 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({}));
const __VLS_108 = __VLS_107({}, ...__VLS_functionalComponentArgsRest(__VLS_107));
__VLS_109.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-link" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_110 = {}.ElLink;
/** @type {[typeof __VLS_components.ElLink, typeof __VLS_components.elLink, typeof __VLS_components.ElLink, typeof __VLS_components.elLink, ]} */ ;
// @ts-ignore
const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_112 = __VLS_111({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_111));
let __VLS_114;
let __VLS_115;
let __VLS_116;
const __VLS_117 = {
    onClick: (__VLS_ctx.goToLogin)
};
__VLS_113.slots.default;
var __VLS_113;
var __VLS_109;
var __VLS_11;
/** @type {__VLS_StyleScopedClasses['register-container']} */ ;
/** @type {__VLS_StyleScopedClasses['register-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-decoration']} */ ;
/** @type {__VLS_StyleScopedClasses['register-card']} */ ;
/** @type {__VLS_StyleScopedClasses['register-header']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['register-title']} */ ;
/** @type {__VLS_StyleScopedClasses['register-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['register-form']} */ ;
/** @type {__VLS_StyleScopedClasses['register-button']} */ ;
/** @type {__VLS_StyleScopedClasses['login-link']} */ ;
// @ts-ignore
var __VLS_13 = __VLS_12;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            User: User,
            Lock: Lock,
            UserFilled: UserFilled,
            Postcard: Postcard,
            Iphone: Iphone,
            Message: Message,
            Location: Location,
            formRef: formRef,
            loading: loading,
            form: form,
            rules: rules,
            handleRegister: handleRegister,
            goToLogin: goToLogin,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=Register.vue.js.map