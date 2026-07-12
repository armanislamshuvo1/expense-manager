import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAxiosPublic } from '../hooks/useApi';
import { Lock, Mail, Key, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Forgot Password / Reset Password states
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1 = request reset, 2 = input new password
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const { login } = useAuth();
  const api = useAxiosPublic();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', { email, password });
      if (response.data.success) {
        login(response.data.data.token, response.data.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const isGoogleConfigured = import.meta.env.VITE_GOOGLE_CLIENT_ID && 
    import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'your-google-client-id.apps.googleusercontent.com' &&
    import.meta.env.VITE_GOOGLE_CLIENT_ID !== '';

  const initializeGoogleSignIn = () => {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
      });
      const btnParent = document.getElementById('google-signin-btn');
      if (btnParent) {
        window.google.accounts.id.renderButton(btnParent, {
          theme: 'outline',
          size: 'large',
          width: btnParent.clientWidth || 320,
          text: 'signin_with',
          shape: 'rectangular',
        });
      }
    } catch (err) {
      console.error('Failed to initialize Google Sign-In:', err);
    }
  };

  useEffect(() => {
    if (isGoogleConfigured) {
      if (window.google) {
        initializeGoogleSignIn();
      } else {
        const interval = setInterval(() => {
          if (window.google) {
            initializeGoogleSignIn();
            clearInterval(interval);
          }
        }, 500);
        return () => clearInterval(interval);
      }
    }
  }, [isGoogleConfigured]);

  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      const apiResponse = await api.post('/api/auth/google-login', {
        token: response.credential,
      });
      if (apiResponse.data.success) {
        login(apiResponse.data.data.token, apiResponse.data.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // Simulate Google Sign-In redirect / mock response
      const response = await api.post('/api/auth/google-login', {
        email: 'googleuser@mockauth.com',
        name: 'Alex Mercer'
      });
      if (response.data.success) {
        login(response.data.data.token, response.data.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetMessage('');
    try {
      const response = await api.post('/api/auth/forgot-password', { email: resetEmail });
      if (response.data.success) {
        setResetMessage('Reset code approved. You can now configure your new password.');
        setResetStep(2);
      }
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetMessage('');
    try {
      const response = await api.post('/api/auth/reset-password', {
        email: resetEmail,
        newPassword
      });
      if (response.data.success) {
        setResetMessage('Password reset successfully. You can now close this window and log in.');
        setResetEmail('');
        setNewPassword('');
        setResetStep(1);
        setTimeout(() => {
          document.getElementById('reset_password_modal').close();
        }, 1500);
      }
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300 p-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl border border-base-200">
        <div className="card-body">
          <div className="text-center mb-6">
            <h2 className="card-title justify-center text-3xl font-extrabold text-error">NexusWealth</h2>
            <p className="text-xs text-base-content/60 mt-1 uppercase tracking-widest">Premium Wealth Manager</p>
          </div>

          {error && (
            <div className="alert alert-error text-sm p-3 rounded-lg flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-base-content">Email</span>
              </label>
              <div className="input input-bordered flex items-center gap-2">
                <Mail className="w-4 h-4 opacity-50" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="grow bg-transparent border-none outline-none focus:ring-0 text-base-content"
                  placeholder="yourname@domain.com"
                  required
                />
              </div>
            </div>

            <div className="form-control">
              <div className="flex justify-between items-center">
                <label className="label">
                  <span className="label-text font-semibold text-base-content">Password</span>
                </label>
                <button
                  type="button"
                  onClick={() => document.getElementById('reset_password_modal').showModal()}
                  className="text-xs text-error font-bold hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="input input-bordered flex items-center gap-2 relative">
                <Lock className="w-4 h-4 opacity-50" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="grow bg-transparent border-none outline-none focus:ring-0 text-base-content pr-8"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 hover:opacity-80 transition-opacity focus:outline-none flex items-center"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 opacity-50" /> : <Eye className="w-4 h-4 opacity-50" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-error btn-block mt-4 text-white">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="divider text-xs text-base-content/40">Or Connect With</div>
          
          {/* Social Google Login Button */}
          {isGoogleConfigured ? (
            <div className="w-full flex justify-center mb-2">
              <div id="google-signin-btn" className="w-full"></div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="btn btn-outline btn-block flex items-center gap-2 border-base-300 font-semibold"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.488 0-6.315-2.827-6.315-6.315s2.827-6.315 6.315-6.315c1.583 0 3.024.587 4.14 1.547l3.153-3.153C18.99 1.94 15.828 1 12.24 1 5.866 1 .7 6.166.7 12.54s5.166 11.54 11.54 11.54c6.643 0 11.54-4.673 11.54-11.54 0-.783-.07-1.53-.2-2.255H12.24z"
                />
              </svg>
              Google Identity Login (Demo Mode)
            </button>
          )}

          <div className="divider text-xs text-base-content/40">New User?</div>
          <Link to="/register" className="btn btn-outline btn-block btn-sm">
            Create Premium Account
          </Link>
        </div>
      </div>

      {/* Forgot Password Reset Modal */}
      <dialog id="reset_password_modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box bg-base-100 border border-base-200 text-base-content">
          <h3 className="font-bold text-lg mb-4 text-error">Recover Account Credentials</h3>

          {resetError && <div className="alert alert-error text-xs p-2 mb-3">{resetError}</div>}
          {resetMessage && <div className="alert alert-info text-xs p-2 mb-3">{resetMessage}</div>}

          {resetStep === 1 ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs opacity-75">
                Input your registered email below. We'll verify the account existence and prompt you for credential changes.
              </p>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-base-content">Registered Email</span>
                </label>
                <div className="input input-bordered flex items-center gap-2">
                  <Mail className="w-4 h-4 opacity-50" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="grow bg-transparent border-none outline-none focus:ring-0 text-base-content"
                    placeholder="yourname@domain.com"
                    required
                  />
                </div>
              </div>

              <div className="modal-action flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => document.getElementById('reset_password_modal').close()}
                  className="btn btn-ghost btn-sm"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="btn btn-error btn-sm text-white"
                >
                  Verify Email
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-xs opacity-75">
                Set a secure password that doesn't duplicate previous entries.
              </p>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-base-content">New Secure Password</span>
                </label>
                <div className="input input-bordered flex items-center gap-2 relative">
                  <Key className="w-4 h-4 opacity-50" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="grow bg-transparent border-none outline-none focus:ring-0 text-base-content pr-8"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 hover:opacity-80 transition-opacity focus:outline-none flex items-center"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4 opacity-50" /> : <Eye className="w-4 h-4 opacity-50" />}
                  </button>
                </div>
              </div>

              <div className="modal-action flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetStep(1);
                    document.getElementById('reset_password_modal').close();
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="btn btn-error btn-sm text-white"
                >
                  Reset Password
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </div>
  );
}
