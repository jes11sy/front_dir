/**
 * Zustand store для управления состоянием аутентификации
 * Централизованное хранилище для данных пользователя
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, User } from '@/lib/api';
import { logger } from '@/lib/logger';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  checkAuth: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: (token: string, user: User) => {
        set({
          token,
          user,
          isAuthenticated: true,
        });
        logger.info('User logged in successfully');
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        apiClient.logout();
        logger.info('User logged out');
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      checkAuth: async (): Promise<boolean> => {
        set({ isLoading: true });
        try {
          // 🍪 isAuthenticated теперь async - проверяет httpOnly cookies через API
          const isAuth = await apiClient.isAuthenticated();
          if (!isAuth) {
            set({ isLoading: false, isAuthenticated: false });
            return false;
          }

          const user = await apiClient.getProfile();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error) {
          logger.authError('Auth check failed', error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return false;
        }
      },

      refreshUser: async () => {
        try {
          const user = await apiClient.getProfile();
          set({ user });
        } catch (error) {
          logger.error('Failed to refresh user', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

