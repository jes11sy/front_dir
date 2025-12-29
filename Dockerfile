# Используем официальный Node.js образ как базовый (Node 20+ для Next.js 16)
FROM node:20-alpine AS base

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости БЕЗ выполнения postinstall скриптов
RUN npm ci --only=production --ignore-scripts

# Этап сборки
FROM node:20-alpine AS builder
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем все зависимости (включая dev) БЕЗ postinstall скриптов
RUN npm ci --ignore-scripts

# Копируем исходный код
COPY . .

# Build arguments для переменных окружения
ARG NEXT_PUBLIC_API_URL=https://api.test-shem.ru/api/v1

# Устанавливаем как ENV для использования в сборке
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Собираем приложение
RUN npm run build

# Этап продакшена
FROM node:20-alpine AS runner
WORKDIR /app

# Создаем пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 🔒 БЕЗОПАСНОСТЬ: Удаляем опасные утилиты которые используются в эксплойтах
RUN rm -f /usr/bin/wget /usr/bin/curl /usr/bin/nc /usr/bin/netcat 2>/dev/null || true \
    && rm -rf /tmp/* /var/tmp/*

# Копируем package.json
COPY package*.json ./

# Устанавливаем только production зависимости БЕЗ postinstall скриптов
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Копируем собранное приложение из builder этапа (standalone)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Переключаемся на пользователя nextjs
USER nextjs

# Открываем порт
EXPOSE 3002

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

# Запускаем приложение (standalone режим)
CMD ["node", "server.js"]
