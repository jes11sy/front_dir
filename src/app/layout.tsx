import type { Metadata } from 'next'
import './globals.css'
import { Navigation } from '@/components/navigation'
import ClientLayout from './client-layout'
import { ToastProvider } from '@/components/ui/toast'
import Script from 'next/script'

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
    <html lang="ru">
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
      <body className="font-myriad">
        <ToastProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ToastProvider>
      </body>
    </html>
  )
}
