'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary для отлова ошибок React компонентов
 * Использование: <ErrorBoundary><YourComponent /></ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    // Обновляем состояние, чтобы следующий рендер показал fallback UI
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Логируем ошибку
    logger.error('React Error Boundary caught an error', error, {
      includeStack: true,
    })
    
    // Можно отправить в систему мониторинга (Sentry, LogRocket и т.д.)
    console.error('Error details:', errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      // Можно отрендерить кастомный fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#114643' }}>
          <div className="max-w-md w-full space-y-8 px-4">
            <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border" style={{ backgroundColor: '#15282f', borderColor: '#2a6b68' }}>
              <div className="text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h1 className="text-2xl font-bold text-white mb-4">
                  Что-то пошло не так
                </h1>
                <p className="text-gray-300 mb-6">
                  Произошла непредвиденная ошибка. Пожалуйста, попробуйте обновить страницу.
                </p>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-6 text-left">
                    <summary className="cursor-pointer text-yellow-400 mb-2">
                      Детали ошибки (только в development)
                    </summary>
                    <pre className="bg-gray-800 text-red-400 p-4 rounded overflow-auto text-xs">
                      {this.state.error.message}
                      {'\n\n'}
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={this.handleReset}
                    className="px-6 py-2 text-white rounded-lg transition-colors"
                    style={{ backgroundColor: '#2a6b68' }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#1a5a57'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2a6b68'}
                  >
                    Попробовать снова
                  </button>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg transition-colors hover:bg-gray-700"
                  >
                    На главную
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Хук для создания Error Boundary (для удобства)
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

