/**
 * Компонент для выбора статуса заказа с красивым дизайном
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

// Цвета для разных статусов
const getStatusColor = (status: string) => {
  const statusColors: { [key: string]: string } = {
    'Ожидает': 'from-yellow-400 to-orange-500',
    'В работе': 'from-blue-400 to-blue-600',
    'Выполнен': 'from-green-400 to-green-600',
    'Отменен': 'from-red-400 to-red-600',
    'Приостановлен': 'from-gray-400 to-gray-600',
    'Модерн': 'from-purple-400 to-purple-600'
  }
  return statusColors[status] || 'from-gray-400 to-gray-600'
}

// Иконки для статусов
const getStatusIcon = (status: string) => {
  const statusIcons: { [key: string]: string } = {
    'Ожидает': '⏳',
    'В работе': '🔧',
    'Выполнен': '✅',
    'Отменен': '❌',
    'Приостановлен': '⏸️',
    'Модерн': '🎨'
  }
  return statusIcons[status] || '📋'
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

  // Закрываем селект при клике вне его
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.status-select')) {
        setOpenSelect(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, setOpenSelect])

  return (
    <div className="relative status-select">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          relative px-4 py-2 rounded-full text-white font-medium text-sm
          transition-all duration-200 hover:scale-105 hover:shadow-lg
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          ${selectedOption ? `bg-gradient-to-r ${getStatusColor(selectedOption.label)}` : 'bg-gradient-to-r from-gray-400 to-gray-600'}
          ${isOpen ? 'ring-2 ring-teal-500 ring-opacity-50 shadow-lg' : 'shadow-md'}
        `}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {selectedOption ? getStatusIcon(selectedOption.label) : '📋'}
          </span>
          <span>
            {selectedOption ? selectedOption.label : 'Выберите статус'}
          </span>
          <span className="text-xs opacity-75">
            {isOpen ? '▲' : '▼'}
          </span>
        </div>
      </button>
      
      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-fade-in"
          style={{ minWidth: '200px' }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`
                w-full px-4 py-3 text-left transition-all duration-150 hover:bg-gray-50
                first:rounded-t-xl last:rounded-b-xl
                ${value === option.value ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {getStatusIcon(option.label)}
                </span>
                <span>{option.label}</span>
                {value === option.value && (
                  <span className="ml-auto text-teal-600">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
