# 🔒 Security Audit: Страница логина

**Дата:** 31 октября 2025  
**Файл:** `src/app/login/page.tsx`  
**Статус:** Найдены критические уязвимости

---

## 📊 Общая оценка: 6.5/10

### ✅ Что уже защищено:

1. **Sanitization логина** - используется `sanitizeString()` ✅
2. **Валидация полей** - есть проверка длины и обязательности ✅
3. **HTTPS** - используется `https://api.test-shem.ru` ✅
4. **X-Frame-Options** - защита от clickjacking ✅
5. **Правильный autocomplete** - `username` и `current-password` ✅
6. **Disabled кнопка** - нельзя отправить несколько раз подряд ✅

---

## 🔴 КРИТИЧЕСКИЕ УЯЗВИМОСТИ

### 1. ⚠️ XSS через сообщения об ошибках валидации

**Серьезность:** КРИТИЧЕСКАЯ  
**Риск:** Выполнение вредоносного кода

**Проблема:**
```typescript:116:118:c:/Users/МАРТА/Desktop/kuber/frontend dir/src/app/login/page.tsx
{errors.login && (
  <p className="text-red-500 text-sm mt-1 animate-fade-in">{errors.login}</p>
)}
```

Сообщение об ошибке выводится напрямую без санитизации! Если злоумышленник создаст кастомную ошибку с HTML/JS кодом, она будет выполнена.

**Векторы атаки:**
1. Модифицированный клиент может отправить вредоносную ошибку
2. Man-in-the-middle может изменить ответ сервера
3. Compromised backend может вернуть XSS в сообщении

**Решение:**
Санитизировать ВСЕ выводимые сообщения об ошибках.

---

### 2. ⚠️ Слабые требования к паролю

**Серьезность:** ВЫСОКАЯ  
**Риск:** Легкий подбор паролей

**Проблема:**
```typescript:43:47:c:/Users/МАРТА/Desktop/kuber/frontend dir/src/app/login/page.tsx
const passwordError = validateField(sanitizedPassword, [
  validators.required('Введите пароль'),
  validators.minLength(4, 'Пароль слишком короткий'), // ⚠️ ВСЕГО 4 СИМВОЛА!
  validators.maxLength(100, 'Пароль слишком длинный'),
])
```

**Почему это опасно:**
- Пароль из 4 символов = только буквы = 26^4 = ~456,976 комбинаций
- Современный GPU перебирает это за **секунды**
- Рекомендуемый минимум: **12 символов**

**Примеры слабых паролей:**
- `pass` ✅ проходит валидацию!
- `1234` ✅ проходит валидацию!
- `test` ✅ проходит валидацию!

---

### 3. ⚠️ Отсутствие Rate Limiting на клиенте

**Серьезность:** ВЫСОКАЯ  
**Риск:** Брутфорс атаки

**Проблема:**
Нет ограничения на количество попыток входа. Злоумышленник может:
- Перебирать пароли без ограничений
- DoS атака на API логина
- Подбор существующих пользователей

**Рекомендация:**
Добавить throttling: максимум 5 попыток за 5 минут.

---

### 4. ⚠️ Информативные сообщения об ошибках

**Серьезность:** СРЕДНЯЯ  
**Риск:** Перечисление пользователей (User Enumeration)

**Проблема:**
Детальные сообщения валидации помогают атакующему:

```typescript
validators.minLength(2, 'Логин слишком короткий')  // Раскрывает требования
validators.minLength(4, 'Пароль слишком короткий')  // Помогает подбирать пароль
```

Если backend возвращает разные ошибки для "пользователь не найден" vs "неверный пароль", атакующий может перечислить всех пользователей.

**Рекомендация:**
Общее сообщение: "Неверный логин или пароль"

---

### 5. ⚠️ Отсутствие CAPTCHA

**Серьезность:** СРЕДНЯЯ  
**Риск:** Автоматизированные атаки ботов

