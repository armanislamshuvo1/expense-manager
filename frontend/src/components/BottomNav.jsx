import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarRange, LayoutDashboard, CreditCard, Settings, Plus } from 'lucide-react';
import { isNativeApp, isPwaMode } from '../utils/pwaUtils';

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAppMode = isNativeApp() || isPwaMode();

  const navItems = [
    { label: 'Trans.', path: '/transactions', icon: CalendarRange },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Accounts', path: '/accounts', icon: CreditCard },
    { label: 'More', path: '/more', icon: Settings },
  ];

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col ${
        isAppMode ? 'px-3 pb-2' : ''
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Navigation Bar */}
      <div className={`border border-base-content/10 bg-base-100/95 backdrop-blur-xl flex justify-around items-center py-1.5 h-16 shadow-2xl ${
        isAppMode ? 'rounded-3xl' : 'border-x-0 border-b-0'
      }`}>
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 transition-all duration-200 ${
                isActive 
                  ? 'text-primary-app scale-105 font-bold' 
                  : 'text-base-content/60 hover:text-base-content'
              }`}
            >
              <IconComponent className={`h-5 w-5 mb-1 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Global Compact Footer - shown ONLY on web browser, hidden in APK/PWA */}
      {!isAppMode && (
        <div className="bg-base-300/95 backdrop-blur-md border-t border-base-content/10 py-1.5 px-4 text-center text-[10px] text-base-content/75 tracking-wider">
          <span>© {new Date().getFullYear()} NexusWealth. Built by </span>
          <a 
            href="https://armanislam.me" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary-app hover:underline font-semibold"
          >
            Arman Islam
          </a>
        </div>
      )}
    </div>
  );
};
