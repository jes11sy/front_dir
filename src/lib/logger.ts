/**
 * Безопасный logger для frontend
 * Не логирует чувствительные данные в production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  includeTimestamp?: boolean;
  includeStack?: boolean;
}

class Logger {
  private isDevelopment: boolean;
  private sensitiveKeys = ['password', 'token', 'access_token', 'refresh_token', 'secret', 'apiKey', 'authorization'];

  constructor() {
    // Проверяем NODE_ENV (стандартная переменная Next.js) или NEXT_PUBLIC_ENV
    this.isDevelopment = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENV !== 'production';
  }

  /**
   * Удаляет чувствительные данные из объекта
   */
  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: any = {};
    for (const key in data) {
      const lowerKey = key.toLowerCase();
      if (this.sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof data[key] === 'object') {
        sanitized[key] = this.sanitizeData(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    }
    return sanitized;
  }

  /**
   * Форматирует сообщение для логирования
   */
  private formatMessage(level: LogLevel, message: string, data?: any, options?: LogOptions): string {
    const timestamp = options?.includeTimestamp !== false ? new Date().toISOString() : '';
    const prefix = timestamp ? `[${timestamp}] [${level.toUpperCase()}]` : `[${level.toUpperCase()}]`;
    
    let formatted = `${prefix} ${message}`;
    
    if (data) {
      const sanitizedData = this.sanitizeData(data);
      formatted += `\nData: ${JSON.stringify(sanitizedData, null, 2)}`;
    }
    
    return formatted;
  }

  /**
   * Debug logging (только в development)
   */
  debug(message: string, data?: any, options?: LogOptions) {
    if (!this.isDevelopment) return;
    
    const formatted = this.formatMessage('debug', message, data, options);
    console.debug(formatted);
  }

  /**
   * Info logging
   */
  info(message: string, data?: any, options?: LogOptions) {
    if (!this.isDevelopment) return;
    
    const formatted = this.formatMessage('info', message, data, options);
    console.info(formatted);
  }

  /**
   * Warning logging
   */
  warn(message: string, data?: any, options?: LogOptions) {
    const formatted = this.formatMessage('warn', message, data, options);
    console.warn(formatted);
  }

  /**
   * Error logging (всегда логируется, но без чувствительных данных)
   */
  error(message: string, error?: Error | any, options?: LogOptions) {
    let errorData: any = null;
    
    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        ...(this.isDevelopment && options?.includeStack && { stack: error.stack }),
      };
    } else if (error) {
      errorData = this.sanitizeData(error);
    }
    
    const formatted = this.formatMessage('error', message, errorData, options);
    console.error(formatted);
    
    // В production можно отправлять в сервис мониторинга (Sentry, LogRocket и т.д.)
    // this.sendToMonitoring(formatted);
  }

  /**
   * API error logging (специальный метод для ошибок API)
   */
  apiError(endpoint: string, status: number, error: any) {
    const safeError = this.sanitizeData(error);
    this.error(`API Error: ${endpoint}`, {
      status,
      endpoint,
      error: safeError,
    });
  }

  /**
   * Auth error logging (НЕ логирует credentials!)
   * В development показывает только важные ошибки
   */
  authError(message: string, reason?: string) {
    // Не логируем обычные ошибки авторизации (401) - это норма
    // Логируем только если это что-то серьезное
    if (this.isDevelopment && reason && !reason.includes('учетные данные')) {
      this.warn(`Auth: ${message}`, { reason });
    }
  }

  /**
   * Performance logging
   */
  performance(label: string, duration: number) {
    if (!this.isDevelopment) return;
    
    console.log(`⏱️ Performance: ${label} - ${duration.toFixed(2)}ms`);
  }
}

// Singleton instance
export const logger = new Logger();

// Helper для замера производительности
export function measurePerformance<T>(
  label: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - start;
      logger.performance(label, duration);
    }) as Promise<T>;
  } else {
    const duration = performance.now() - start;
    logger.performance(label, duration);
    return result;
  }
}

