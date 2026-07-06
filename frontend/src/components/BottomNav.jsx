import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarRange, LayoutDashboard, CreditCard, Settings } from 'lucide-react';

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Trans.', path: '/transactions', icon: CalendarRange },
    { label: 'Stats', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Accounts', path: '/accounts', icon: CreditCard },
    { label: 'More', path: '/more', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col shadow-2xl">
      {/* Global Compact Footer */}
      <div className="bg-base-300/95 backdrop-blur-md border-t border-base-content/5 py-1.5 px-4 text-center text-[10px] text-base-content/40 tracking-wider">
        <span>© {new Date().getFullYear()} NexaWealth. Built by </span>
        <a 
          href="https://armanislam.me" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-error hover:text-error/80 transition-colors font-medium hover:underline"
        >
          Arman Islam
        </a>
      </div>

      {/* Navigation Bar */}
      <div className="border-t border-base-content/10 bg-base-100/90 backdrop-blur-md flex justify-around items-center py-2 h-16">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 transition-all duration-200 ${
                isActive ? 'text-error scale-110 font-bold' : 'text-base-content/60 hover:text-base-content'
              }`}
            >
              <IconComponent className="h-5 w-5 mb-1" />
              <span className="text-[10px] tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

