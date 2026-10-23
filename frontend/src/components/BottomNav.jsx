import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarRange, LayoutDashboard, CreditCard, Settings } from 'lucide-react';
import { isNativeApp, isPwaMode } from '../utils/pwaUtils';
import { hapticSelection } from '../utils/haptics';

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

  const handleNavTap = (path) => {
    hapticSelection();
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate(path);
  };

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col ${
        isAppMode ? 'px-3' : ''
      }`}
      style={{
        paddingBottom: isAppMode
          ? 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)'
          : 'env(safe-area-inset-bottom, 0px)'
      }}
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
              type="button"
              onClick={() => handleNavTap(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full select-none active:scale-90 transition-transform duration-150 ${
                isActive 
                  ? 'text-primary-app font-bold' 
                  : 'text-base-content/60'
              }`}
            >
              <div className={`px-4 py-1 rounded-full transition-colors duration-200 mb-0.5 ${
                isActive ? 'bg-primary-app/15' : 'bg-transparent'
              }`}>
                <IconComponent className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="text-[10px] tracking-wider leading-none">{item.label}</span>
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
