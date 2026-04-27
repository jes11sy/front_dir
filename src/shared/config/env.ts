const defaultEnv = {
  apiUrl: 'https://api.lead-schem.ru/api/v1',
  s3BaseUrl: 'https://s3.twcstorage.ru/f7eead03-crmfiles',
}

function getPublicEnv(name: string, fallback: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    return fallback
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  appEnv: process.env.NEXT_PUBLIC_ENV ?? 'development',
  apiUrl: getPublicEnv('NEXT_PUBLIC_API_URL', defaultEnv.apiUrl),
  s3BaseUrl: getPublicEnv('NEXT_PUBLIC_S3_BASE_URL', defaultEnv.s3BaseUrl),
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
} as const
