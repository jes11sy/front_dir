/**
 * Custom hook для работы с загрузкой файлов
 */

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

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
    setPreview(createFilePreview(newFile));
  }, [preview, createFilePreview, clearPreview]);

  const removeFile = useCallback(() => {
    if (preview && preview.startsWith('blob:')) {
      clearPreview(preview);
    }
    setFile(null);
    setPreview(null);
  }, [preview, clearPreview]);

  const setExistingPreview = useCallback((url: string) => {
    setPreview(url);
  }, []);

  // Cleanup при размонтировании
  const cleanup = useCallback(() => {
    if (preview && preview.startsWith('blob:')) {
      clearPreview(preview);
    }
  }, [preview, clearPreview]);

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

