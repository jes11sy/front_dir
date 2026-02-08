'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useCallback, useEffect, memo, useMemo } from 'react'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'
import { Sun, Moon, Bell, User, Menu, X } from 'lucide-react'

// Ключ для сохранения позиции прокрутки (должен совпадать с orders/page.tsx)
const SCROLL_POSITION_KEY = 'orders_scroll_position'

const navigationItems = [
  { name: 'Заказы', href: '/orders', icon: '/images/navigate/orders.svg' },
  { name: 'Касса', href: '/cash', icon: '/images/navigate/cash.svg' },
  { name: 'Отчеты', href: '/reports', icon: '/images/navigate/reports.svg' },
  { name: 'Сдача мастеров', href: '/master-handover', icon: '/images/navigate/master-handover.svg' },
  { name: 'Сотрудники', href: '/employees', icon: '/images/navigate/employees.svg' },
]

// Мемоизированный элемент навигации - не зависит от pathname напрямую
const NavItem = memo(function NavItem({ 
  item, 
  isActive, 
  isMobile, 
  onClick 
}: { 
  item: typeof navigationItems[0]
  isActive: boolean
  isMobile: boolean
  onClick: () => void
}) {
  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-3 px-3 font-normal group ${
        isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
      }`}
      onClick={onClick}
    >
      {/* Индикатор активной вкладки - тонкая скобка */}
      <span 
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[6px] ${
          isActive ? 'opacity-100' : 'opacity-0'
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
      {item.icon && (
        <Image 
          src={item.icon} 
          alt={item.name} 
          width={isMobile ? 24 : 20} 
          height={isMobile ? 24 : 20} 
          className={`nav-icon ${isMobile ? 'w-6 h-6' : 'w-5 h-5'} ${
            isActive ? 'nav-icon-active' : ''
          }`}
        />
      )}
      <span className={`nav-text ${isActive ? 'nav-text-active' : ''}`}>
        {item.name}
      </span>
    </Link>
  )
})

// Функция для синхронного чтения темы из DOM
const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }
  return 'light'
}

// Мемоизированный компонент навигации
export const CustomNavigation = memo(function CustomNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Инициализируем тему из DOM синхронно, чтобы избежать мерцания
  const [initialTheme] = useState(getInitialTheme)
  
  // Используем индивидуальные селекторы для оптимизации
  const version = useDesignStore((state) => state.version)
  const toggleVersion = useDesignStore((state) => state.toggleVersion)
  const storeTheme = useDesignStore((state) => state.theme)
  const toggleTheme = useDesignStore((state) => state.toggleTheme)
  
  // Используем тему из store если она загружена, иначе из DOM
  const theme = storeTheme || initialTheme
  
  // Данные пользователя из auth store
  const user = useAuthStore((state) => state.user)
  const userName = user?.name || user?.login || 'Профиль'

  // Переход на главную страницу заказов (сброс всех фильтров и позиции)
  const handleLogoClick = useCallback(() => {
    setMobileMenuOpen(false)
    // Очищаем сохранённую позицию прокрутки
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SCROLL_POSITION_KEY)
    }
    // Переходим на страницу заказов без параметров (чистый URL)
    router.push('/orders')
  }, [router])

  // Закрываем меню при смене маршрута
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Блокируем скролл body при открытом меню
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Проверяем активность с учетом подстраниц - мемоизируем результаты
  const activeStates = useMemo(() => {
    return navigationItems.reduce((acc, item) => {
      if (pathname === item.href) {
        acc[item.href] = true
      } else if (item.href !== '/orders' && pathname.startsWith(item.href + '/')) {
        acc[item.href] = true
      } else {
        acc[item.href] = false
      }
      return acc
    }, {} as Record<string, boolean>)
  }, [pathname])

  const isProfileActive = pathname === '/profile'

  const isDark = theme === 'dark'

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  // Контент меню (переиспользуется для десктопа и мобильной версии)
  const MenuContent = useCallback(({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Navigation */}
      <nav className={`flex-1 px-5 ${isMobile ? 'space-y-4' : 'space-y-3'}`}>
        {navigationItems.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            isActive={activeStates[item.href]}
            isMobile={isMobile}
            onClick={closeMobileMenu}
          />
        ))}
      </nav>

      {/* Bottom Section */}
      <div className={`px-5 ${isMobile ? 'pb-24 space-y-4' : 'pb-6 space-y-3'}`}>
        {/* Version Toggle - только для V1 */}
        {version === 'v1' && (
          <div className={`flex items-center gap-3 px-3 ${isMobile ? 'py-3' : 'py-2'}`}>
            <span className={`${isMobile ? 'text-base' : 'text-sm'} ${version === 'v1' ? 'text-[#0d5c4b]' : 'nav-text'}`}>V1</span>
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
            <span className={`${isMobile ? 'text-base' : 'text-sm'} ${version === 'v2' ? 'text-[#0d5c4b]' : 'nav-text'}`}>V2</span>
          </div>
        )}

        {/* Theme Toggle - только для V2 */}
        {version === 'v2' && (
          <div className={`flex items-center gap-3 px-3 ${isMobile ? 'py-3' : 'py-2'}`}>
            <Sun className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${theme === 'light' ? 'text-[#0d5c4b]' : 'nav-text'}`} />
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                theme === 'dark' ? 'bg-[#0d5c4b]' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <Moon className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${theme === 'dark' ? 'text-[#0d5c4b]' : 'nav-text'}`} />
          </div>
        )}

        {/* Notifications */}
        <button
          className={`relative flex items-center gap-3 px-3 w-full group ${
            isMobile ? 'py-3 text-base' : 'py-2.5 text-sm'
          }`}
        >
          <div className="relative">
            <Bell className={`nav-text ${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </div>
          <span className="nav-text group-hover:text-[#0d5c4b]">
            Уведомления
          </span>
        </button>

        {/* Profile with user name */}
        <Link
          href="/profile"
          className={`relative flex items-center gap-3 px-3 font-normal group ${
            isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
          }`}
          onClick={closeMobileMenu}
        >
          <span 
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[6px] ${
              isProfileActive ? 'opacity-100' : 'opacity-0'
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
          <User className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${
            isProfileActive 
              ? 'text-[#0d5c4b]' 
              : 'nav-text group-hover:text-[#0d5c4b]'
          }`} />
          <span className={`${isProfileActive ? 'nav-text-active' : 'nav-text'} group-hover:text-[#0d5c4b]`}>
            {userName}
          </span>
        </Link>
      </div>
    </>
  ), [activeStates, isProfileActive, version, theme, isDark, toggleVersion, toggleTheme, userName, closeMobileMenu])

  return (
    <>
      {/* Mobile Header */}
      <header 
        className={`header-main md:hidden fixed top-0 left-0 w-screen z-[9999] h-16 flex items-center justify-between px-6 ${
          mobileMenuOpen ? '' : 'border-b'
        }`}
      >
        <button 
          onClick={handleLogoClick}
          className="bg-transparent border-none cursor-pointer p-0"
        >
          <Image 
            src={isDark ? "/images/logo_dark_v2.png" : "/images/logo_light_v2.png"} 
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
            className="p-2 nav-text hover:text-[#0d5c4b] relative"
            aria-label="Уведомления"
          >
            <Bell className="h-6 w-6" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 nav-text hover:text-[#0d5c4b]"
            aria-label="Открыть меню"
          >
            {mobileMenuOpen ? (
              <X className="h-7 w-7" />
            ) : (
              <Menu className="h-7 w-7" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Full-screen Menu */}
      <aside 
        className={`sidebar-main md:hidden fixed top-16 left-0 w-screen h-[calc(100vh-4rem)] z-[9998] flex flex-col transform transition-transform duration-500 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pt-6 flex flex-col h-full overflow-y-auto">
          <MenuContent isMobile={true} />
        </div>
      </aside>

      {/* Overlay backdrop с плавным появлением */}
      <div 
        className={`md:hidden fixed inset-0 top-16 z-[9997] transition-opacity duration-500 ease-out bg-black/20 dark:bg-black/40 ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Desktop Sidebar */}
      <aside 
        className="sidebar-main hidden md:flex w-56 h-screen flex-col fixed left-0 top-0 border-r"
      >
        {/* Logo */}
        <div className="p-6 pb-16">
          <button 
            onClick={handleLogoClick}
            className="bg-transparent border-none cursor-pointer p-0"
          >
            <Image 
              src={isDark ? "/images/logo_dark_v2.png" : "/images/logo_light_v2.png"} 
              alt="Новые Схемы" 
              width={160} 
              height={45} 
              className="h-10 w-auto cursor-pointer" 
              priority
            />
          </button>
        </div>

        <MenuContent isMobile={false} />
      </aside>
    </>
  )
})
