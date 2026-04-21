import React from 'react'

interface NetworkErrorProps {
  onRetry: () => void
  isDark: boolean
  title?: string
  message?: string
  buttonText?: string
}

export function NetworkError({ 
  onRetry, 
  isDark,
  title = "Похоже, нет интернета",
  message = "Проверьте подключение к Wi-Fi или мобильному интернету",
  buttonText = "Обновить"
}: NetworkErrorProps) {
  const isForbiddenError =
    title.includes('403') ||
    message.includes('403') ||
    message.toLowerCase().includes('forbidden') ||
    message.toLowerCase().includes('недостаточно прав')

  const finalTitle = isForbiddenError ? 'Недостаточно прав' : title
  const finalMessage = isForbiddenError
    ? 'У вашей учетной записи нет доступа к этому действию.'
    : message
  const finalButtonText = isForbiddenError ? 'Вернуться назад' : buttonText

  return (
    <div className="mx-auto flex w-full max-w-[340px] flex-col items-center justify-center px-4 py-6 text-center animate-fade-in md:py-10">
      <div className={`mb-6 ${isDark ? 'text-gray-500' : 'text-[#8e8e93]'}`}>
        <svg className="w-[56px] h-[56px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="10" r="2"/>
          <path d="M12 12v9"/>
          <path d="M7 6a6 6 0 0 0 0 8"/>
          <path d="M17 6a6 6 0 0 1 0 8"/>
        </svg>
      </div>
      <h3 className={`text-[22px] font-bold tracking-tight mb-3 ${isDark ? 'text-gray-100' : 'text-[#111113]'}`}>
        {finalTitle}
      </h3>
      <p className={`mb-10 max-w-[280px] text-[15px] leading-snug ${isDark ? 'text-gray-400' : 'text-[#6e6e73]'}`}>
        {finalMessage}
      </p>
      <button 
        onClick={onRetry}
        className={`w-full max-w-[280px] py-3.5 rounded-full text-[17px] font-semibold transition-all duration-200 active:scale-[0.98] ${
          isDark 
            ? 'bg-white text-[#111113] hover:bg-gray-100' 
            : 'bg-[#0a4f42] text-white hover:bg-[#083f35]'
        }`}
      >
        {finalButtonText}
      </button>
    </div>
  )
}
