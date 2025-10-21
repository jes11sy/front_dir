/**
 * Компонент для загрузки файлов БСО и документа расхода
 */

import React from 'react';
import { Order } from '@/lib/api';
import { getSignedUrl } from '@/lib/s3-utils';

interface OrderFileUploadProps {
  order: Order;
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
  order,
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* БСО (Документ) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          БСО (Документ)
          <span className="text-xs text-gray-500 ml-2">(макс. 50MB)</span>
        </label>
        
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            bsoDragOver 
              ? 'border-blue-400 bg-blue-900/20' 
              : bsoPreview 
                ? 'border-green-400 bg-green-900/20' 
                : 'border-gray-600 bg-gray-800/50'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            if (!isFieldsDisabled()) setBsoDragOver(true)
          }}
          onDragLeave={() => setBsoDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setBsoDragOver(false)
            if (!isFieldsDisabled()) {
              const file = e.dataTransfer.files[0]
              if (file) handleFile(file, 'bso')
            }
          }}
        >
          {!bsoPreview && (
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isFieldsDisabled()}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file, 'bso')
              }}
            />
          )}
          
          {bsoPreview ? (
            <div className="space-y-3">
              <div className="relative">
                <img 
                  src={bsoPreview} 
                  alt="Превью БСО" 
                  className="mx-auto max-w-full max-h-48 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={async (e) => {
                    e.stopPropagation()
                    let viewUrl = bsoPreview
                    if (!bsoPreview.startsWith('blob:') && order.bsoDoc) {
                      viewUrl = await getSignedUrl(order.bsoDoc)
                    }
                    window.open(viewUrl, '_blank')
                  }}
                />
                <div className="absolute top-2 right-2 flex gap-2 z-20">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      let downloadUrl = bsoPreview
                      if (!bsoPreview.startsWith('blob:') && order.bsoDoc) {
                        downloadUrl = await getSignedUrl(order.bsoDoc)
                      }
                      const link = document.createElement('a')
                      link.href = downloadUrl
                      link.download = bsoFile?.name || 'bso'
                      link.click()
                    }}
                    className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg pointer-events-auto"
                    title="Скачать файл"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {!isFieldsDisabled() && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        removeFile('bso')
                      }}
                      className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg pointer-events-auto"
                      title="Удалить файл"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-300 text-center">
                {bsoFile?.name || 'Загруженный файл'}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-gray-300 text-2xl">📄</span>
              </div>
              <div className="text-gray-300 font-medium">
                {bsoDragOver ? 'Отпустите файл' : 'Перетащите файл сюда'}
              </div>
              <div className="text-sm text-gray-400">или нажмите для выбора</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Документ расхода (Чек) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Документ расхода (Чек)
          <span className="text-xs text-gray-500 ml-2">(макс. 50MB)</span>
        </label>
        
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            expenditureDragOver 
              ? 'border-blue-400 bg-blue-900/20' 
              : expenditurePreview 
                ? 'border-green-400 bg-green-900/20' 
                : 'border-gray-600 bg-gray-800/50'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            if (!isFieldsDisabled()) setExpenditureDragOver(true)
          }}
          onDragLeave={() => setExpenditureDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setExpenditureDragOver(false)
            if (!isFieldsDisabled()) {
              const file = e.dataTransfer.files[0]
              if (file) handleFile(file, 'expenditure')
            }
          }}
        >
          {!expenditurePreview && (
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isFieldsDisabled()}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file, 'expenditure')
              }}
            />
          )}
          
          {expenditurePreview ? (
            <div className="space-y-3">
              <div className="relative">
                <img 
                  src={expenditurePreview} 
                  alt="Превью документа расхода" 
                  className="mx-auto max-w-full max-h-48 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={async (e) => {
                    e.stopPropagation()
                    let viewUrl = expenditurePreview
                    if (!expenditurePreview.startsWith('blob:') && order.expenditureDoc) {
                      viewUrl = await getSignedUrl(order.expenditureDoc)
                    }
                    window.open(viewUrl, '_blank')
                  }}
                />
                <div className="absolute top-2 right-2 flex gap-2 z-20">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      let downloadUrl = expenditurePreview
                      if (!expenditurePreview.startsWith('blob:') && order.expenditureDoc) {
                        downloadUrl = await getSignedUrl(order.expenditureDoc)
                      }
                      const link = document.createElement('a')
                      link.href = downloadUrl
                      link.download = expenditureFile?.name || 'expenditure'
                      link.click()
                    }}
                    className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg pointer-events-auto"
                    title="Скачать файл"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {!isFieldsDisabled() && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        removeFile('expenditure')
                      }}
                      className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg pointer-events-auto"
                      title="Удалить файл"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-300 text-center">
                {expenditureFile?.name || 'Загруженный файл'}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-gray-300 text-2xl">📄</span>
              </div>
              <div className="text-gray-300 font-medium">
                {expenditureDragOver ? 'Отпустите файл' : 'Перетащите файл сюда'}
              </div>
              <div className="text-sm text-gray-400">или нажмите для выбора</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

