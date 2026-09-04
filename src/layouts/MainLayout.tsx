import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import type { TabType } from '../types/navigation'; 

interface MainLayoutProps {
  children: React.ReactNode;
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
}

export default function MainLayout({ children, currentTab, setCurrentTab }: MainLayoutProps) {
  return (
    <div className="layout">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <div className="main-content">
        <Navbar user={null} onLogout={() => {}} />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}