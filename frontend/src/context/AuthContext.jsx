import React, { createContext, useContext, useState, useEffect } from 'react';
import { publicApi } from '../utils/apiConfig';
import { Lock, Delete, LogOut } from 'lucide-react';

const AuthContext = createContext(null);

function PasscodeLockScreen({ passcodeValue, onUnlock, onLogout }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const handleKeyPress = (num) => {
    if (code.length >= 4) return;
    const newCode = code + num;
    setCode(newCode);
    setError(false);

    if (newCode.length === 4) {
      if (newCode === passcodeValue) {
        onUnlock();
      } else {
        setTimeout(() => {
          setError(true);
          setCode('');
        }, 200);
      }
    }
  };

  const handleDelete = () => {
    setCode(code.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 bg-[#121216] z-[9999] flex flex-col items-center justify-between py-16 px-6 text-white font-sans">
      <div className="flex flex-col items-center gap-4 mt-8">
        <div className="bg-[#f05454]/10 p-4 rounded-full border border-[#f05454]/20 animate-pulse">
          <Lock className="w-8 h-8 text-[#f05454]" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-wide">NexaWealth</h2>
          <p className={`text-xs mt-2 transition-colors ${error ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
            {error ? 'Incorrect passcode. Try again.' : 'Enter your 4-digit passcode to unlock'}
          </p>
        </div>

        {/* Passcode dots */}
        <div className="flex gap-6 mt-8">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                index < code.length
                  ? 'bg-[#f05454] border-[#f05454] scale-110 shadow-[0_0_8px_rgba(240,84,84,0.6)]'
                  : 'border-gray-600 bg-transparent'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Keypad */}
      <div className="w-full max-w-xs space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(String(num))}
              className="aspect-square rounded-full bg-[#1e1e24] hover:bg-[#25252d] text-2xl font-bold transition-colors active:scale-95 duration-100 flex items-center justify-center border border-gray-800"
            >
              {num}
            </button>
          ))}
          <button
            onClick={onLogout}
            className="aspect-square rounded-full hover:bg-red-950/20 text-red-500 font-semibold text-xs transition-colors flex flex-col items-center justify-center gap-1 border border-transparent"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="aspect-square rounded-full bg-[#1e1e24] hover:bg-[#25252d] text-2xl font-bold transition-colors active:scale-95 duration-100 flex items-center justify-center border border-gray-800"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="aspect-square rounded-full hover:bg-[#25252d] text-gray-400 active:scale-95 transition-colors flex items-center justify-center border border-transparent"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await publicApi.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setUser(response.data.data);
          setIsAuthenticated(true);
        } else {
          logout();
        }
      } catch (err) {
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = (jwtToken, userData) => {
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    setUser(userData);
    setIsAuthenticated(true);
    setIsUnlocked(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setIsAuthenticated(false);
    setIsUnlocked(false);
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, loading, login, logout, setUser, isUnlocked, setIsUnlocked }}>
      {children}
      {isAuthenticated && user?.settings?.passcodeEnabled && !isUnlocked && (
        <PasscodeLockScreen
          passcodeValue={user.settings.passcodeValue}
          onUnlock={() => setIsUnlocked(true)}
          onLogout={logout}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
