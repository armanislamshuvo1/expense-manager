import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { publicApi } from '../utils/apiConfig';
import { Lock, Delete, LogOut, Fingerprint } from 'lucide-react';
import { setCategoriesCache, setAccountsCache, setCache, triggerSync } from '../utils/syncManager';
import FingerprintModal from '../components/auth/FingerprintModal';

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

function PasscodeLockScreen({ passcodeValue, passcodeEnabled, userEmail, onUnlock, onLogout }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [fingerprintModalOpen, setFingerprintModalOpen] = useState(false);

  const hasPinConfigured = Boolean(passcodeEnabled && passcodeValue);

  const handleKeyPress = (num) => {
    if (!hasPinConfigured) {
      setError(true);
      setErrorText('PIN not set. Tap the fingerprint icon below to unlock.');
      return;
    }
    if (code.length >= 4) return;
    const newCode = code + num;
    setCode(newCode);
    setError(false);
    setErrorText('');

    if (newCode.length === 4) {
      if (String(newCode) === String(passcodeValue)) {
        onUnlock();
      } else {
        setTimeout(() => {
          setError(true);
          setErrorText('Incorrect passcode. Try again.');
          setCode('');
        }, 200);
      }
    }
  };

  const handleDelete = () => {
    setCode(code.slice(0, -1));
    setError(false);
    setErrorText('');
  };

  const handleOpenFingerprintModal = () => {
    setError(false);
    setErrorText('');
    setFingerprintModalOpen(true);
  };

  return (
    <div className="fixed inset-0 bg-base-300/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 text-base-content font-sans">
      <div className="w-full max-w-sm bg-base-200/90 rounded-3xl shadow-2xl border border-base-content/10 flex flex-col items-center justify-between py-12 px-8 min-h-[560px]">
        
        {/* Shield Header */}
        <div className="flex flex-col items-center gap-3 mt-4">
          <div className="w-16 h-16 rounded-3xl bg-primary-app/10 border border-primary-app/30 flex items-center justify-center ring-8 ring-primary-app/5 shadow-xl shadow-cyan-500/10">
            <Lock className="w-8 h-8 text-primary-app stroke-[2.2]" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-black tracking-wide text-base-content">NexusWealth Security</h2>
            <p className={`text-xs mt-1 transition-colors ${error ? 'text-danger-app font-bold' : 'text-base-content/60'}`}>
              {error
                ? (errorText || 'Incorrect passcode. Try again.')
                : hasPinConfigured
                  ? 'Enter 4-digit PIN or tap Fingerprint to unlock'
                  : 'Tap the Fingerprint icon below to unlock'}
            </p>
          </div>

          {/* Passcode dots */}
          <div className="flex gap-5 mt-6">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  error 
                    ? 'bg-danger-app border-danger-app scale-110 shadow-[0_0_10px_rgba(239,68,68,0.7)]'
                    : index < code.length
                      ? 'bg-primary-app border-primary-app scale-110 shadow-[0_0_12px_rgba(6,182,212,0.7)]'
                      : 'border-base-content/25 bg-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 3x4 Tactile Keypad */}
        <div className="w-full max-w-xs space-y-4 mb-2">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(String(num))}
                className="aspect-square rounded-2xl bg-base-100/80 hover:bg-base-100 active:bg-primary-app/20 active:scale-95 text-2xl font-black text-base-content transition-all border border-base-content/10 shadow-sm flex items-center justify-center cursor-pointer"
              >
                {num}
              </button>
            ))}

            {/* Key 10: Biometric Trigger (Opens Fingerprint Modal on Click) */}
            <button
              type="button"
              onClick={handleOpenFingerprintModal}
              className="aspect-square rounded-2xl bg-secondary-app/10 hover:bg-secondary-app/20 border border-secondary-app/30 text-secondary-app transition-all active:scale-90 flex flex-col items-center justify-center shadow-sm cursor-pointer"
              title="Unlock with Fingerprint"
            >
              <Fingerprint className="w-7 h-7" />
            </button>

            {/* Key 11: 0 */}
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="aspect-square rounded-2xl bg-base-100/80 hover:bg-base-100 active:bg-primary-app/20 active:scale-95 text-2xl font-black text-base-content transition-all border border-base-content/10 shadow-sm flex items-center justify-center cursor-pointer"
            >
              0
            </button>

            {/* Key 12: Delete */}
            <button
              type="button"
              onClick={handleDelete}
              className="aspect-square rounded-2xl bg-base-100/50 hover:bg-base-100 active:scale-90 text-base-content/60 transition-all flex items-center justify-center border border-base-content/5 cursor-pointer"
              title="Delete Digit"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Bottom Subdued Logout */}
        <button
          type="button"
          onClick={onLogout}
          className="text-xs font-bold text-danger-app hover:underline flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch Account / Sign Out</span>
        </button>
      </div>

      {/* Click-Triggered Fingerprint Verification Modal */}
      <FingerprintModal
        isOpen={fingerprintModalOpen}
        onClose={() => setFingerprintModalOpen(false)}
        onSuccess={() => {
          setFingerprintModalOpen(false);
          onUnlock();
        }}
        title="Fingerprint Unlock"
        subtitle="Touch the fingerprint sensor to unlock NexusWealth"
        email={userEmail}
      />
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
          const fetchedUser = response.data.data;
          const localBioPref = localStorage.getItem('nexus_biometric_lock_enabled');
          if (fetchedUser?.settings && fetchedUser.settings.biometricEnabled === undefined && localBioPref !== null) {
            fetchedUser.settings.biometricEnabled = localBioPref === 'true';
          }
          setUser(fetchedUser);
          localStorage.setItem('user_cache', JSON.stringify(fetchedUser));
          setIsAuthenticated(true);
          cacheInitialUserData(token, fetchedUser);
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
          } catch (_rErr) {
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
            } catch (_e) {}
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

  const isLockFeatureEnabled = Boolean(
    user?.settings?.passcodeEnabled || user?.settings?.biometricEnabled
  );

  // Inactivity auto-lock timer: lock after 1 minute (60,000 ms) of inactivity
  useEffect(() => {
    if (!isAuthenticated || !isLockFeatureEnabled || !isUnlocked) return;

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
  }, [isAuthenticated, isLockFeatureEnabled, isUnlocked]);

  const publicPaths = ['/', '/about', '/how-it-works', '/login', '/register'];
  const isPublicRoute = publicPaths.includes(location.pathname) || location.pathname.startsWith('/shared/');
  const isLocked = isAuthenticated && isLockFeatureEnabled && !isUnlocked && !isPublicRoute;

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, loading, login, logout, updateToken, setUser, isUnlocked, setIsUnlocked }}>
      {isLocked ? (
        <PasscodeLockScreen
          passcodeValue={user?.settings?.passcodeValue}
          passcodeEnabled={!!user?.settings?.passcodeEnabled}
          userEmail={user?.email}
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
