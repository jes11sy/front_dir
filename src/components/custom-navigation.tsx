'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react'
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

export function CustomNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { version, toggleVersion, theme, toggleTheme } = useDesignStore()
  const { user } = useAuthStore()

  // Переход на главную страницу заказов (сброс всех фильтров и позиции)
  const handleLogoClick = useCallback(() => {
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

  // Проверяем активность с учетом подстраниц
  const isActive = (href: string) => {
    if (pathname === href) return true
    // Для разделов с подстраницами (касса, отчеты, сотрудники)
    if (href !== '/orders' && pathname.startsWith(href + '/')) return true
    return false
  }

  // Контент меню (переиспользуется для десктопа и мобильной версии)
  const MenuContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Navigation */}
      <nav className={`flex-1 px-5 ${isMobile ? 'space-y-4' : 'space-y-3'}`}>
        {navigationItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 font-normal transition-colors group ${
                isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {/* Индикатор активной вкладки - тонкая скобка */}
              <span 
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-[6px] transition-all ${
                  active ? 'opacity-100' : 'opacity-0'
                } ${isMobile ? 'h-12' : 'h-10'}`}
              >
                <svg viewBox="0 0 6 40" fill="none" className="w-full h-full">
                  <path 
                    d="M5 1C2.5 1 1 4.5 1 10v20c0 5.5 1.5 9 4 9" 
                    stroke="#14b8a6" 
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
                  className={`transition-all ${isMobile ? 'w-6 h-6' : 'w-5 h-5'} ${
                    active 
                      ? 'brightness-0 saturate-100 [filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)]' 
                      : 'brightness-0 group-hover:[filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)]'
                  }`}
                />
              )}
              <span className="text-gray-800 group-hover:text-teal-600 transition-colors">
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className={`px-5 ${isMobile ? 'pb-24 space-y-4' : 'pb-6 space-y-3'}`}>
        {/* Version Toggle - только для V1 */}
        {version === 'v1' && (
          <div className={`flex items-center gap-3 px-3 ${isMobile ? 'py-3' : 'py-2'}`}>
            <span className={`transition-colors ${isMobile ? 'text-base' : 'text-sm'} ${version === 'v1' ? 'text-teal-500' : 'text-gray-400'}`}>V1</span>
            <button
              onClick={toggleVersion}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                version === 'v2' ? 'bg-teal-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                  version === 'v2' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`transition-colors ${isMobile ? 'text-base' : 'text-sm'} ${version === 'v2' ? 'text-teal-500' : 'text-gray-400'}`}>V2</span>
          </div>
        )}

        {/* Theme Toggle - только для V2 */}
        {version === 'v2' && (
          <div className={`flex items-center gap-3 px-3 ${isMobile ? 'py-3' : 'py-2'}`}>
            <Sun className={`transition-colors ${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${theme === 'light' ? 'text-teal-500' : 'text-gray-400'}`} />
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                theme === 'dark' ? 'bg-teal-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <Moon className={`transition-colors ${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${theme === 'dark' ? 'text-teal-500' : 'text-gray-400'}`} />
          </div>
        )}

        {/* Notifications */}
        <button
          className={`relative flex items-center gap-3 px-3 text-gray-800 hover:text-teal-600 transition-colors w-full group ${
            isMobile ? 'py-3 text-base' : 'py-2.5 text-sm'
          }`}
        >
          <div className="relative">
            <Bell className={isMobile ? 'h-6 w-6' : 'h-5 w-5'} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </div>
          <span className="group-hover:text-teal-600 transition-colors">
            Уведомления
          </span>
        </button>

        {/* Profile with user name */}
        <Link
          href="/profile"
          className={`relative flex items-center gap-3 px-3 font-normal transition-colors group ${
            isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
          }`}
          onClick={() => setMobileMenuOpen(false)}
        >
          <span 
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[6px] transition-all ${
              isActive('/profile') ? 'opacity-100' : 'opacity-0'
            } ${isMobile ? 'h-12' : 'h-10'}`}
          >
            <svg viewBox="0 0 6 40" fill="none" className="w-full h-full">
              <path 
                d="M5 1C2.5 1 1 4.5 1 10v20c0 5.5 1.5 9 4 9" 
                stroke="#14b8a6" 
                strokeWidth="1.5" 
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
          <User className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${isActive('/profile') ? 'text-teal-600' : 'text-gray-500'} group-hover:text-teal-600`} />
          <span className="text-gray-800 group-hover:text-teal-600 transition-colors">
            {user?.name || user?.login || 'Профиль'}
          </span>
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header */}
      <header 
        className={`md:hidden fixed top-0 left-0 w-screen z-[9999] h-16 bg-white flex items-center justify-between px-6 transition-all ${
          mobileMenuOpen ? '' : 'border-b border-gray-200'
        }`}
      >
        <button 
          onClick={handleLogoClick}
          className="bg-transparent border-none cursor-pointer p-0"
        >
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
            className="p-2 text-gray-600 hover:text-teal-600 transition-colors relative"
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
            className="p-2 text-gray-600 hover:text-teal-600 transition-colors"
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

      {/* Mobile Full-screen Menu with slide animation */}
      <aside 
        className={`md:hidden fixed top-16 left-0 w-screen h-[calc(100vh-4rem)] bg-white z-[9998] flex flex-col transition-transform duration-300 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pt-6 flex flex-col h-full overflow-y-auto">
          <MenuContent isMobile={true} />
        </div>
      </aside>

      {/* Overlay backdrop */}
      <div 
        className={`md:hidden fixed inset-0 top-16 bg-black/20 z-[9997] transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 bg-white h-screen flex-col border-r border-gray-200 fixed left-0 top-0">
        {/* Logo */}
        <div className="p-6 pb-16">
          <button 
            onClick={handleLogoClick}
            className="bg-transparent border-none cursor-pointer p-0"
          >
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

        <MenuContent isMobile={false} />
      </aside>
    </>
  )
}
