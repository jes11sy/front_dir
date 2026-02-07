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
    icon: '/images/favicon.png',
    shortcut: '/images/favicon.png',
    apple: '/images/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Скрипт инициализации темы - ДОЛЖЕН быть первым, чтобы избежать мелькания */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('design-storage');
                  if (stored) {
                    var data = JSON.parse(stored);
                    var theme = data.state && data.state.theme;
                    if (theme === 'dark') {
                      document.documentElement.classList.add('dark');
                      document.documentElement.style.backgroundColor = '#1e2530';
                      document.documentElement.style.colorScheme = 'dark';
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
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
      <body className="font-myriad transition-colors duration-0">
        <ToastProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ToastProvider>
      </body>
    </html>
  )
}