**Проблема:**
Нет защиты от:
- Ботов для брутфорса
- Автоматизированного перечисления пользователей
- DDoS на форму логина

**Рекомендация:**
Добавить reCAPTCHA v3 (невидимая) после 3 неудачных попыток.

---

### 6. ⚠️ Timing Attack возможен

**Серьезность:** НИЗКАЯ-СРЕДНЯЯ  
**Риск:** Определение существования пользователя

**Проблема:**
Если backend проверяет пароль только для существующих пользователей, время ответа будет разным:
- Пользователь НЕ существует: быстрый ответ (~50ms)
- Пользователь существует, пароль неверный: медленнее (~200ms из-за bcrypt)

**Рекомендация:**
На backend всегда делать одинаковую работу (dummy hash check).

---

### 7. ⚠️ Незащищенный редирект после логина

**Серьезность:** НИЗКАЯ  
**Риск:** Open Redirect

**Проблема:**
```typescript:68:68:c:/Users/МАРТА/Desktop/kuber/frontend dir/src/app/login/page.tsx
router.push('/orders')
```

Если добавить параметр `?redirect=`, можно перенаправить на внешний сайт:
```
https://yoursite.com/login?redirect=https://evil.com
```

**Решение:**
Валидировать redirect только на внутренние URL.

---

## 🟡 СРЕДНИЕ ПРОБЛЕМЫ

### 8. Отсутствие 2FA (Two-Factor Authentication)

Для CRM с финансовыми данными рекомендуется двухфакторная аутентификация.

### 9. Нет проверки утечки пароля

Можно интегрировать API `haveibeenpwned.com` для проверки скомпрометированных паролей.

### 10. Автозаполнение пароля в "Запомнить меня"

Checkbox "Запомнить меня" использует localStorage - уязвимость к XSS (уже исправили на sessionStorage ✅).

---

## 🔧 ИСПРАВЛЕНИЯ

### Исправление 1: Санитизация сообщений об ошибках

```typescript
// Безопасный вывод ошибок
{errors.login && (
  <p className="text-red-500 text-sm mt-1 animate-fade-in">
    {sanitizeString(errors.login)}
  </p>
)}

{errors.password && (
  <p className="text-red-500 text-sm mt-1 animate-fade-in">
    {sanitizeString(errors.password)}
  </p>
)}
```

### Исправление 2: Усиление требований к паролю

```typescript
const passwordError = validateField(sanitizedPassword, [
  validators.required('Введите пароль'),
  validators.minLength(8, 'Минимум 8 символов'),  // Увеличили с 4 до 8
  validators.maxLength(100, 'Максимум 100 символов'),
  // Добавить проверку сложности (опционально)
  validators.pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Пароль должен содержать заглавные и строчные буквы, цифры'
  ),
])
```

### Исправление 3: Rate Limiting

```typescript
// Добавить в компонент
const [attemptCount, setAttemptCount] = useState(0)
const [blockedUntil, setBlockedUntil] = useState<number | null>(null)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // Проверка блокировки
  if (blockedUntil && Date.now() < blockedUntil) {
    const seconds = Math.ceil((blockedUntil - Date.now()) / 1000)
    toast.error(`Слишком много попыток. Попробуйте через ${seconds} секунд`)
    return
  }
  
  setIsLoading(true)
  setErrors({})
  
  try {
    // ... валидация ...
    
    const data = await apiClient.login(sanitizedLogin, sanitizedPassword, rememberMe)
    
    // Успешный вход - сбрасываем счетчик
    setAttemptCount(0)
    setBlockedUntil(null)
    
    router.push('/orders')
  } catch (error) {
    // Увеличиваем счетчик неудачных попыток
    const newCount = attemptCount + 1
    setAttemptCount(newCount)
    
    // Блокируем после 5 попыток
    if (newCount >= 5) {
      const blockTime = Date.now() + 5 * 60 * 1000 // 5 минут
      setBlockedUntil(blockTime)
      toast.error('Слишком много попыток входа. Попробуйте через 5 минут.')
    } else {
      const remainingAttempts = 5 - newCount
      toast.error(
        `Неверный логин или пароль. Осталось попыток: ${remainingAttempts}`
      )
    }
    
    setIsLoading(false)
  }
}
```

