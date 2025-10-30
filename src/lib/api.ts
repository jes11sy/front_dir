import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.test-shem.ru/api/v1',
  timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
});

// Request interceptor - добавляем токен в каждый запрос
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - автоматическое обновление токена при 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Проверяем условия для обновления токена
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        // Если токен уже обновляется, добавляем запрос в очередь
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // Нет refresh токена - очищаем хранилище и редирект
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        console.log('[API] Refreshing access token...');
        
        // Обновляем токен
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://api.test-shem.ru/api/v1'}/auth/refresh`,
          { refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Сохраняем новые токены
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        console.log('[API] Access token refreshed successfully');

        // Обновляем заголовок в axios
        if (api.defaults.headers.common) {
          api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        }
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Обрабатываем очередь неудавшихся запросов
        processQueue(null, accessToken);

        // Повторяем исходный запрос
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh токен невалиден - выходим
        console.error('[API] Failed to refresh token:', refreshError);
        processQueue(refreshError as AxiosError, null);
        
        localStorage.clear();
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Вспомогательные функции для работы с токенами
export const authUtils = {
  /**
   * Сохранить токены после логина
   */
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },

  /**
   * Получить access токен
   */
  getAccessToken: () => {
    return localStorage.getItem('accessToken');
  },

  /**
   * Получить refresh токен
   */
  getRefreshToken: () => {
    return localStorage.getItem('refreshToken');
  },

  /**
   * Проверить наличие токенов
   */
  hasTokens: () => {
    return !!(localStorage.getItem('accessToken') && localStorage.getItem('refreshToken'));
  },

  /**
   * Очистить токены (logout)
   */
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  /**
   * Logout с вызовом API
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('[API] Logout error:', error);
    } finally {
      authUtils.clearTokens();
      window.location.href = '/login';
    }
  },
};

// Обертка apiClient для обратной совместимости
export const apiClient = {
  // Auth
  login: async (login: string, password: string) => {
    const response = await api.post('/auth/login', {
      login,
      password,
      role: 'director',
    });
    // Автоматически сохраняем токены
    authUtils.setTokens(response.data.data.accessToken, response.data.data.refreshToken);
    return response.data.data;
  },

  logout: async () => {
    await authUtils.logout();
  },

  isAuthenticated: () => {
    return authUtils.hasTokens();
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data.data;
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getCurrentUserProfile: async () => {
    return await apiClient.getProfile();
  },

  // Orders
  getOrders: async (params?: any) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  getOrder: async (id: number) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  updateOrder: async (id: number, data: any) => {
    const response = await api.put(`/orders/${id}`, data);
    return response.data;
  },

  getOrderStatuses: async () => {
    const response = await api.get('/orders/statuses');
    return response.data;
  },

  // Masters
  getMasters: async () => {
    const response = await api.get('/masters');
    return response.data;
  },

  // Calls
  getCallsByOrderId: async (orderId: number) => {
    const response = await api.get(`/calls/order/${orderId}`);
    return response.data;
  },

  // Employees
  getEmployees: async () => {
    const response = await api.get('/employees');
    return response.data;
  },

  getEmployee: async (id: number) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  createEmployee: async (data: any) => {
    const response = await api.post('/employees', data);
    return response.data;
  },

  updateEmployee: async (id: number, data: any) => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
  },

  // Files/Uploads
  uploadFile: async (file: File, folder: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/files/upload/${folder}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadReceipt: async (file: File, folder: string) => {
    return await apiClient.uploadFile(file, folder);
  },

  uploadOrderBso: async (file: File) => {
    return await apiClient.uploadFile(file, 'orders');
  },

  uploadOrderExpenditure: async (file: File) => {
    return await apiClient.uploadFile(file, 'orders');
  },

  uploadMasterPassport: async (file: File) => {
    return await apiClient.uploadFile(file, 'masters');
  },

  uploadMasterContract: async (file: File) => {
    return await apiClient.uploadFile(file, 'masters');
  },

  uploadDirectorPassport: async (file: File) => {
    return await apiClient.uploadFile(file, 'directors');
  },

  uploadDirectorContract: async (file: File) => {
    return await apiClient.uploadFile(file, 'directors');
  },

  uploadCashExpenseReceipt: async (file: File) => {
    return await apiClient.uploadFile(file, 'cash');
  },

  uploadCashIncomeReceipt: async (file: File) => {
    return await apiClient.uploadFile(file, 'cash');
  },

  // Cash Transactions
  getCashTransactions: async () => {
    const response = await api.get('/cash/transactions');
    return response.data;
  },

  getCashIncome: async () => {
    const response = await api.get('/cash/income');
    return response.data;
  },

  getCashExpense: async () => {
    const response = await api.get('/cash/expense');
    return response.data;
  },

  createCashTransaction: async (data: any) => {
    const response = await api.post('/cash/transactions', data);
    return response.data;
  },

  checkCashTransactionByOrder: async (orderId: number) => {
    const response = await api.get(`/cash/transactions/order/${orderId}`);
    return response.data;
  },

  updateCashTransactionByOrder: async (orderId: number, data: any) => {
    const response = await api.put(`/cash/transactions/order/${orderId}`, data);
    return response.data;
  },

  // Reports
  getMastersReport: async (filters: any) => {
    const response = await api.get('/reports/masters', { params: filters });
    return response.data;
  },

  getCityReport: async (filters: any) => {
    const response = await api.get('/reports/city', { params: filters });
    return response.data;
  },

  // Master Handover
  getMasterHandoverSummary: async () => {
    const response = await api.get('/master-handover/summary');
    return response.data;
  },

  getMasterHandoverDetails: async (masterId: number) => {
    const response = await api.get(`/master-handover/${masterId}`);
    return response.data;
  },

  approveMasterHandover: async (orderId: number) => {
    const response = await api.post(`/master-handover/${orderId}/approve`);
    return response.data;
  },

  rejectMasterHandover: async (orderId: number) => {
    const response = await api.post(`/master-handover/${orderId}/reject`);
    return response.data;
  },

  // Avito
  getOrderAvitoChat: async (orderId: string) => {
    const response = await api.get(`/orders/${orderId}/avito/chat`);
    return response.data;
  },

  getAvitoMessages: async (chatId: string, avitoAccountName: string, limit?: number) => {
    const response = await api.get(`/avito/messages`, {
      params: { chatId, avitoAccountName, limit },
    });
    return response.data;
  },

  sendAvitoMessage: async (chatId: string, message: string, avitoAccountName: string) => {
    const response = await api.post(`/avito/messages`, {
      chatId,
      message,
      avitoAccountName,
    });
    return response.data;
  },

  markAvitoChatAsRead: async (chatId: string, avitoAccountName: string) => {
    const response = await api.post(`/avito/chat/read`, {
      chatId,
      avitoAccountName,
    });
    return response.data;
  },

  // Profile
  updateUserProfile: async (data: any) => {
    const response = await api.put('/profile', data);
    return response.data;
  },
};

export default api;
