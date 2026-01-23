/**
 * Zustand store для управления состоянием аутентификации
 * Централизованное хранилище для данных пользователя
 * 
 * ВАЖНО: Токены хранятся в httpOnly cookies на сервере
 * Store используется только для кеширования данных пользователя на клиенте
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, User } from '@/lib/api';
import { logger } from '@/lib/logger';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  checkAuth: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user: User) => {
        set({
          user,
          isAuthenticated: true,
        });
        logger.debug('User set in store');
      },

      logout: async () => {
        set({
          user: null,
          isAuthenticated: false,
        });
        await apiClient.logout();
        logger.debug('User logged out');
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
          // Проверяем httpOnly cookies через API
          const isAuth = await apiClient.isAuthenticated();
          if (!isAuth) {
            set({ isLoading: false, isAuthenticated: false, user: null });
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
          logger.authError('Auth check failed');
          set({
            user: null,
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
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

