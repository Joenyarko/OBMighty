import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
    throw new Error('VITE_API_URL environment variable is not set. Please check your .env file.');
}

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
// Derive root URL from API_URL (remove /api)
const ROOT_URL = API_URL.replace(/\/api\/?$/, '');

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/login', credentials),
    logout: () => api.post('/logout'),
    me: () => api.get('/me'),
};

// Customer API
export const customerAPI = {
    getAll: (params) => api.get('/customers', { params }),
    getOne: (id) => api.get(`/customers/${id}`),
    create: (data) => api.post('/customers', data),
    update: (id, data) => api.put(`/customers/${id}`, data),
    delete: (id) => api.delete(`/customers/${id}`),
    transfer: (id, newWorkerId) => api.post(`/customers/${id}/transfer`, { new_worker_id: newWorkerId }),
    markServed: (id) => api.post(`/customers/${id}/serve`),
};

// Payment API
export const paymentAPI = {
    getAll: (params) => api.get('/payments', { params }),
    create: (data) => api.post('/payments', data),
    bulkCreate: (data) => api.post('/payments/bulk', data),
};

// Report API
export const reportAPI = {
    daily: (params) => api.get('/reports/daily', { params }),
    weekly: (params) => api.get('/reports/weekly', { params }),
    monthly: (params) => api.get('/reports/monthly', { params }),
    workerPerformance: (params) => api.get('/reports/worker-performance', { params }),
    defaultingCustomers: () => api.get('/reports/defaulting-customers'),
};

// Card API
export const cardAPI = {
    getAll: () => api.get('/cards'),
    getOne: (id) => api.get(`/cards/${id}`),
    create: (data) => api.post('/cards', data),
    update: (id, data) => api.put(`/cards/${id}`, data),
    delete: (id) => api.delete(`/cards/${id}`),
};

// Branch API
export const branchAPI = {
    getAll: () => api.get('/branches'),
    getOne: (id) => api.get(`/branches/${id}`),
    create: (data) => api.post('/branches', data),
    update: (id, data) => api.put(`/branches/${id}`, data),
    delete: (id) => api.delete(`/branches/${id}`),
};

// User API
export const userAPI = {
    getAll: () => api.get('/users'),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
};

// Inventory API
export const inventoryAPI = {
    getAll: () => api.get('/inventory'),
    create: (data) => api.post('/inventory', data),
    update: (id, data) => api.put(`/inventory/${id}`, data),
    delete: (id) => api.delete(`/inventory/${id}`),
    recordMovement: (id, data) => api.post(`/inventory/${id}/movement`, data),
    lowStock: () => api.get('/inventory/low-stock'),
};

// Accounting API
export const accountingAPI = {
    getExpenses: (params) => api.get('/expenses', { params }),
    createExpense: (data) => api.post('/expenses', data),
    getSummary: (params) => api.get('/accounting/summary', { params }),
    getLedger: (params) => api.get('/accounting/ledger', { params }),
    getProfitLoss: (params) => api.get('/accounting/profit-loss', { params }),
};

// Customer Card API
export const customerCardAPI = {
    getCard: (customerId) => api.get(`/customer-cards/customer/${customerId}`),
    checkBoxes: (id, data) => api.post(`/customer-cards/${id}/check-boxes`, data),
    getBoxStates: (id) => api.get(`/customer-cards/${id}/box-states`),
    getPaymentHistory: (id) => api.get(`/customer-cards/${id}/payment-history`),
    getDailySales: (id, date) => api.get(`/customer-cards/${id}/daily-sales`, { params: { date } }),
    getWorkerDailySales: (date) => api.get('/customer-cards/worker/daily-sales', { params: { date } }),
};

export const permissionAPI = {
    getAll: () => api.get('/permissions'),
    syncUser: (userId, permissions) => api.post(`/users/${userId}/permissions`, { permissions }),
};

export const roleAPI = {
    getAll: () => api.get('/roles'),
    getOne: (id) => api.get(`/roles/${id}`),
    syncPermissions: (roleId, permissions) => api.post(`/roles/${roleId}/permissions`, { permissions }),
};

export const auditLogAPI = {
    getAll: (params) => api.get('/audit-logs', { params }),
};

export default api;
