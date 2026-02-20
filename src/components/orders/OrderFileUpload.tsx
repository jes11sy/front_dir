/**
 * Компонент для загрузки файлов БСО и документа расхода
 */

import React from 'react';
import { ArrowUpFromLine, Download, X, FileText, Receipt } from 'lucide-react';

interface OrderFileUploadProps {
  bsoFile: File | null;
  expenditureFile: File | null;
  bsoPreview: string | null;
  expenditurePreview: string | null;
  handleFile: (file: File, type: 'bso' | 'expenditure') => void;
  removeFile: (type: 'bso' | 'expenditure') => void;
  isFieldsDisabled: () => boolean;
  setBsoDragOver: (value: boolean) => void;
  setExpenditureDragOver: (value: boolean) => void;
  bsoDragOver: boolean;
  expenditureDragOver: boolean;
}

export const OrderFileUpload: React.FC<OrderFileUploadProps> = ({
  bsoFile,
  expenditureFile,
  bsoPreview,
  expenditurePreview,
  handleFile,
  removeFile,
  isFieldsDisabled,
  setBsoDragOver,
  setExpenditureDragOver,
  bsoDragOver,
  expenditureDragOver,
}) => {
  const UploadZone = ({
    label,
    icon: Icon,
    preview,
    file,
    dragOver,
    onDragOver,
    onDragLeave,
    onDrop,
    onFileChange,
    onDownload,
    onRemove,
    type,
  }: {
    label: string;
    icon: React.ElementType;
    preview: string | null;
    file: File | null;
    dragOver: boolean;
    onDragOver: () => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDownload: () => void;
    onRemove: () => void;
    type: 'bso' | 'expenditure';
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div
        className={`relative border border-dashed rounded-lg transition-colors ${
          dragOver ? 'border-blue-400' : 'border-gray-300'
        } ${preview ? 'p-2' : 'p-8'}`}
        onDragOver={(e) => { e.preventDefault(); if (!isFieldsDisabled()) onDragOver(); }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {!preview && (
          <input
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isFieldsDisabled()}
            onChange={onFileChange}
          />
        )}

        {preview ? (
          <div className="relative group">
            <img
              src={preview}
              alt={label}
              className="w-full max-h-48 object-contain rounded cursor-pointer"
              onClick={(e) => { e.stopPropagation(); window.open(preview, '_blank'); }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded transition-all duration-150" />
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDownload(); }}
                className="w-6 h-6 bg-white/90 hover:bg-white text-gray-700 rounded flex items-center justify-center transition-colors"
                title="Скачать"
              >
                <Download className="w-3 h-3" />
              </button>
              {!isFieldsDisabled() && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  className="w-6 h-6 bg-white/90 hover:bg-white text-gray-700 rounded flex items-center justify-center transition-colors"
                  title="Удалить"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <Icon className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">
              {dragOver ? 'Отпустите файл' : 'Перетащите файл или нажмите для выбора'}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UploadZone
        label="Договор"
        icon={FileText}
        preview={bsoPreview}
        file={bsoFile}
        dragOver={bsoDragOver}
        onDragOver={() => setBsoDragOver(true)}
        onDragLeave={() => setBsoDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setBsoDragOver(false);
          if (!isFieldsDisabled()) {
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file, 'bso');
          }
        }}
        onFileChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file, 'bso');
        }}
        onDownload={() => {
          const link = document.createElement('a');
          link.href = bsoPreview!;
          link.download = bsoFile?.name || 'bso';
          link.target = '_blank';
          link.click();
        }}
        onRemove={() => removeFile('bso')}
        type="bso"
      />
      <UploadZone
        label="Документ расхода"
        icon={Receipt}
        preview={expenditurePreview}
        file={expenditureFile}
        dragOver={expenditureDragOver}
        onDragOver={() => setExpenditureDragOver(true)}
        onDragLeave={() => setExpenditureDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setExpenditureDragOver(false);
          if (!isFieldsDisabled()) {
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file, 'expenditure');
          }
        }}
        onFileChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file, 'expenditure');
        }}
        onDownload={() => {
          const link = document.createElement('a');
          link.href = expenditurePreview!;
          link.download = expenditureFile?.name || 'expenditure';
          link.target = '_blank';
          link.click();
        }}
        onRemove={() => removeFile('expenditure')}
        type="expenditure"
      />
    </div>
  );
};

