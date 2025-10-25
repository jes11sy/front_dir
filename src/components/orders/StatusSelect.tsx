/**
 * Компонент для выбора статуса заказа
 */

import React, { useState, useCallback, useEffect } from 'react'

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
          flex items-center gap-2 px-4 py-2 rounded-lg text-gray-800 text-sm font-medium
          bg-white border border-gray-300 hover:border-teal-500 hover:bg-gray-50
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500
          disabled:opacity-60 disabled:cursor-not-allowed
        `}
      >
        <span>{selectedOption ? selectedOption.label : 'Выберите статус'}</span>
        <span className="ml-1 text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 w-full min-w-[200px] mt-2 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto
                     border border-gray-200"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`
                flex items-center justify-between w-full px-4 py-2 text-left text-sm
                ${option.value === value
                  ? 'bg-teal-50 text-teal-700 font-semibold'
                  : 'text-gray-800 hover:bg-gray-50'
                }
                transition-colors duration-150
              `}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <span className="text-teal-500">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
