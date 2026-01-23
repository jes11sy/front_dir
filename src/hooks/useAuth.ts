/**
 * Custom hook для работы с аутентификацией
 * Использует Zustand store для централизованного управления состоянием
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

/**
 * Основной hook для доступа к данным аутентификации
 */
export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, logout, checkAuth, refreshUser, updateUser } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    logout,
    checkAuth,
    refreshUser,
    updateUser,
  };
}

/**
 * Hook для защиты роутов - редиректит на login если не авторизован
 * ВАЖНО: Предпочтительнее использовать AuthGuard компонент
 */
export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    const verify = async () => {
      const isAuth = await checkAuth();
      if (!isAuth) {
        router.push('/login');
      }
    };

    if (!isAuthenticated && !isLoading) {
      verify();
    }
  }, [isAuthenticated, isLoading, checkAuth, router]);

  return { isAuthenticated, isLoading };
}

