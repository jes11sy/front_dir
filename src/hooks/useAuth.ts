/**
 * Custom hook для работы с аутентификацией
 * Использует Zustand store вместо прямого обращения к localStorage
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export function useAuth() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, login, logout, checkAuth, refreshUser } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
    refreshUser,
  };
}

/**
 * Hook для защиты роутов - редиректит на login если не авторизован
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

