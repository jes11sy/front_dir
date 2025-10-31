/**
 * Утилиты для работы с приватными файлами в S3
 */

import React from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * Получить подписанный URL для одного файла
 * @param fileKey - ключ файла в S3 (например: "director/passport_doc/123.pdf")
 * @param expiresIn - время жизни ссылки в секундах (по умолчанию 3600 = 1 час)
 * @returns Подписанный URL для доступа к файлу
 */
export async function getSignedUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
  if (!fileKey) {
    throw new Error('File key is required');
  }

  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(
      `${API_BASE_URL}/files/download/${encodeURIComponent(fileKey)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      // Если бэкенд не доступен, используем старый публичный URL как fallback
      // ВАЖНО: Это временное решение! Запустите бэкенд для полной безопасности
      console.warn('⚠️ Backend not available, using fallback public URL. This is insecure!');
      const s3BaseUrl = process.env.NEXT_PUBLIC_S3_BASE_URL || 'https://s3.twcstorage.ru/f7eead03-crmfiles';
      return `${s3BaseUrl}/${fileKey}`;
    }

    const result = await response.json();
    // API возвращает { success: true, data: { url: "...", cached: true/false } }
    return result.data?.url || result.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL, using fallback:', error);
    // Fallback к публичному URL если бэкенд недоступен
    const s3BaseUrl = process.env.NEXT_PUBLIC_S3_BASE_URL || 'https://s3.twcstorage.ru/f7eead03-crmfiles';
    return `${s3BaseUrl}/${fileKey}`;
  }
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
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No authentication token found');
    }

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
        headers: {
          'Authorization': `Bearer ${token}`,
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
    return result.data?.key || result.data?.url;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Получить подписанные URL для нескольких файлов
 * @param fileKeys - массив ключей файлов в S3
 * @param expiresIn - время жизни ссылки в секундах
 * @returns Объект с ключами и подписанными URL
 */
export async function getSignedUrls(
  fileKeys: string[], 
  expiresIn: number = 3600
): Promise<Record<string, string>> {
  if (!fileKeys || fileKeys.length === 0) {
    return {};
  }

  try {
    // Получаем URL для каждого файла параллельно
    const urlPromises = fileKeys.map(async (key) => {
      const url = await getSignedUrl(key, expiresIn);
      return { key, url };
    });

    const results = await Promise.all(urlPromises);
    
    // Преобразуем массив в объект
    return results.reduce((acc, { key, url }) => {
      acc[key] = url;
      return acc;
    }, {} as Record<string, string>);
  } catch (error) {
    console.error('Error getting signed URLs:', error);
    throw error;
  }
}

/**
 * Хук для загрузки подписанного URL файла
 * @param fileKey - ключ файла в S3
 * @param expiresIn - время жизни ссылки
 * @returns URL файла или null
 */
export function useFileUrl(fileKey: string | null | undefined, expiresIn: number = 3600) {
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

    getSignedUrl(fileKey, expiresIn)
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
  }, [fileKey, expiresIn]);

  return { url, loading, error };
}

