import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/navigation'
import ClientLayout from './client-layout'
import { ToastProvider } from '@/components/ui/toast'
import Script from 'next/script'

// Оптимизация шрифта Inter для производительности
const inter = Inter({ 
  subsets: ['latin', 'cyrillic'], // Добавлена поддержка кириллицы (русский язык)
  display: 'swap', // Избегаем FOIT (Flash of Invisible Text) - показываем системный шрифт пока загружается
  preload: true, // Предзагрузка для ускорения
  variable: '--font-inter', // CSS переменная для использования в Tailwind
  weight: ['400', '500', '600', '700'], // Только используемые веса
})

export const metadata: Metadata = {
  title: 'Новые схемы',
  description: 'CRM Директора',
  icons: {
    icon: '/images/logo.png',
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <head>
        <Script id="error-handler" strategy="beforeInteractive">
          {`
            // Глобальная обработка необработанных ошибок
            window.addEventListener('error', function(event) {
              console.error('Global error caught:', event.error);
              // Предотвращаем падение приложения
              event.preventDefault();
            });
            
            // Обработка необработанных промисов
            window.addEventListener('unhandledrejection', function(event) {
              console.error('Unhandled promise rejection:', event.reason);
              // Предотвращаем падение приложения
              event.preventDefault();
            });
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <ToastProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ToastProvider>
      </body>
    </html>
  )
}
