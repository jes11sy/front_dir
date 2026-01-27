/**
 * Custom hook для работы с загрузкой файлов
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // ✅ FIX: Ref для отслеживания текущего blob URL (для cleanup при unmount)
  const previewRef = useRef<string | null>(null);

  const createFilePreview = useCallback((file: File): string => {
    return URL.createObjectURL(file);
  }, []);

  const clearPreview = useCallback((url: string) => {
    URL.revokeObjectURL(url);
  }, []);

  const handleFile = useCallback((newFile: File) => {
    if (preview && preview.startsWith('blob:')) {
      clearPreview(preview);
    }
    setFile(newFile);
    const newPreview = createFilePreview(newFile);
    setPreview(newPreview);
    // ✅ FIX: Сохраняем в ref для cleanup
    previewRef.current = newPreview;
  }, [preview, createFilePreview, clearPreview]);

  const removeFile = useCallback(() => {
    if (preview && preview.startsWith('blob:')) {
      clearPreview(preview);
    }
    setFile(null);
    setPreview(null);
    // ✅ FIX: Очищаем ref
    previewRef.current = null;
  }, [preview, clearPreview]);

  const setExistingPreview = useCallback((url: string) => {
    setPreview(url);
    // Не сохраняем в ref - это не blob URL
  }, []);

  // Cleanup при размонтировании
  const cleanup = useCallback(() => {
    if (preview && preview.startsWith('blob:')) {
      clearPreview(preview);
    }
  }, [preview, clearPreview]);

  // ✅ FIX: Автоматический cleanup при размонтировании компонента
  useEffect(() => {
    return () => {
      if (previewRef.current && previewRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  return {
    file,
    preview,
    dragOver,
    setDragOver,
    handleFile,
    removeFile,
    setExistingPreview,
    cleanup,
  };
}

