import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/navigation'
import ClientLayout from './client-layout'
import { ToastProvider } from '@/components/ui/toast'

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
