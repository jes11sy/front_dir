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
    <div className="relative custom-select" style={{ zIndex: isOpen ? 9999 : 1 }}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full text-left border-2 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          compact ? 'px-2 py-1.5 text-sm rounded' : 'px-3 py-2 rounded-lg'
        } ${
          isDark 
            ? 'bg-[#3a4451] text-gray-200' 
            : 'bg-white text-gray-800'
        }`}
        style={{ 
          borderColor: isOpen ? '#14b8a6' : isDark ? '#4b5563' : '#d1d5db',
          boxShadow: isOpen ? '0 0 0 2px rgba(20, 184, 166, 0.2)' : 'none'
        }}
      >
        <span className={selectedOption ? (isDark ? 'text-gray-200' : 'text-gray-800') : (isDark ? 'text-gray-500' : 'text-gray-500')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      
      {isOpen && (
        <div 
          className={`absolute z-[9999] w-full mt-1 border-2 rounded-lg shadow-lg max-h-48 overflow-y-auto ${
            isDark ? 'bg-[#2a3441]' : 'bg-white'
          }`}
          style={{ borderColor: '#14b8a6' }}
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
      className={`w-full text-left px-3 py-2 transition-colors ${
        compact ? 'text-sm' : ''
      } ${
        isSelected 
          ? 'bg-teal-600 text-white' 
          : hover 
            ? isDark 
              ? 'bg-[#3a4451] text-teal-400' 
              : 'bg-teal-50 text-teal-600'
            : isDark
              ? 'text-gray-200 hover:bg-[#3a4451] hover:text-teal-400'
              : 'text-gray-800 hover:bg-teal-50 hover:text-teal-600'
      }`}
    >
      {option.label}
    </button>
  )
})

SelectOption.displayName = 'SelectOption'

export default CustomSelect

