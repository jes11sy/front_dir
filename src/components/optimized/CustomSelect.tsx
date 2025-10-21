/**
 * Оптимизированный кастомный селект с React.memo
 */

'use client'

import React, { useEffect, useCallback } from 'react'

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
    <div className="relative custom-select">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full text-left bg-gray-700 border border-gray-600 text-white focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          compact ? 'px-2 py-1.5 text-sm rounded' : 'px-3 py-2 rounded-lg'
        }`}
        style={{ borderColor: isOpen ? '#2a6b68' : '#4b5563' }}
      >
        <span className={selectedOption ? 'text-white' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      
      {isOpen && (
        <div 
          className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{ borderColor: '#2a6b68' }}
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

  const bgColor = hover ? (isSelected ? '#1a5a57' : '#4b5563') : (isSelected ? '#2a6b68' : 'transparent')

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`w-full text-left px-3 py-2 text-white transition-colors ${
        compact ? 'text-sm' : ''
      }`}
      style={{ backgroundColor: bgColor }}
    >
      {option.label}
    </button>
  )
})

SelectOption.displayName = 'SelectOption'

export default CustomSelect

