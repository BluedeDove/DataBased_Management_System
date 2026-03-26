import { request } from './index';
export const authApi = {
    login: (credentials) => request.post('/auth/login', credentials),
    logout: () => request.post('/auth/logout'),
    validate: () => request.get('/auth/validate'),
    changePassword: (oldPassword, newPassword) => request.put('/auth/password', { oldPassword, newPassword }),
    register: (data) => request.post('/auth/register', data),
    getPermissions: () => request.get('/auth/permissions'),
    checkPermission: (permission) => request.post('/auth/check-permission', { permission })
};
//# sourceMappingURL=auth.api.js.map