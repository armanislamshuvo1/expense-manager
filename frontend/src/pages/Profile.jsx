import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAxiosSecure } from '../hooks/useApi';
import { BottomNav } from '../components/BottomNav';
import { ArrowLeft, Calendar, ShieldCheck, Key, Lock } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const fetchProfile = async () => {
    try {
      const response = await axiosSecure.get('/api/user/profile');
      if (response.data.success) {
        setProfile(response.data.data);
      }
    } catch (_err) {
      setError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const hasPassword = profile?.hasPassword;

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPwError('');
    setPwSuccess('');
    setPwModalOpen(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }

    setPwLoading(true);
    try {
      const body = { newPassword };
      if (hasPassword) {
        if (!currentPassword) {
          setPwError('Current password is required.');
          setPwLoading(false);
          return;
        }
        body.currentPassword = currentPassword;
      }

      const response = await axiosSecure.post('/api/user/change-password', body);
      if (response.data.success) {
        setPwSuccess(response.data.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPwModalOpen(false), 1500);
      }
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPwLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  const initial = (profile?.name || user?.name || '?').charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 text-base-content pb-24 font-sans flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-error" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 text-base-content pb-24 font-sans">
      <div className="bg-base-300 p-4 flex items-center gap-4 border-b border-base-content/10">
        <button onClick={() => navigate('/more')} className="btn btn-ghost btn-circle text-base-content/60 hover:text-base-content">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Profile</h1>
          <p className="text-xs text-base-content/50">Your account details</p>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 alert alert-error text-xs p-3 rounded-xl text-white bg-error border-none">
          {error}
        </div>
      )}

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-base-300 rounded-2xl border border-base-content/10 p-6 shadow-lg flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-error/20 border-2 border-error flex items-center justify-center mb-4">
            <span className="text-3xl font-bold text-error">{initial}</span>
          </div>
          <h2 className="text-xl font-bold">{profile?.name || user?.name}</h2>
          <p className="text-sm text-base-content/60">{profile?.email || user?.email}</p>

          <div className="flex items-center gap-2 mt-3">
            <span className={`badge badge-sm ${profile?.provider === 'google' ? 'badge-primary' : 'badge-ghost'} text-[10px]`}>
              {profile?.provider === 'google' ? 'Signed in with Google' : 'Password login'}
            </span>
          </div>
        </div>

        <div className="bg-base-300 rounded-2xl border border-base-content/10 divide-y divide-base-content/10 overflow-hidden shadow-lg">
          <div className="flex items-center gap-3 p-4">
            <Calendar className="w-5 h-5 text-base-content/50" />
            <div>
              <p className="text-xs text-base-content/50">Joined</p>
              <p className="text-sm font-semibold">{formatDate(profile?.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4">
            <ShieldCheck className="w-5 h-5 text-base-content/50" />
            <div>
              <p className="text-xs text-base-content/50">Account Status</p>
              <p className="text-sm font-semibold capitalize">{profile?.status || 'ACTIVE'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4">
            <Key className="w-5 h-5 text-base-content/50" />
            <div>
              <p className="text-xs text-base-content/50">Password</p>
              <p className="text-sm font-semibold">{hasPassword ? 'Set' : 'Not set'}</p>
            </div>
          </div>
        </div>

        <button
          onClick={openPasswordModal}
          className="btn bg-error hover:bg-error/80 border-none text-white btn-block"
        >
          <Lock className="w-4 h-4" />
          {hasPassword ? 'Change Password' : 'Set Password'}
        </button>

        <button
          onClick={logout}
          className="btn btn-outline btn-block border-base-content/20 text-base-content/60 hover:bg-error hover:text-white hover:border-error"
        >
          Sign Out
        </button>
      </div>

      {pwModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-300 border border-base-content/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="text-md font-bold border-b border-base-content/10 pb-2">
              {hasPassword ? 'Change Password' : 'Set Password'}
            </h3>

            {pwError && (
              <div className="alert alert-error text-xs p-2 text-white bg-error border-none rounded-xl">{pwError}</div>
            )}
            {pwSuccess && (
              <div className="alert alert-success text-xs p-2 text-white bg-success border-none rounded-xl">{pwSuccess}</div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              {hasPassword && (
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-xs text-base-content/60">Current Password</span>
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input input-bordered bg-base-200 border-base-content/20 text-base-content w-full"
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs text-base-content/60">New Password</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input input-bordered bg-base-200 border-base-content/20 text-base-content w-full"
                  placeholder="Min. 6 characters"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs text-base-content/60">Confirm New Password</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input input-bordered bg-base-200 border-base-content/20 text-base-content w-full"
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-base-content/10">
                <button
                  type="button"
                  onClick={() => setPwModalOpen(false)}
                  className="btn btn-sm btn-ghost text-base-content/60 hover:text-base-content"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="btn btn-sm bg-error hover:bg-error/80 text-white border-none"
                >
                  {pwLoading ? <span className="loading loading-spinner loading-xs" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
