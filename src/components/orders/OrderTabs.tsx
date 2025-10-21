/**
 * Компонент табов для страницы заказа
 */

import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface OrderTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: Tab[];
}

export const OrderTabs: React.FC<OrderTabsProps> = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div className="border-b" style={{ borderColor: '#2a6b68' }}>
      <div className="flex gap-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`py-2 px-4 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2'
                : 'text-gray-400 hover:text-white'
            }`}
            style={
              activeTab === tab.id
                ? { borderColor: '#2a6b68' }
                : {}
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

