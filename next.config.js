/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone режим для Docker
  output: 'standalone',
  
  // Генерируем уникальный build ID для cache busting
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  
  // Отключаем TypeScript проверки во время сборки для Docker
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Оптимизация production build
  productionBrowserSourceMaps: false,
  
  // Оптимизация изображений
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Компиляция определенных пакетов для оптимизации
  transpilePackages: [],
  
  // Turbopack конфигурация (пустая, чтобы использовать дефолтные настройки)
  turbopack: {},

  // Заголовки безопасности
  async headers() {
    // Определяем режим (production строже)
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      // Scripts: Next.js требует 'unsafe-eval' и 'unsafe-inline' в dev режиме
      isDevelopment 
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'" 
        : "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js нужен unsafe-eval даже в prod
      // Styles: Tailwind и Next.js используют inline styles
      "style-src 'self' 'unsafe-inline'",
      // Images: разрешаем из своих источников, data URIs и S3
      "img-src 'self' data: https: blob:",
      // Fonts: разрешаем свои и data URIs
      "font-src 'self' data:",
      // Connect (API): разрешаем свой домен и API сервер
      "connect-src 'self' https://api.lead-schem.ru wss://api.lead-schem.ru https://api.test-shem.ru wss://api.test-shem.ru https://s3.twcstorage.ru",
      // Media: только свои источники
      "media-src 'self' https://s3.twcstorage.ru https://s3.timeweb.com",
      // Objects: запрещаем
      "object-src 'none'",
      // Base URI: только свой домен
      "base-uri 'self'",
      // Form actions: только свой домен
      "form-action 'self'",
      // Frame ancestors: запрещаем фреймы (защита от clickjacking)
      "frame-ancestors 'none'",
      // Upgrade insecure requests в production
      isDevelopment ? "" : "upgrade-insecure-requests",
      // Block mixed content
      "block-all-mixed-content",
    ].filter(Boolean).join('; ')

    return [
      // Инвалидация кеша для JavaScript файлов и Server Actions
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
        ],
      },
      {
        source: '/_next/server-actions/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          },
        ],
      },
      {
        source: '/_next/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          },
        ],
      },
      // HTML файлы - всегда проверять актуальность
      {
        source: '/:path*.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          },
        ],
      },
      // Основные заголовки безопасности для всех страниц
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspDirectives
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY' // Улучшено с SAMEORIGIN на DENY для лучшей защиты
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          // Инвалидация кеша для страниц (чтобы браузер всегда проверял новые версии)
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          },
        ],
      },
    ]
  },

  // Compression
  compress: true,

  // Отключаем x-powered-by заголовок
  poweredByHeader: false,

  // React strict mode
  reactStrictMode: true,

  // Экспериментальные фичи для оптимизации
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig
