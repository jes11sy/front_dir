/**
 * Компонент для выбора статуса заказа
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useDesignStore } from '@/store/design.store'

interface StatusSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
  selectId: string
  openSelect: string | null
  setOpenSelect: (id: string | null) => void
}

export const StatusSelect: React.FC<StatusSelectProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  selectId,
  openSelect,
  setOpenSelect
}) => {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  const isOpen = openSelect === selectId
  const selectedOption = options.find(option => option.value === value)

  const handleToggle = useCallback(() => {
    if (disabled) return
    setOpenSelect(isOpen ? null : selectId)
  }, [disabled, isOpen, selectId, setOpenSelect])

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue)
    setOpenSelect(null)
  }, [onChange, setOpenSelect])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest(`.status-select-${selectId}`)) {
        setOpenSelect(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, setOpenSelect, selectId])

  return (
    <div className={`relative status-select-${selectId} inline-block`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500
          disabled:opacity-60 disabled:cursor-not-allowed
          ${isDark 
            ? 'bg-[#3a4451] border-gray-600 text-gray-200 hover:border-teal-500 hover:bg-[#4a5461]' 
            : 'bg-white border-gray-300 text-gray-800 hover:border-teal-500 hover:bg-gray-50'
          }
        `}
      >
        <span>{selectedOption ? selectedOption.label : 'Выберите статус'}</span>
        <span className={`ml-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-full min-w-[200px] mt-2 rounded-lg shadow-lg max-h-60 overflow-y-auto border ${
            isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'
          }`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`
                flex items-center justify-between w-full px-4 py-2 text-left text-sm
                ${option.value === value
                  ? isDark 
                    ? 'bg-teal-900/40 text-teal-400 font-semibold'
                    : 'bg-teal-50 text-teal-700 font-semibold'
                  : isDark
                    ? 'text-gray-200 hover:bg-[#3a4451]'
                    : 'text-gray-800 hover:bg-gray-50'
                }
                transition-colors duration-150
              `}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <span className={isDark ? 'text-teal-400' : 'text-teal-500'}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
