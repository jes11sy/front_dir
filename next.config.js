/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone режим для Docker
  output: 'standalone',
  
  // Отключаем ESLint и TypeScript проверки во время сборки для Docker
  eslint: {
    ignoreDuringBuilds: true,
  },
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

  // Webpack оптимизации
  webpack: (config, { dev, isServer }) => {
    // Production оптимизации
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        minimize: true,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk для библиотек
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk для общего кода
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      }
    }

    // Игнорируем определенные модули, которые могут вызывать проблемы
    config.resolve = config.resolve || {}
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }

    return config
  },

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
