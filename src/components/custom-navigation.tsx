'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { useDesignStore } from '@/store/design.store'
import { useAuthStore } from '@/store/auth.store'
import { Sun, Moon, Bell, User, Menu, X } from 'lucide-react'

// Ключ для сохранения позиции прокрутки (должен совпадать с orders/page.tsx)
const SCROLL_POSITION_KEY = 'orders_scroll_position'

const navigationItems = [
  { name: 'Заказы', href: '/orders', icon: '/images/navigate/orders.svg' },
  { 
    name: 'Касса', 
    icon: '/images/navigate/cash.svg',
    dropdown: [
      { name: 'Приход', href: '/cash/income' },
      { name: 'Расход', href: '/cash/expense' },
      { name: 'История', href: '/cash/history' }
    ]
  },
  { 
    name: 'Отчеты', 
    icon: '/images/navigate/reports.svg',
    dropdown: [
      { name: 'Отчет по городу', href: '/reports/city' },
      { name: 'Отчет по мастерам', href: '/reports/masters' }
    ]
  },
  { name: 'Сдача мастеров', href: '/master-handover', icon: '/images/navigate/master-handover.svg' },
  { 
    name: 'Сотрудники', 
    icon: '/images/navigate/employees.svg',
    dropdown: [
      { name: 'Мастера', href: '/employees' },
      { name: 'График работы', href: '/employees/schedule' }
    ]
  },
]

