'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  disabled?: boolean
}

export function OptimizedPagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  disabled = false
}: PaginationProps) {
  
  // Определяем мобильный или десктоп
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // 3 страницы на мобильных, 5 на десктопе
  const maxVisiblePages = isMobile ? 3 : 5
  
  const visiblePages = useMemo(() => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const half = Math.floor(maxVisiblePages / 2)
    let start = Math.max(1, currentPage - half)
    const end = Math.min(totalPages, start + maxVisiblePages - 1)

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [currentPage, totalPages, maxVisiblePages])

  const showStartEllipsis = visiblePages[0] > 2
  const showEndEllipsis = visiblePages[visiblePages.length - 1] < totalPages - 1

  const handlePageClick = useCallback((page: number) => {
    if (page !== currentPage && !disabled) {
      onPageChange(page)
    }
  }, [currentPage, onPageChange, disabled])

  const handlePrevClick = useCallback(() => {
    if (currentPage > 1 && !disabled) {
      onPageChange(currentPage - 1)
    }
  }, [currentPage, onPageChange, disabled])

  const handleNextClick = useCallback(() => {
    if (currentPage < totalPages && !disabled) {
      onPageChange(currentPage + 1)
    }
  }, [currentPage, totalPages, onPageChange, disabled])

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {/* Previous button */}
      <button
        onClick={handlePrevClick}
        disabled={disabled || currentPage === 1}
        className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-[#0d5c4b] disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
        aria-label="Предыдущая страница"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* First page */}
      {visiblePages[0] > 1 && (
        <>
          <button
            onClick={() => handlePageClick(1)}
            disabled={disabled}
            className="min-w-[32px] h-8 px-2 rounded-md text-sm font-medium text-gray-600 hover:text-white hover:bg-[#0d5c4b] transition-colors"
          >
            1
          </button>
          {showStartEllipsis && (
            <span className="px-1 text-gray-400 text-sm">...</span>
          )}
        </>
      )}

      {/* Page numbers */}
      {visiblePages.map((page) => (
        <button
          key={page}
          onClick={() => handlePageClick(page)}
          disabled={disabled}
          className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors ${
            currentPage === page
              ? 'bg-[#0d5c4b] text-white'
              : 'text-gray-600 hover:text-white hover:bg-[#0d5c4b]'
          }`}
        >
          {page}
        </button>
      ))}

      {/* Last page */}
      {visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {showEndEllipsis && (
            <span className="px-1 text-gray-400 text-sm">...</span>
          )}
          <button
            onClick={() => handlePageClick(totalPages)}
            disabled={disabled}
            className="min-w-[32px] h-8 px-2 rounded-md text-sm font-medium text-gray-600 hover:text-white hover:bg-[#0d5c4b] transition-colors"
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Next button */}
      <button
        onClick={handleNextClick}
        disabled={disabled || currentPage === totalPages}
        className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-[#0d5c4b] disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
        aria-label="Следующая страница"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}
