import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAxiosPublic } from '../hooks/useApi';
import { TrendingUp, Gift, Sun, Moon } from 'lucide-react';

export default function PublicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const isDark = theme === 'dark';
  const api = useAxiosPublic();

  const [banner, setBanner] = useState(null);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const response = await api.get('/api/admin/promo-banner');
        if (response.data.success) {
          setBanner(response.data.data);
        }
      } catch (err) {
        console.error('Failed to load promotional banner:', err);
      }
    };
    fetchBanner();
  }, [api]);

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#0b0c10] text-[#c5c6c7] selection:bg-[#66fcf1] selection:text-[#0b0c10]' : 'bg-[#f8fafc] text-[#334155] selection:bg-indigo-500 selection:text-white'
    }`}>
      
      {/* Promotional Banner */}
      {banner && banner.isActive && banner.promoText && banner.promoText.trim() !== '' && (
        <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-teal-700 text-white font-semibold py-2.5 px-4 text-center text-xs sm:text-sm flex items-center justify-center gap-2 relative z-50 shadow-md">
          <Gift className="w-4 h-4 shrink-0 animate-bounce text-[#66fcf1]" />
          <span>{banner.promoText}</span>
          <button 
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
            className="ml-2 px-3 py-1 bg-white text-[#0b0c10] rounded-full text-[10px] sm:text-xs font-bold hover:bg-gray-100 transition-colors cursor-pointer"
          >
            {banner.btnText || 'Claim Now'}
          </button>
        </div>
      )}

      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-all duration-300 ${
        isDark ? 'border-[#1f2833]/40 bg-[#0b0c10]/70' : 'border-gray-200 bg-white/80 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#66fcf1] to-[#45a29e] flex items-center justify-center shadow-lg shadow-[#66fcf1]/20 group-hover:rotate-12 transition-transform duration-300">
              <TrendingUp className="w-6 h-6 text-[#0b0c10]" />
            </div>
            <span className={`text-xl font-bold tracking-wider transition-colors ${
              isDark ? 'text-white hover:text-[#66fcf1]' : 'text-[#0f172a] hover:text-indigo-600'
            }`}>
              NexusWealth
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide">
            <Link 
              to="/" 
              className={`transition-colors ${
                isActive('/') 
                  ? (isDark ? 'text-[#66fcf1] hover:text-[#66fcf1]/80' : 'text-indigo-600 hover:text-indigo-700') 
                  : (isDark ? 'text-[#c5c6c7] hover:text-[#66fcf1]' : 'text-slate-600 hover:text-indigo-600')
              }`}
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className={`transition-colors ${
                isActive('/about') 
                  ? (isDark ? 'text-[#66fcf1] hover:text-[#66fcf1]/80' : 'text-indigo-600 hover:text-indigo-700') 
                  : (isDark ? 'text-[#c5c6c7] hover:text-[#66fcf1]' : 'text-slate-600 hover:text-indigo-600')
              }`}
            >
              About Us
            </Link>
            <Link 
              to="/how-it-works" 
              className={`transition-colors ${
                isActive('/how-it-works') 
                  ? (isDark ? 'text-[#66fcf1] hover:text-[#66fcf1]/80' : 'text-indigo-600 hover:text-indigo-700') 
                  : (isDark ? 'text-[#c5c6c7] hover:text-[#66fcf1]' : 'text-slate-600 hover:text-indigo-600')
              }`}
            >
              How It Works
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isDark ? 'border-[#1f2833] hover:bg-[#1f2833]/50 text-yellow-400' : 'border-gray-300 hover:bg-gray-100 text-indigo-600'
              }`}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {isAuthenticated ? (
              <button 
                onClick={() => navigate('/dashboard')} 
                className={`px-5 py-2 text-sm font-semibold rounded-full shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer ${
                  isDark ? 'text-[#0b0c10] bg-[#66fcf1] hover:bg-[#45a29e] shadow-[#66fcf1]/20' : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
                }`}
              >
                Dashboard
              </button>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/login')} 
                  className={`px-5 py-2 text-sm font-semibold rounded-full border transition-all duration-300 cursor-pointer ${
                    isDark ? 'text-[#66fcf1] border-[#66fcf1]/30 hover:border-[#66fcf1] hover:bg-[#66fcf1]/5' : 'text-indigo-600 border-indigo-600/30 hover:border-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => navigate('/register')} 
                  className={`hidden sm:inline-flex px-5 py-2 text-sm font-semibold rounded-full shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer ${
                    isDark ? 'text-[#0b0c10] bg-[#66fcf1] hover:bg-[#45a29e] shadow-[#66fcf1]/20 hover:shadow-[#45a29e]/30' : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10 hover:shadow-indigo-600/20'
                  }`}
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Page Content */}
      <Outlet />
    </div>
  );
}