export function CustomNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null)
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

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Мобильная навигация сверху */}
      <nav 
        className="md:hidden fixed top-0 left-0 right-0 shadow-lg backdrop-blur-lg border-b"
        style={{
          backgroundColor: 'white',
          borderColor: '#14b8a6',
          borderBottomWidth: '2px',
          zIndex: 9999,
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={handleLogoClick}
            className="bg-transparent border-none cursor-pointer p-0"
          >
            <Image
              src="/images/logo_light_v2.png"
              alt="Новые Схемы"
              width={140}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </button>
          
          <div className="flex items-center gap-2">
            {/* Мобильный колокольчик уведомлений */}
            <button
              className="p-2 text-gray-600 hover:text-teal-600 transition-colors relative"
            >
              <Bell className="h-6 w-6" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </button>
            
            <button
              className="p-2 rounded-lg transition-all duration-200 text-gray-700 hover:text-teal-600 hover:bg-teal-50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-7 w-7" />
              ) : (
                <Menu className="h-7 w-7" />
              )}
            </button>
          </div>
        </div>

        {/* Мобильное меню */}
        {mobileMenuOpen && (
          <div 
            className="border-t bg-white max-h-[calc(100vh-64px)] overflow-y-auto"
            style={{
              borderColor: '#14b8a6',
              borderTopWidth: '2px'
            }}
          >
            <div className="px-4 py-4 space-y-1">
              {navigationItems.map((item) => (
                <div key={item.name}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg"
                      style={{
                        color: pathname === item.href ? 'white' : '#374151',
                        backgroundColor: pathname === item.href ? '#14b8a6' : 'transparent',
                        textDecoration: 'none',
                        boxShadow: pathname === item.href ? '0 2px 4px rgba(20, 184, 166, 0.3)' : 'none'
                      }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="flex-1 text-left">{item.name}</span>
                    </Link>
                  ) : (
                    <div>
                      <button
                        className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg"
                        style={{
                          color: expandedDropdown === item.name ? 'white' : '#374151',
                          backgroundColor: expandedDropdown === item.name ? '#14b8a6' : 'transparent',
                          boxShadow: expandedDropdown === item.name ? '0 2px 4px rgba(20, 184, 166, 0.3)' : 'none'
                        }}
                        onClick={() => setExpandedDropdown(expandedDropdown === item.name ? null : item.name)}
                      >
                        <span className="flex-1 text-left">{item.name}</span>
                        {item.dropdown && (
                          <svg 
                            className={`h-4 w-4 transition-transform duration-300 ${
                              expandedDropdown === item.name ? 'rotate-180' : ''
                            }`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                      
                      {/* Выпадающий список для мобильных */}
                      {item.dropdown && expandedDropdown === item.name && (
                        <div className="space-y-1 mt-2 pl-4">
                          {item.dropdown.map((dropdownItem) => (
                            <Link
                              key={dropdownItem.name}
                              href={dropdownItem.href}
                              className="flex items-center w-full px-4 py-2 text-sm transition-all duration-150 rounded-lg"
                              style={{
                                color: pathname === dropdownItem.href ? 'white' : '#6b7280',
                                backgroundColor: pathname === dropdownItem.href ? '#14b8a6' : 'transparent',
                                textDecoration: 'none'
                              }}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <span className="flex-1 text-left">{dropdownItem.name}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Переключатель версий для мобильной версии - только для v1 */}
              {version === 'v1' && (
                <div className="pt-4 mt-4">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium text-gray-700">Версия дизайна</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium transition-colors ${version === 'v1' ? 'text-teal-500' : 'text-gray-400'}`}>
                        V1
                      </span>
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
                      <span className={`text-sm font-medium transition-colors ${version === 'v2' ? 'text-teal-500' : 'text-gray-400'}`}>
                        V2
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Переключатель темы для мобильной версии v2 */}
              {version === 'v2' && (
                <div className="pt-4 mt-4">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Sun className={`h-5 w-5 transition-colors ${theme === 'light' ? 'text-teal-500' : 'text-gray-400'}`} />
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
                    <Moon className={`h-5 w-5 transition-colors ${theme === 'dark' ? 'text-teal-500' : 'text-gray-400'}`} />
                  </div>
                </div>
              )}

              {/* Профиль для мобильной версии - просто ссылка */}
              <div className="pt-4 mt-4">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:text-teal-600 transition-colors rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5 text-gray-500" />
                  <span>{user?.name || user?.login || 'Профиль'}</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Десктопная боковая навигация */}
      <nav 
        className="hidden md:block fixed top-0 left-0 h-full w-64 z-50 shadow-lg backdrop-blur-lg border-r"
        style={{
          backgroundColor: 'white',
          borderColor: '#14b8a6',
          borderRightWidth: '2px'
        }}
      >
        <div className="flex flex-col h-full">
        {/* Логотип */}
        <div className={`p-6 ${version === 'v2' ? 'flex justify-center pb-10' : ''}`}>
          <button 
            onClick={handleLogoClick}
            className="bg-transparent border-none cursor-pointer p-0"
          >
            <Image
              src="/images/logo_light_v2.png"
              alt="Новые Схемы"
              width={version === 'v2' ? 200 : 180}
              height={version === 'v2' ? 56 : 50}
              className={version === 'v2' ? 'h-12 w-auto object-contain' : 'h-10 w-auto object-contain'}
              priority
            />
          </button>
        </div>

        {/* Навигационные элементы */}
        <div className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const active = item.href ? isActive(item.href) : false
              const isExpanded = expandedDropdown === item.name
              
              return (
                <div
                  key={item.name}
                  className="relative"
                >
                  {item.href ? (
                    version === 'v2' ? (
                      // V2: иконка + текст, при выборе иконка зелёная, текст чёрный, при наведении всё зелёное
                      <Link
                        href={item.href}
                        className="group flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg"
                        style={{ textDecoration: 'none' }}
                      >
                        {item.icon && (
                          <Image
                            src={item.icon}
                            alt=""
                            width={20}
                            height={20}
                            className={`mr-3 transition-all duration-200 ${
                              active 
                                ? 'brightness-0 saturate-100 [filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)] group-hover:[filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)]' 
                                : 'brightness-0 group-hover:[filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)]'
                            }`}
                          />
                        )}
                        <span 
                          className={`flex-1 text-left transition-colors duration-200 ${
                            active 
                              ? 'text-gray-700 group-hover:text-teal-600' 
                              : 'text-gray-700 group-hover:text-teal-600'
                          }`}
                        >
                          {item.name}
                        </span>
                      </Link>
                    ) : (
                      // V1: старый стиль с зелёным фоном
                      <Link
                        href={item.href}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg hover:bg-teal-50 hover:text-teal-600"
                        style={{
                          color: active ? 'white' : '#374151',
                          backgroundColor: active ? '#14b8a6' : 'transparent',
                          textDecoration: 'none',
                          boxShadow: active ? '0 2px 4px rgba(20, 184, 166, 0.3)' : 'none'
                        }}
                      >
                        <span className="flex-1 text-left">{item.name}</span>
                      </Link>
                    )
                  ) : (
                    <>
                      {version === 'v2' ? (
                        // V2: кнопка с иконкой
                        <button
                          className="group flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg"
                          onClick={() => {
                            setExpandedDropdown(isExpanded ? null : item.name)
                          }}
                        >
                          {item.icon && (
                            <Image
                              src={item.icon}
                              alt=""
                              width={20}
                              height={20}
                              className={`mr-3 transition-all duration-200 ${
                                isExpanded 
                                  ? 'brightness-0 saturate-100 [filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)] group-hover:[filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)]' 
                                  : 'brightness-0 group-hover:[filter:invert(52%)_sepia(85%)_saturate(437%)_hue-rotate(127deg)_brightness(95%)_contrast(89%)]'
                              }`}
                            />
                          )}
                          <span 
                            className={`flex-1 text-left transition-colors duration-200 ${
                              isExpanded 
                                ? 'text-gray-700 group-hover:text-teal-600' 
                                : 'text-gray-700 group-hover:text-teal-600'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.dropdown && (
                            <svg 
                              className={`ml-2 h-4 w-4 transition-all duration-200 ${isExpanded ? 'rotate-180' : ''} ${
                                isExpanded 
                                  ? 'text-teal-600 group-hover:text-teal-600' 
                                  : 'text-gray-700 group-hover:text-teal-600'
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      ) : (
                        // V1: старый стиль
                        <button
                          className="flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg hover:bg-teal-50 hover:text-teal-600"
                          style={{
                            color: isExpanded ? 'white' : '#374151',
                            backgroundColor: isExpanded ? '#14b8a6' : 'transparent'
                          }}
                          onClick={() => {
                            setExpandedDropdown(isExpanded ? null : item.name)
                          }}
                        >
                          <span className="flex-1 text-left">{item.name}</span>
                          {item.dropdown && (
                            <svg 
                              className={`ml-2 h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      )}
                      
                      {/* Выпадающий список для десктопа (снизу) */}
                      {item.dropdown && isExpanded && (
                        <div className="space-y-1 mt-2">
                          {item.dropdown.map((dropdownItem) => {
                            const isDropdownActive = pathname === dropdownItem.href
                            return version === 'v2' ? (
                              <Link
                                key={dropdownItem.name}
                                href={dropdownItem.href}
                                className="group flex items-center w-full px-4 py-2 pl-11 text-sm transition-all duration-150 rounded-lg"
                                style={{ textDecoration: 'none' }}
                              >
                                <span 
                                  className={`flex-1 text-left transition-colors duration-200 ${
                                    isDropdownActive 
                                      ? 'text-teal-600 group-hover:text-teal-600' 
                                      : 'text-gray-500 group-hover:text-teal-600'
                                  }`}
                                >
                                  {dropdownItem.name}
                                </span>
                              </Link>
                            ) : (
                              <Link
                                key={dropdownItem.name}
                                href={dropdownItem.href}
                                className="flex items-center w-full px-4 py-2 text-sm transition-all duration-150 rounded-lg hover:bg-teal-50 hover:text-teal-600"
                                style={{
                                  color: isDropdownActive ? 'white' : '#6b7280',
                                  backgroundColor: isDropdownActive ? '#14b8a6' : 'transparent',
                                  textDecoration: 'none'
                                }}
                              >
                                <span className="flex-1 text-left">{dropdownItem.name}</span>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Нижняя секция */}
        <div className="px-5 pb-6 space-y-3">
          {/* Переключатель версий для десктопа - только для v1 */}
          {version === 'v1' && (
            <div className="flex items-center gap-3 px-3 py-2">
              <span className={`text-sm transition-colors ${version === 'v1' ? 'text-teal-500' : 'text-gray-400'}`}>V1</span>
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
              <span className={`text-sm transition-colors ${version === 'v2' ? 'text-teal-500' : 'text-gray-400'}`}>V2</span>
            </div>
          )}

          {/* Переключатель темы для v2 */}
          {version === 'v2' && (
            <div className="flex items-center gap-3 px-3 py-2">
              <Sun className={`h-5 w-5 transition-colors ${theme === 'light' ? 'text-teal-500' : 'text-gray-400'}`} />
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
              <Moon className={`h-5 w-5 transition-colors ${theme === 'dark' ? 'text-teal-500' : 'text-gray-400'}`} />
            </div>
          )}

          {/* Уведомления */}
          <button
            className="relative flex items-center gap-3 px-3 py-2.5 text-sm font-normal text-gray-800 hover:text-teal-600 transition-colors w-full group"
          >
            <div className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </div>
            <span className="group-hover:text-teal-600 transition-colors">
              Уведомления
            </span>
          </button>

          {/* Профиль - просто ссылка как в callcentre */}
          <Link
            href="/profile"
            className={`relative flex items-center gap-3 px-3 py-2.5 text-sm font-normal transition-colors group ${
              isActive('/profile') ? 'text-teal-600' : 'text-gray-800'
            }`}
          >
            <User className={`h-5 w-5 ${isActive('/profile') ? 'text-teal-600' : 'text-gray-500'} group-hover:text-teal-600`} />
            <span className="group-hover:text-teal-600 transition-colors">
              {user?.name || user?.login || 'Профиль'}
            </span>
          </Link>
        </div>
      </div>
    </nav>
    </>
  )
}
