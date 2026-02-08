'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'
import { Sun, Moon, Bell, User, Menu, X } from 'lucide-react'

// Ключ для сохранения позиции прокрутки
const SCROLL_POSITION_KEY = 'orders_scroll_position'

const navigationItems = [
  { name: 'Заказы', href: '/orders', icon: '/images/navigate/orders.svg' },
  { name: 'Касса', href: '/cash', icon: '/images/navigate/cash.svg' },
  { name: 'Отчеты', href: '/reports', icon: '/images/navigate/reports.svg' },
  { name: 'Сдача мастеров', href: '/master-handover', icon: '/images/navigate/master-handover.svg' },
  { name: 'Сотрудники', href: '/employees', icon: '/images/navigate/employees.svg' },
]

// Вынесено за пределы CustomNavigation, чтобы React не пересоздавал компонент при каждом рендере
// (иначе иконки мерцают при смене страницы)
interface MenuContentProps {
  isMobile?: boolean
  pathname: string
  version: string
  theme: string
  toggleVersion: () => void
  toggleTheme: () => void
  userName: string | undefined
  onCloseMobileMenu: () => void
}

const MenuContent = memo(function MenuContent({
  isMobile = false,
  pathname,
  version,
  theme,
  toggleVersion,
  toggleTheme,
  userName,
  onCloseMobileMenu,
}: MenuContentProps) {
  // Проверка активности с учетом подстраниц
  const isActive = (href: string) => {
    if (pathname === href) return true
    if (href !== '/orders' && pathname.startsWith(href + '/')) return true
    return false
  }

  return (
    <>
      {/* Navigation */}
      <nav className={`flex-1 px-5 ${isMobile ? 'space-y-4' : 'space-y-3'}`}>
        {navigationItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-icon-hover relative flex items-center gap-3 px-3 font-normal group ${
                isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
              }`}
              onClick={onCloseMobileMenu}
            >
              {/* Индикатор активной вкладки - тонкая скобка */}
              <span 
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-[6px] ${
                  active ? 'opacity-100' : 'opacity-0'
                } ${isMobile ? 'h-12' : 'h-10'}`}
              >
                <svg viewBox="0 0 6 40" fill="none" className="w-full h-full">
                  <path 
                    d="M5 1C2.5 1 1 4.5 1 10v20c0 5.5 1.5 9 4 9" 
                    stroke="#0d5c4b" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
              <Image 
                src={item.icon} 
                alt={item.name} 
                width={isMobile ? 24 : 20} 
                height={isMobile ? 24 : 20} 
                className={`nav-icon ${active ? 'nav-icon-active' : ''} ${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`}
              />
              <span className="text-gray-800 dark:text-gray-200 group-hover:text-[#0d5c4b]">
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className={`px-5 pb-6 ${isMobile ? 'space-y-4' : 'space-y-3'}`}>
        {/* Version Toggle - только для V1 */}
        {version === 'v1' && (
          <div className={`flex items-center gap-3 px-3 ${isMobile ? 'py-3' : 'py-2'}`}>
            <span className={`transition-colors ${isMobile ? 'text-base' : 'text-sm'} ${version === 'v1' ? 'text-[#0d5c4b]' : 'text-gray-400'}`}>V1</span>
            <button
              onClick={toggleVersion}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                version === 'v2' ? 'bg-[#0d5c4b]' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                  version === 'v2' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`transition-colors ${isMobile ? 'text-base' : 'text-sm'} ${version === 'v2' ? 'text-[#0d5c4b]' : 'text-gray-400'}`}>V2</span>
          </div>
        )}

        {/* Theme Toggle - только для V2 */}
        {version === 'v2' && (
          <div className={`flex items-center gap-3 px-3 ${isMobile ? 'py-3' : 'py-2'}`}>
            <Sun className={`transition-colors ${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${theme === 'light' ? 'text-[#0d5c4b]' : 'text-gray-400'}`} />
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                theme === 'dark' ? 'bg-[#0d5c4b]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <Moon className={`transition-colors ${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${theme === 'dark' ? 'text-[#0d5c4b]' : 'text-gray-400'}`} />
          </div>
        )}

        {/* Notifications */}
        <button
          className={`relative flex items-center gap-3 px-3 text-gray-800 dark:text-gray-200 hover:text-[#0d5c4b] w-full group ${
            isMobile ? 'py-3 text-base' : 'py-2.5 text-sm'
          }`}
        >
          <div className="relative">
            <Bell className={isMobile ? 'h-6 w-6' : 'h-5 w-5'} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </div>
          <span className="group-hover:text-[#0d5c4b]">
            Уведомления
          </span>
        </button>

        {/* Profile with user name */}
        <Link
          href="/profile"
          className={`nav-icon-hover relative flex items-center gap-3 px-3 font-normal group ${
            isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
          }`}
          onClick={onCloseMobileMenu}
        >
          <span 
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[6px] ${
              isActive('/profile') ? 'opacity-100' : 'opacity-0'
            } ${isMobile ? 'h-12' : 'h-10'}`}
          >
            <svg viewBox="0 0 6 40" fill="none" className="w-full h-full">
              <path 
                d="M5 1C2.5 1 1 4.5 1 10v20c0 5.5 1.5 9 4 9" 
                stroke="#0d5c4b" 
                strokeWidth="1.5" 
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
          <User className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`} />
          <span className="text-gray-800 dark:text-gray-200 group-hover:text-[#0d5c4b]">
            {userName || 'Профиль'}
          </span>
        </Link>
      </div>
    </>
  )
})

