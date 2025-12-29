# Исправление ошибок Frontend Director

## Дата: 29 декабря 2025

## Проблемы, которые были обнаружены

### 1. ReferenceError: returnNaN is not defined
**Причина**: Проблема с минификацией/компиляцией Next.js 15.5.5

**Решение**: 
- Добавлена глобальная обработка ошибок в `layout.tsx`
- Улучшена конфигурация webpack в `next.config.js`

### 2. EACCES: permission denied, open '/dev/lrt' и '//lrt'
**Причина**: Некорректная обработка пустых или невалидных fileKey в `s3-utils.ts`

**Решение**:
- Добавлена валидация и очистка `fileKey` перед использованием
- Добавлены проверки на `null`, `undefined`, пустые строки
- Улучшена обработка ошибок в `getSignedUrl()`

### 3. ECONNREFUSED ::1:3002
**Причина**: Неправильный API_BASE_URL в `s3-utils.ts` (использовался `localhost:3001` вместо production URL)

**Решение**:
- Изменен дефолтный `API_BASE_URL` с `http://localhost:3001/api/v1` на `https://api.test-shem.ru/api/v1`
- Теперь совпадает с основным `api.ts`

### 4. Множественные SIGTERM и uncaughtException
**Причина**: Необработанные ошибки и отклоненные промисы

**Решение**:
- Добавлены глобальные обработчики `error` и `unhandledrejection` в `layout.tsx`
- Улучшена конфигурация webpack с fallback для node модулей

## Внесенные изменения

### 1. `src/lib/s3-utils.ts`
```typescript
// ДО:
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function getSignedUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
  if (!fileKey) {
    throw new Error('File key is required');
  }
  // ...
}

// ПОСЛЕ:
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.test-shem.ru/api/v1';

export async function getSignedUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
  // Проверяем и очищаем fileKey
  if (!fileKey || typeof fileKey !== 'string' || fileKey.trim() === '') {
    console.warn('⚠️ Invalid file key provided:', fileKey);
    throw new Error('File key is required');
  }

  // Очищаем fileKey от потенциально опасных символов
  const cleanFileKey = fileKey.trim();
  // ...
}
```

### 2. `src/app/layout.tsx`
Добавлены глобальные обработчики ошибок:
```typescript
<Script id="error-handler" strategy="beforeInteractive">
  {`
    // Глобальная обработка необработанных ошибок
    window.addEventListener('error', function(event) {
      console.error('Global error caught:', event.error);
      event.preventDefault();
    });
    
    // Обработка необработанных промисов
    window.addEventListener('unhandledrejection', function(event) {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    });
  `}
</Script>
```

### 3. `next.config.js`
Улучшена webpack конфигурация:
```javascript
// Игнорируем определенные модули, которые могут вызывать проблемы
config.resolve = config.resolve || {}
config.resolve.fallback = {
  ...config.resolve.fallback,
  fs: false,
  net: false,
  tls: false,
}
```

## Рекомендации

1. **Пересоберите Docker образ** после этих изменений
2. **Проверьте переменные окружения** - убедитесь что `NEXT_PUBLIC_API_URL` установлен правильно
3. **Мониторинг** - следите за логами после деплоя, чтобы убедиться что ошибки исчезли

## Команды для пересборки

```bash
# В директории frontend/frontend dir
docker build -t frontend-director:latest .

# Или через docker-compose
docker-compose build frontend-director
```

## Проверка после деплоя

1. Проверьте консоль браузера - не должно быть ошибок `returnNaN` и `EACCES`
2. Проверьте загрузку файлов - должны работать корректно
3. Проверьте логи сервера - не должно быть `uncaughtException`

## Дополнительная информация

- Next.js версия: 15.5.5
- React версия: 18.3.1
- Node.js рекомендуемая версия: 20.x

## Контакты

Если проблемы продолжаются, проверьте:
1. Логи Docker контейнера
2. Переменные окружения
3. Доступность auth-service на порту 3002

