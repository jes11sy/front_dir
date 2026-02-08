import type { Metadata } from 'next'
import './globals.css'
import { Navigation } from '@/components/navigation'
import ClientLayout from './client-layout'
import { ToastProvider } from '@/components/ui/toast'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'Новые схемы',
  description: 'CRM Директора',
  manifest: '/manifest.json',
  icons: {
    icon: '/images/favicon.png',
    shortcut: '/images/favicon.png',
    apple: '/images/pwa.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'НС Директор',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: '#0d5c4b',
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
        {/* Критические стили навигации для предотвращения мерцания */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              nav.nav-main {
                background-color: rgba(255, 255, 255, 0.95);
                border-color: rgba(13, 92, 75, 0.2);
              }
              nav.nav-main .nav-logo { color: #1f2937; }
              nav.nav-main .nav-item { color: #374151; }
              nav.nav-main .nav-item-active { color: white; background-color: #0d5c4b; }
              html.dark nav.nav-main {
                background-color: rgba(30, 37, 48, 0.95);
                border-color: rgba(13, 92, 75, 0.4);
              }
              html.dark nav.nav-main .nav-logo { color: #f3f4f6; }
              html.dark nav.nav-main .nav-item { color: #d1d5db; }
              html.dark nav.nav-main .nav-item-active { color: white; background-color: #0d5c4b; }
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
