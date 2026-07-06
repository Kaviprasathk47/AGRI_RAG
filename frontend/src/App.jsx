import React, { useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquare, UploadCloud, Moon, Sun, Menu, X, Leaf } from 'lucide-react';
import Dashboard from './components/Dashboard';
import UploadCard from './components/UploadCard';
import ChatWindow from './components/ChatWindow';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat'); // chat, dashboard, upload
  const [darkMode, setDarkMode] = useState(() => {
    // Check local storage or system preference
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Sync dark class on body & document element
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#0b0f19'; // Slate-950 color
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc'; // Slate-50 color
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const tabs = [
    { id: 'chat', name: 'Chat Workspace', icon: MessageSquare },
    { id: 'dashboard', name: 'Dashboard & Files', icon: LayoutDashboard },
    { id: 'upload', name: 'Ingest Documents', icon: UploadCloud }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    if (tabId === 'dashboard') {
      triggerRefresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-slate-800 dark:text-slate-100 transition-colors duration-250">
      
      {/* Mobile Header bar */}
      <header className="lg:hidden h-16 border-b border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 px-6 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-pesticide-600 dark:text-pesticide-400" />
          <span className="font-bold text-slate-900 dark:text-white text-sm">AGRI RAG</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleDarkMode}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5" />}
          </button>
          <button 
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 transform ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-850 flex-col z-50 shrink-0 transition-transform duration-300 ease-in-out`}>
        
        {/* Sidebar Header */}
        <div className="h-16 px-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3 shrink-0">
          <div className="p-2 bg-pesticide-600 rounded-lg text-white">
            <Leaf className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-sm tracking-wide block">AGRI RAG</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block leading-none">Pesticide Chat</span>
          </div>
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-pesticide-600 text-white shadow-sm font-semibold' 
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-450 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                {tab.name}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer (Theme controls + details) */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 shrink-0 space-y-4">
          <button
            onClick={toggleDarkMode}
            className="hidden lg:flex w-full items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-100/50 p-2.5 rounded-xl text-xs font-semibold text-slate-500 transition-colors"
          >
            <span className="flex items-center gap-2">
              {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
              {darkMode ? 'Light Theme' : 'Dark Theme'}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">mode</span>
          </button>

          <div className="text-[10px] text-slate-400 text-center font-medium">
            Agri Pesticide Chatbot v1.0.0
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:p-8">
        <div className="max-w-5xl mx-auto h-full">
          {activeTab === 'chat' && <ChatWindow />}
          {activeTab === 'dashboard' && (
            <Dashboard 
              refreshTrigger={refreshTrigger} 
              onRefresh={triggerRefresh} 
            />
          )}
          {activeTab === 'upload' && (
            <UploadCard onIngestionSuccess={triggerRefresh} />
          )}
        </div>
      </main>

    </div>
  );
}
