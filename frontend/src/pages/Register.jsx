import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAxiosPublic } from '../hooks/useApi';
import { Mail, Lock, User } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const api = useAxiosPublic();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/register', {
        name,
        email,
        password,
        baseCurrency: 'USD' // Default to USD per user requests
      });
      if (response.data.success) {
        login(response.data.data.token, response.data.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300 p-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl border border-base-200">
        <div className="card-body">
          <div className="text-center mb-6">
            <h2 className="card-title justify-center text-3xl font-extrabold text-error">Antigravity</h2>
            <p className="text-xs text-base-content/60 mt-1 uppercase tracking-widest">Premium Expense Manager</p>
          </div>

          {error && (
            <div className="alert alert-error text-sm p-3 rounded-lg flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-base-content">Full Name</span>
              </label>
              <div className="input input-bordered flex items-center gap-2">
                <User className="w-4 h-4 opacity-50" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="grow bg-transparent border-none outline-none focus:ring-0 text-base-content"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

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
              <label className="label">
                <span className="label-text font-semibold text-base-content">Password</span>
              </label>
              <div className="input input-bordered flex items-center gap-2">
                <Lock className="w-4 h-4 opacity-50" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="grow bg-transparent border-none outline-none focus:ring-0 text-base-content"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-error btn-block mt-4 text-white">
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="divider text-xs text-base-content/40">Already registered?</div>
          <Link to="/login" className="btn btn-outline btn-block btn-sm">
            Sign In Instead
          </Link>
        </div>
      </div>
    </div>
  );
}