export function CustomNavigation() {
  const { user } = useAuthStore()
  const { version, toggleVersion, theme, toggleTheme } = useDesignStore()
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Стабильная ссылка на колбэк закрытия мобильного меню
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), [])

  // Закрываем меню при смене маршрута
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Блокируем скролл body при открытом меню
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  // Проверка активности с учетом подстраниц
  const isActive = (href: string) => {
    if (pathname === href) return true
    if (href !== '/orders' && pathname.startsWith(href + '/')) return true
    return false
  }

  // Переход на главную страницу заказов
  const handleLogoClick = () => {
    setIsMobileMenuOpen(false)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SCROLL_POSITION_KEY)
    }
    router.push('/orders')
  }

  const userName = user?.name || user?.login

  return (
    <>
      {/* Mobile Header */}
      <header className={`md:hidden fixed top-0 left-0 w-screen z-[9999] h-16 bg-white dark:bg-[#1e2530] flex items-center justify-between px-6 transition-all ${
        isMobileMenuOpen ? '' : 'border-b border-gray-200 dark:border-gray-700'
      }`}>
        <button onClick={handleLogoClick} className="bg-transparent border-none cursor-pointer p-0">
          <Image 
            src={theme === 'dark' ? "/images/logo_dark_v2.png" : "/images/logo_light_v2.png"} 
            alt="Новые Схемы" 
            width={130} 
            height={36} 
            className="h-9 w-auto" 
            priority
          />
        </button>
        <div className="flex items-center gap-2">
          {/* Mobile Notifications Bell */}
          <button
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-[#0d5c4b] transition-colors relative"
            aria-label="Уведомления"
          >
            <Bell className="h-6 w-6" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-[#0d5c4b] transition-colors"
            aria-label="Открыть меню"
          >
            {isMobileMenuOpen ? (
              <X className="h-7 w-7" />
            ) : (
              <Menu className="h-7 w-7" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Full-screen Menu */}
      <aside 
        className={`md:hidden fixed top-16 left-0 w-screen h-[calc(100vh-4rem)] bg-white dark:bg-[#1e2530] z-[9998] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pt-6 flex flex-col h-full overflow-y-auto">
          <MenuContent
            isMobile={true}
            pathname={pathname}
            version={version}
            theme={theme}
            toggleVersion={toggleVersion}
            toggleTheme={toggleTheme}
            userName={userName}
            onCloseMobileMenu={closeMobileMenu}
          />
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 bg-white dark:bg-[#1e2530] h-screen flex-col border-r border-gray-200 dark:border-gray-700 fixed left-0 top-0">
        {/* Logo */}
        <div className="p-6 pb-16">
          <button onClick={handleLogoClick} className="bg-transparent border-none cursor-pointer p-0">
            <Image 
              src={theme === 'dark' ? "/images/logo_dark_v2.png" : "/images/logo_light_v2.png"} 
              alt="Новые Схемы" 
              width={160} 
              height={45} 
              className="h-10 w-auto cursor-pointer" 
              priority
            />
          </button>
        </div>

        <MenuContent
          isMobile={false}
          pathname={pathname}
          version={version}
          theme={theme}
          toggleVersion={toggleVersion}
          toggleTheme={toggleTheme}
          userName={userName}
          onCloseMobileMenu={closeMobileMenu}
        />
      </aside>
    </>
  )
}
