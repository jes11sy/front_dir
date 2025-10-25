/**
 * Оптимизированный кастомный селект с React.memo
 */

'use client'

import React, { useEffect, useCallback, useRef, useState } from 'react'

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
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const isOpen = openSelect === selectId
  const selectedOption = options.find(option => option.value === value)

  const handleToggle = useCallback(() => {
    if (disabled) return
    
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4, // Небольшой отступ вниз
        left: rect.left,
        width: rect.width
      })
    }
    
    setOpenSelect(isOpen ? null : selectId)
  }, [disabled, isOpen, selectId, setOpenSelect])

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue)
    setOpenSelect(null)
  }, [onChange, setOpenSelect])

  // Закрываем селект при клике вне его и обновляем позицию при скролле
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.custom-select')) {
        setOpenSelect(null)
      }
    }

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + 4, // Небольшой отступ вниз
          left: rect.left,
          width: rect.width
        })
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, setOpenSelect])

  return (
    <div className="relative custom-select">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full text-left bg-white border-2 text-gray-800 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          compact ? 'px-2 py-1.5 text-sm rounded' : 'px-3 py-2 rounded-lg'
        }`}
        style={{ 
          borderColor: isOpen ? '#14b8a6' : '#d1d5db',
          boxShadow: isOpen ? '0 0 0 2px rgba(20, 184, 166, 0.2)' : 'none'
        }}
      >
        <span className={selectedOption ? 'text-gray-800' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      
      {isOpen && (
        <div 
          className="fixed z-[9999] bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{ 
            borderColor: '#14b8a6',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          {options.map((option) => (
            <SelectOption
              key={option.value}
              option={option}
              isSelected={option.value === value}
              compact={compact}
              onSelect={handleSelect}
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
}

const SelectOption = React.memo<SelectOptionProps>(({ option, isSelected, compact, onSelect }) => {
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
            ? 'bg-teal-50 text-teal-600' 
            : 'text-gray-800 hover:bg-teal-50 hover:text-teal-600'
      }`}
    >
      {option.label}
    </button>
  )
})

SelectOption.displayName = 'SelectOption'

export default CustomSelect

