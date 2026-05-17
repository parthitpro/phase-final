import React from 'react';
import { Icons } from './Icons';
import type { Tab } from '../schema';

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export const BottomNavigation: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Home', icon: <Icons.Dashboard /> },
    { id: 'manage', label: 'Orders', icon: <Icons.Orders /> },
    { id: 'manufacturing', label: 'Produce', icon: <Icons.Manufacturing /> },
    { id: 'delivery', label: 'Deliver', icon: <Icons.Delivery /> },
    { id: 'customers', label: 'More', icon: <Icons.Users /> },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <div className="tab-icon">{tab.icon}</div>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};
