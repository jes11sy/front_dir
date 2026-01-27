/**
 * Утилиты для работы с файлами в S3
 */

import React from 'react';

// ✅ FIX #173: URL берутся из env, fallback для разработки
const S3_BASE_URL = process.env.NEXT_PUBLIC_S3_BASE_URL || 'https://s3.twcstorage.ru/f7eead03-crmfiles';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1';

/**
 * Получить прямую ссылку на файл в S3
 * @param fileKey - ключ файла в S3 (например: "director/passport_doc/123.pdf")
 * @returns Прямая ссылка на файл в S3
 */
export async function getSignedUrl(fileKey: string): Promise<string> {
  // Проверяем fileKey
  if (!fileKey || typeof fileKey !== 'string' || fileKey.trim() === '') {
    console.warn('⚠️ Invalid file key provided:', fileKey);
    throw new Error('File key is required');
  }

  const cleanFileKey = fileKey.trim();

  // Если fileKey уже является полным URL, возвращаем его как есть
  if (cleanFileKey.startsWith('http://') || cleanFileKey.startsWith('https://')) {
    return cleanFileKey;
  }

  // Возвращаем прямую ссылку на S3
  return `${S3_BASE_URL}/${cleanFileKey}`;
}

/**
 * Загрузить файл в S3
 * @param file - файл для загрузки
 * @param folderType - тип папки (например: 'orders', 'directors', 'masters')
 * @returns Путь к загруженному файлу в S3
 */
export async function uploadFile(file: File, folderType: string): Promise<string> {
  if (!file) {
    throw new Error('File is required');
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    // Определяем папку в зависимости от типа
    const folderMap: Record<string, string> = {
      'orders': 'director/orders/bso_doc',
      'expenditure': 'director/orders/expenditure_doc',
      'directors': 'director/directors/passport_doc',
      'masters': 'director/masters/passport_doc',
      'cash': 'director/cash/receipt_doc',
    };

    const folder = folderMap[folderType] || `director/${folderType}`;

    const response = await fetch(
      `${API_BASE_URL}/files/upload?folder=${encodeURIComponent(folder)}`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Use-Cookies': 'true',
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload file');
    }

    const result = await response.json();
    // API возвращает { success: true, data: { key: "..." } }
    // ВАЖНО: Всегда используем key, а не url, чтобы сохранить только путь к файлу
    return result.data?.key;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Получить прямые ссылки на несколько файлов в S3
 * @param fileKeys - массив ключей файлов в S3
 * @returns Объект с ключами и прямыми ссылками
 */
export async function getSignedUrls(fileKeys: string[]): Promise<Record<string, string>> {
  if (!fileKeys || fileKeys.length === 0) {
    return {};
  }

  const urls: Record<string, string> = {};
  
  for (const key of fileKeys) {
    try {
      urls[key] = await getSignedUrl(key);
    } catch (error) {
      console.error(`Error getting URL for ${key}:`, error);
      urls[key] = ''; // Пустая строка в случае ошибки
    }
  }

  return urls;
}

/**
 * Хук для получения прямой ссылки на файл в S3
 * @param fileKey - ключ файла в S3
 * @returns URL файла или null
 */
export function useFileUrl(fileKey: string | null | undefined) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!fileKey) {
      setUrl(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    getSignedUrl(fileKey)
      .then(signedUrl => {
        if (mounted) {
          setUrl(signedUrl);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [fileKey]);

  return { url, loading, error };
}

