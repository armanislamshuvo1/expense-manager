import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { publicApi } from '../utils/apiConfig';
import { Lock, Delete, LogOut } from 'lucide-react';
import { setCategoriesCache, setAccountsCache, setCache, triggerSync } from '../utils/syncManager';

const cacheInitialUserData = async (authToken, userData) => {
  if (!navigator.onLine || !authToken) return;
  try {
    const uId = userData?._id || userData?.id;
    const headers = { Authorization: `Bearer ${authToken}` };
    const [catRes, accRes, txRes] = await Promise.allSettled([
      publicApi.get('/api/categories', { headers }),
      publicApi.get('/api/accounts', { headers }),
      publicApi.get('/api/transactions', { headers })
    ]);
    if (catRes.status === 'fulfilled' && catRes.value.data?.success) {
      setCategoriesCache(catRes.value.data.data, uId);
    }
    if (accRes.status === 'fulfilled' && accRes.value.data?.success) {
      setAccountsCache(accRes.value.data.data, uId);
    }
    if (txRes.status === 'fulfilled' && txRes.value.data?.success) {
      setCache(txRes.value.data.data, uId);
    }
    triggerSync();
  } catch (e) {
    console.warn('Initial data caching warning:', e);
  }
};

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
      if (String(newCode) === String(passcodeValue)) {
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
    <div className="fixed inset-0 bg-base-300/80 backdrop-blur-md z-[9999] flex items-center justify-center sm:p-4 text-base-content font-sans">
      <div className="w-full h-full sm:h-auto sm:max-w-md bg-base-300 sm:bg-base-200 sm:rounded-3xl sm:shadow-2xl sm:border sm:border-base-content/10 flex flex-col items-center justify-between py-16 px-6 sm:py-12 sm:px-8 min-h-screen sm:min-h-[580px]">
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="bg-error/10 p-4 rounded-full border border-error/20 animate-pulse">
            <Lock className="w-8 h-8 text-error" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-wide">NexusWealth</h2>
            <p className={`text-xs mt-2 transition-colors ${error ? 'text-error font-semibold' : 'text-base-content/60'}`}>
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
                    ? 'bg-error border-error scale-110 shadow-[0_0_8px_rgba(240,84,84,0.6)]'
                    : 'border-base-content/20 bg-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Keypad */}
        <div className="w-full max-w-xs space-y-4 mb-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(String(num))}
                className="aspect-square rounded-full bg-base-200 hover:bg-base-100 active:bg-base-300 text-2xl font-bold transition-all active:scale-95 duration-100 flex items-center justify-center border border-base-content/10"
              >
                {num}
              </button>
            ))}
            <button
              onClick={onLogout}
              className="aspect-square rounded-full hover:bg-error/10 text-error font-semibold text-xs transition-colors flex flex-col items-center justify-center gap-1 border border-transparent"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="aspect-square rounded-full bg-base-200 hover:bg-base-100 active:bg-base-300 text-2xl font-bold transition-all active:scale-95 duration-100 flex items-center justify-center border border-base-content/10"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="aspect-square rounded-full hover:bg-base-100 active:bg-base-200 text-base-content/60 active:scale-95 transition-colors flex items-center justify-center border border-transparent"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>
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
  const location = useLocation();

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
          localStorage.setItem('user_cache', JSON.stringify(response.data.data));
          setIsAuthenticated(true);
          cacheInitialUserData(token, response.data.data);
        } else {
          logout();
        }
      } catch (err) {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          try {
            const refreshRes = await publicApi.post('/api/auth/refresh', { token });
            if (refreshRes.data?.success) {
              const newToken = refreshRes.data.data.token;
              updateToken(newToken);
              if (refreshRes.data.data.user) {
                setUser(refreshRes.data.data.user);
                localStorage.setItem('user_cache', JSON.stringify(refreshRes.data.data.user));
              }
              setIsAuthenticated(true);
              return;
            }
          } catch (rErr) {
            logout();
            return;
          }
          logout();
        } else {
          // Offline / Network Error: Restore session from cache
          const cachedUserStr = localStorage.getItem('user_cache');
          if (cachedUserStr) {
            try {
              const cachedUser = JSON.parse(cachedUserStr);
              setUser(cachedUser);
            } catch (e) {}
          }
          setIsAuthenticated(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = (jwtToken, userData) => {
    localStorage.setItem('token', jwtToken);
    if (userData) {
      localStorage.setItem('user_cache', JSON.stringify(userData));
    }
    setToken(jwtToken);
    setUser(userData);
    setIsAuthenticated(true);
    setIsUnlocked(true); // Start unlocked so user doesn't have to enter passcode immediately after login
    setLoading(false);
    cacheInitialUserData(jwtToken, userData);
  };

  const updateToken = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_cache');
    localStorage.removeItem('tx_cache');
    localStorage.removeItem('tx_sync_queue');
    localStorage.removeItem('accounts_cache');
    localStorage.removeItem('categories_cache');
    sessionStorage.clear();
    setToken('');
    setUser(null);
    setIsAuthenticated(false);
    setIsUnlocked(false);
  };

  // Inactivity auto-lock timer: lock after 1 minute (60,000 ms) of inactivity
  useEffect(() => {
    if (!isAuthenticated || !user?.settings?.passcodeEnabled || !isUnlocked) return;

    let timeoutId;
    let lastReset = Date.now();

    const resetTimer = () => {
      // Throttle event handler to prevent excessive call stack updates
      const now = Date.now();
      if (now - lastReset < 1000) return; 
      lastReset = now;

      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsUnlocked(false);
      }, 60000); // 1 minute
    };

    // Initial trigger
    timeoutId = setTimeout(() => {
      setIsUnlocked(false);
    }, 60000);

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, user?.settings?.passcodeEnabled, isUnlocked]);



  const publicPaths = ['/', '/about', '/how-it-works', '/login', '/register'];
  const isPublicRoute = publicPaths.includes(location.pathname) || location.pathname.startsWith('/shared/');
  const isLocked = isAuthenticated && user?.settings?.passcodeEnabled && !isUnlocked && !isPublicRoute;

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, loading, login, logout, updateToken, setUser, isUnlocked, setIsUnlocked }}>
      {isLocked ? (
        <PasscodeLockScreen
          passcodeValue={user.settings.passcodeValue}
          onUnlock={() => setIsUnlocked(true)}
          onLogout={logout}
        />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

