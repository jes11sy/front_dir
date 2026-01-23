'use client'

import { useCallback, useMemo } from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  maxVisiblePages?: number
  className?: string
  disabled?: boolean
}

export function OptimizedPagination({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 7,
  className = '',
  disabled = false
}: PaginationProps) {
  
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
    <div className={`flex justify-center items-center gap-2 flex-wrap ${className}`}>
      {/* Previous button */}
      <button
        onClick={handlePrevClick}
        disabled={disabled || currentPage === 1}
        className="px-3 py-2 bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white disabled:hover:text-gray-400 rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
      >
        ←
      </button>

      {/* First page */}
      {visiblePages[0] > 1 && (
        <>
          <button
            onClick={() => handlePageClick(1)}
            disabled={disabled}
            className="px-3 py-2 bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white hover:shadow-md rounded-lg transition-all duration-200 text-sm font-medium"
          >
            1
          </button>
          {showStartEllipsis && (
            <div className="px-2 text-gray-400 font-medium">...</div>
          )}
        </>
      )}

      {/* Page numbers */}
      {visiblePages.map((page) => (
        <button
          key={page}
          onClick={() => handlePageClick(page)}
          disabled={disabled}
          className={`px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
            currentPage === page
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white hover:shadow-md'
          }`}
        >
          {page}
        </button>
      ))}

      {/* Last page */}
      {visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {showEndEllipsis && (
            <div className="px-2 text-gray-400 font-medium">...</div>
          )}
          <button
            onClick={() => handlePageClick(totalPages)}
            disabled={disabled}
            className="px-3 py-2 bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white hover:shadow-md rounded-lg transition-all duration-200 text-sm font-medium"
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Next button */}
      <button
        onClick={handleNextClick}
        disabled={disabled || currentPage === totalPages}
        className="px-3 py-2 bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white disabled:hover:text-gray-400 rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium"
      >
        →
      </button>
    </div>
  )
}
