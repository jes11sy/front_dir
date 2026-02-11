'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Компонент для регистрации Service Worker
 * Регистрирует SW при монтировании
 */
export function ServiceWorkerRegister() {
  const router = useRouter();

  useEffect(() => {
    // Проверяем поддержку
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Обработчик сообщений от Service Worker
    const handleMessage = (event: MessageEvent) => {
      console.log('[SW Director Client] Message received:', event.data);
      
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const url = event.data.url;
        console.log('[SW Director Client] Notification click, navigating to:', url);
        
        if (url) {
          // Используем router.push для навигации в PWA
          router.push(url);
          
          // Также пытаемся focus на окне (для PWA)
          if (window.focus) {
            window.focus();
          }
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Регистрируем SW
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[SW Director] Registered successfully:', registration.scope);
        
        // Проверяем обновления сразу
        registration.update();
        
        // И каждый час
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error('[SW Director] Registration failed:', error);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [router]);

  return null;
}