### Исправление 4: Общие сообщения об ошибках

```typescript
// Вместо детальных сообщений
if (loginError || passwordError) {
  // ❌ НЕ показывать детали!
  // toast.error(loginError || passwordError)
  
  // ✅ Общее сообщение
  toast.error('Неверные данные для входа')
  setIsLoading(false)
  return
}
```

### Исправление 5: Защита от редиректа

```typescript
import { useSearchParams } from 'next/navigation'

const searchParams = useSearchParams()
const redirect = searchParams.get('redirect')

// После успешного входа
if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
  // Только внутренние URL (начинаются с /)
  router.push(redirect)
} else {
  router.push('/orders')
}
```

---

## 🎯 Приоритеты исправлений

### Критический приоритет (сделать СРОЧНО):
1. ✅ Санитизация сообщений об ошибках (XSS)
2. ✅ Увеличить минимальную длину пароля до 8
3. ✅ Добавить rate limiting на клиенте

### Высокий приоритет (сделать в течение недели):
4. Добавить CAPTCHA после 3 попыток
5. Общие сообщения об ошибках (не раскрывать детали)
6. Защита от open redirect

### Средний приоритет (можно отложить):
7. Проверка сложности пароля
8. Интеграция с haveibeenpwned
9. Timing attack защита на backend

---

## 📋 Backend Security Checklist

**Обязательно проверьте на backend:**

- [ ] SQL Injection защита (prepared statements)
- [ ] Rate limiting (максимум 5 попыток / IP / 5 минут)
- [ ] Защита от timing attacks (constant-time comparison)
- [ ] Безопасное хеширование паролей (bcrypt с cost >= 12)
- [ ] Логирование попыток входа
- [ ] Account lockout после N неудачных попыток
- [ ] CSRF токены для API
- [ ] Secure cookies (HttpOnly, Secure, SameSite)
- [ ] Валидация и санитизация на backend (не доверять фронту!)

---

## 📊 Итоговая оценка безопасности

| Категория | Оценка | Комментарий |
|-----------|--------|-------------|
| **XSS защита** | 6/10 | Есть санитизация, но не везде |
| **SQL Injection** | 10/10 | На фронте не применимо (backend ответственность) |
| **Rate Limiting** | 2/10 | Отсутствует |
| **Password Security** | 3/10 | Слишком слабые требования (4 символа) |
| **User Enumeration** | 5/10 | Детальные сообщения |
| **CAPTCHA** | 0/10 | Отсутствует |
| **CSRF** | 8/10 | SameSite cookies (если настроены) |
| **Clickjacking** | 10/10 | X-Frame-Options: DENY ✅ |

---

## ✅ План действий

### Неделя 1: Критические уязвимости
- [x] CSP добавлен ✅
- [x] sessionStorage вместо localStorage ✅
- [ ] Санитизация сообщений об ошибках
- [ ] Увеличить минимальную длину пароля
- [ ] Добавить rate limiting

### Неделя 2: Высокий приоритет
- [ ] Добавить CAPTCHA
- [ ] Общие сообщения об ошибках
- [ ] Защита от open redirect

### Неделя 3: Backend
- [ ] Аудит backend API
- [ ] Rate limiting на сервере
- [ ] Account lockout
- [ ] Security logging

---

## 🚨 Немедленные действия

**СЕЙЧАС нужно исправить:**

1. **XSS в ошибках** - 5 минут
2. **Слабый пароль** - 2 минуты
3. **Rate limiting** - 15 минут

**Итого:** 22 минуты для устранения критических уязвимостей!

---

**Автор аудита:** AI Security Analyst  
**Дата:** 31 октября 2025

