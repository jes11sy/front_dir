'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'

const tabs = [
  { name: 'По городу', href: '/reports/city' },
  { name: 'По мастерам', href: '/reports/masters' },
  { name: 'Зарплата', href: '/reports/salary' },
]

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  const trackRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const indicatorFirstLayout = useRef(true)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    opacity: 0,
    transition: 'none' as string,
  })

  const updateSlidingIndicator = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const idx = tabs.findIndex((tab) => pathname === tab.href || pathname.startsWith(tab.href + '/'))
    if (idx < 0) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0, transition: 'opacity 180ms ease-out' }))
      return
    }

    const tab = tabRefs.current[idx]
    if (!tab) return

    const tr = track.getBoundingClientRect()
    const r = tab.getBoundingClientRect()
    const spring =
      'left 340ms cubic-bezier(0.34, 1.28, 0.64, 1), top 340ms cubic-bezier(0.34, 1.28, 0.64, 1), width 340ms cubic-bezier(0.34, 1.28, 0.64, 1), height 340ms cubic-bezier(0.34, 1.28, 0.64, 1), opacity 200ms ease-out'

    setIndicatorStyle({
      left: r.left - tr.left,
      top: r.top - tr.top,
      width: r.width,
      height: r.height,
      opacity: 1,
      transition: indicatorFirstLayout.current ? 'none' : spring,
    })
    indicatorFirstLayout.current = false
  }, [pathname])

  useLayoutEffect(() => {
    updateSlidingIndicator()
  }, [updateSlidingIndicator])

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return
    const ro = new ResizeObserver(() => updateSlidingIndicator())
    ro.observe(track)
    window.addEventListener('orientationchange', updateSlidingIndicator)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', updateSlidingIndicator)
    }
  }, [updateSlidingIndicator])

  const activeTabIndex = tabs.findIndex((tab) => pathname === tab.href || pathname.startsWith(tab.href + '/'))

  const navigateBySwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (activeTabIndex < 0) return
      const nextIndex = direction === 'left' ? activeTabIndex + 1 : activeTabIndex - 1
      if (nextIndex < 0 || nextIndex >= tabs.length) return
      router.push(tabs[nextIndex]!.href)
    },
    [activeTabIndex, router]
  )

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    if (!t) return
    touchStartX.current = t.clientX
    touchStartY.current = t.clientY
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const startX = touchStartX.current
      const startY = touchStartY.current
      const t = e.changedTouches[0]

      touchStartX.current = null
      touchStartY.current = null

      if (startX == null || startY == null || !t) return

      const dx = t.clientX - startX
      const dy = t.clientY - startY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      if (absDx < 50 || absDx < absDy * 1.2) return

      if (dx < 0) navigateBySwipe('left')
      else navigateBySwipe('right')
    },
    [navigateBySwipe]
  )
  
  // Не показываем табы на главной странице /reports (там свои)
  if (pathname === '/reports') {
    return <>{children}</>
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`min-h-[calc(100dvh-4rem-env(safe-area-inset-top,0px))] md:min-h-0 transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}
    >
      <div className="px-4 pb-6 pt-0 md:pt-6">
        <div
          className={`sticky z-30 -mx-4 mb-4 px-4 py-2 backdrop-blur-xl animate-slide-in-left top-[calc(4rem+env(safe-area-inset-top,0px))] md:static md:top-auto md:z-auto md:mx-0 md:px-0 md:py-0 ${
            isDark
              ? 'bg-[#111113]/92 supports-[backdrop-filter]:bg-[#111113]/88'
              : 'bg-[#f5f5f7]/92 supports-[backdrop-filter]:bg-[#f5f5f7]/88'
          }`}
        >
          <div className="flex justify-center md:hidden">
            <div
              ref={trackRef}
              className={`relative inline-flex w-full max-w-full items-center gap-0.5 rounded-[22px] border p-1 ${
                isDark ? 'border-white/10 bg-[#111113]/90' : 'border-black/[0.08] bg-white'
              }`}
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute will-change-[left,top,width,height] rounded-[18px] ${
                  isDark
                    ? 'bg-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                    : 'bg-[#0a4f42] shadow-[0_8px_20px_rgba(10,79,66,0.22)]'
                }`}
                style={{
                  left: indicatorStyle.left,
                  top: indicatorStyle.top,
                  width: indicatorStyle.width,
                  height: indicatorStyle.height,
                  opacity: indicatorStyle.opacity,
                  transition: indicatorStyle.transition,
                }}
              />
              {tabs.map((tab, i) => {
                const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
                return (
                  <button
                    key={tab.href}
                    ref={(el) => {
                      tabRefs.current[i] = el
                    }}
                    onClick={() => router.push(tab.href)}
                    className={`relative z-[1] min-h-[36px] flex-1 rounded-[18px] px-2.5 py-1 text-[13px] font-semibold leading-tight touch-manipulation transition-[transform,color,background-color] duration-200 motion-safe:active:scale-[0.96] ${
                      isActive
                        ? 'text-white'
                        : isDark
                          ? 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                          : 'text-[#3a3a3c] hover:bg-black/[0.04] hover:text-[#111113]'
                    }`}
                  >
                    {tab.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="hidden md:flex md:items-center md:gap-2">
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 w-max">
                {tabs.map((tab) => {
                  const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
                  return (
                    <button
                      key={tab.href}
                      onClick={() => router.push(tab.href)}
                      className={`min-h-[40px] px-4 text-sm font-medium rounded-2xl transition-all duration-200 whitespace-nowrap ${
                        isActive
                          ? (isDark ? 'bg-white/[0.08] text-white' : 'bg-[#0a4f42] text-white')
                          : (isDark
                            ? 'text-white/92 hover:bg-white/[0.04] hover:text-white bg-transparent'
                            : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113] bg-transparent')
                      }`}
                    >
                      {tab.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Контент */}
        <div>{children}</div>
      </div>
    </div>
  )
}
