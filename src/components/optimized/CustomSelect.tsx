/**
 * Оптимизированный кастомный селект с React.memo
 */

'use client'

import React, { useEffect, useCallback } from 'react'
import { useDesignStore } from '@/store/design.store'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  compact?: boolean
  disabled?: boolean
  selectId: string
  openSelect: string | null
  setOpenSelect: (id: string | null) => void
  className?: string
}

const CustomSelect = React.memo<CustomSelectProps>(({
  value,
  onChange,
  options,
  placeholder,
  compact = false,
  disabled = false,
  selectId,
  openSelect,
  setOpenSelect,
  className = ''
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

  // Закрываем селект при клике вне его
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.custom-select')) {
        setOpenSelect(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, setOpenSelect])

  return (
    <div className={`relative custom-select ${className}`} style={{ zIndex: isOpen ? 9999 : 1 }}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full text-left focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          compact ? 'px-2 py-1.5 text-sm rounded' : 'px-4 py-2 rounded-2xl'
        } ${
          className ? '' : isDark 
            ? 'bg-white/[0.04] text-gray-200 border-2 border-transparent' 
            : 'bg-white text-gray-800 border-2 border-gray-200'
        }`}
        style={{ 
          borderColor: isOpen ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(10,79,66,0.55)') : undefined,
          boxShadow: isOpen
            ? (isDark ? '0 0 0 2px rgba(255,255,255,0.05)' : '0 0 0 3px rgba(10,79,66,0.16)')
            : 'none'
        }}
      >
        <span className={selectedOption ? (isDark ? 'text-gray-200' : 'text-gray-800') : (isDark ? 'text-gray-500' : 'text-gray-500')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`absolute right-4 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      
      {isOpen && (
        <div 
          className={`absolute z-[9999] w-full mt-2 rounded-2xl shadow-xl max-h-48 overflow-y-auto ${
            isDark
              ? 'bg-[#1e1e20] border border-white/10'
              : 'bg-white border border-[#cfd2d8] shadow-[0_20px_40px_rgba(15,23,42,0.14)]'
          } ${isDark ? 'custom-select-scroll-dark' : 'custom-select-scroll-light'}`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? 'rgba(10,79,66,0.75) rgba(255,255,255,0.08)' : 'rgba(10,79,66,0.75) rgba(15,23,42,0.08)',
          }}
        >
          {options.map((option) => (
            <SelectOption
              key={option.value}
              option={option}
              isSelected={option.value === value}
              compact={compact}
              onSelect={handleSelect}
              isDark={isDark}
            />
          ))}
        </div>
      )}

      <style jsx global>{`
        .custom-select-scroll-light::-webkit-scrollbar {
          width: 8px;
        }
        .custom-select-scroll-light::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.08);
          border-radius: 999px;
        }
        .custom-select-scroll-light::-webkit-scrollbar-thumb {
          background: rgba(10, 79, 66, 0.75);
          border-radius: 999px;
        }
        .custom-select-scroll-light::-webkit-scrollbar-thumb:hover {
          background: rgba(10, 79, 66, 0.9);
        }

        .custom-select-scroll-dark::-webkit-scrollbar {
          width: 8px;
        }
        .custom-select-scroll-dark::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
        }
        .custom-select-scroll-dark::-webkit-scrollbar-thumb {
          background: rgba(10, 79, 66, 0.75);
          border-radius: 999px;
        }
        .custom-select-scroll-dark::-webkit-scrollbar-thumb:hover {
          background: rgba(10, 79, 66, 0.9);
        }
      `}</style>
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value &&
         prevProps.openSelect === nextProps.openSelect &&
         prevProps.options.length === nextProps.options.length
})

CustomSelect.displayName = 'CustomSelect'

// Оптимизированный компонент опции
interface SelectOptionProps {
  option: Option
  isSelected: boolean
  compact: boolean
  onSelect: (value: string) => void
  isDark: boolean
}

const SelectOption = React.memo<SelectOptionProps>(({ option, isSelected, compact, onSelect, isDark }) => {
  const [hover, setHover] = React.useState(false)

  const handleClick = useCallback(() => {
    onSelect(option.value)
  }, [option.value, onSelect])

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`w-full text-left px-4 py-2.5 my-0.5 mx-1 transition-colors rounded-xl ${
        compact ? 'text-sm' : ''
      } ${
        isSelected 
          ? isDark ? 'bg-white/10 text-white' : 'bg-[#e8f2ef] text-[#0a4f42]'
          : hover 
            ? isDark 
              ? 'bg-white/5 text-white' 
              : 'bg-[#f3f4f6] text-[#111113]'
            : isDark
              ? 'text-gray-300'
              : 'text-gray-800'
      }`}
      style={{ width: 'calc(100% - 8px)' }}
    >
      {option.label}
    </button>
  )
})

SelectOption.displayName = 'SelectOption'

export default CustomSelect

