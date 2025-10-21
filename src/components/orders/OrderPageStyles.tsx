/**
 * Глобальные стили для страницы заказа
 */

import React from 'react';

export const OrderPageStyles: React.FC = () => {
  return (
    <style jsx global>{`
      /* Кастомный скролл для dropdown */
      .custom-dropdown::-webkit-scrollbar {
        width: 6px;
      }
      .custom-dropdown::-webkit-scrollbar-track {
        background: #374151;
        border-radius: 3px;
      }
      .custom-dropdown::-webkit-scrollbar-thumb {
        background: #2a6b68;
        border-radius: 3px;
      }
      .custom-dropdown::-webkit-scrollbar-thumb:hover {
        background: #1a5a57;
      }
      
      select::-webkit-scrollbar {
        width: 8px;
      }
      select::-webkit-scrollbar-track {
        background: #374151;
      }
      select::-webkit-scrollbar-thumb {
        background: #2a6b68;
        border-radius: 4px;
      }
      select::-webkit-scrollbar-thumb:hover {
        background: #1a5a57;
      }
      select option {
        background: #374151 !important;
        color: white !important;
      }
      select option:hover {
        background: #2a6b68 !important;
        color: white !important;
      }
      select option:focus {
        background: #2a6b68 !important;
        color: white !important;
      }
      select option:checked {
        background: #2a6b68 !important;
        color: white !important;
      }
      select option:active {
        background: #2a6b68 !important;
        color: white !important;
      }
      select option:selected {
        background: #2a6b68 !important;
        color: white !important;
      }
      select option:checked:hover {
        background: #2a6b68 !important;
        color: white !important;
      }
      select option:selected:hover {
        background: #2a6b68 !important;
        color: white !important;
      }
      select option:focus:hover {
        background: #2a6b68 !important;
        color: white !important;
      }
      * {
        -webkit-tap-highlight-color: transparent !important;
      }
      select option::-moz-selection {
        background: #2a6b68 !important;
        color: white !important;
      }
      select option::selection {
        background: #2a6b68 !important;
        color: white !important;
      }
    `}</style>
  );
};

