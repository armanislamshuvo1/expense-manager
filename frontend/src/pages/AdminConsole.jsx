import React, { useEffect, useState } from 'react';
import { useAxiosSecure } from '../hooks/useApi';
import { BottomNav } from '../components/BottomNav';
import { ShieldAlert, ArrowLeft, Plus, Edit2, Trash2, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminConsole() {
  const [users, setUsers] = useState([]);
  const [banners, setBanners] = useState([]);
  const [activeBanner, setActiveBanner] = useState(null);
  
  const [deleteBannerId, setDeleteBannerId] = useState(null);
  
  // Banner Form State
  const [bannerForm, setBannerForm] = useState({
    _id: '',
    promoText: '',
    btnText: 'Claim Now',
    isActive: false
  });
  
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerError, setBannerError] = useState('');
  
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const response = await axiosSecure.get('/api/admin/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBanners = async () => {
    try {
      const response = await axiosSecure.get('/api/admin/promo-banners');
      if (response.data.success) {
        setBanners(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveBanner = async () => {
    try {
      const response = await axiosSecure.get('/api/admin/promo-banner');
      if (response.data.success) {
        setActiveBanner(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBanners();
    fetchActiveBanner();
  }, []);

  const handleSaveBanner = async (e) => {
    e.preventDefault();
    setBannerLoading(true);
    setBannerMessage('');
    setBannerError('');
    try {
      let response;
      if (bannerForm._id) {
        // Update existing
        response = await axiosSecure.put(`/api/admin/promo-banners/${bannerForm._id}`, {
          promoText: bannerForm.promoText,
          btnText: bannerForm.btnText,
          isActive: bannerForm.isActive
        });
      } else {
        // Create new
        response = await axiosSecure.post('/api/admin/promo-banners', {
          promoText: bannerForm.promoText,
          btnText: bannerForm.btnText,
          isActive: bannerForm.isActive
        });
      }

      if (response.data.success) {
        setBannerMessage(bannerForm._id ? 'Banner updated successfully!' : 'Banner created successfully!');
        resetForm();
        fetchBanners();
        fetchActiveBanner();
      }
    } catch (err) {
      setBannerError(err.response?.data?.message || 'Failed to save banner.');
    } finally {
      setBannerLoading(false);
    }
  };

  const handleEdit = (b) => {
    setBannerForm({
      _id: b._id,
      promoText: b.promoText,
      btnText: b.btnText,
      isActive: b.isActive
    });
    setBannerMessage('');
    setBannerError('');
  };

  const handleDelete = (id) => {
    setDeleteBannerId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteBannerId) return;
    try {
      const response = await axiosSecure.delete(`/api/admin/promo-banners/${deleteBannerId}`);
      if (response.data.success) {
        fetchBanners();
        fetchActiveBanner();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteBannerId(null);
    }
  };

  const handleToggleActive = async (b) => {
    try {
      const response = await axiosSecure.put(`/api/admin/promo-banners/${b._id}`, {
        ...b,
        isActive: !b.isActive
      });
      if (response.data.success) {
        fetchBanners();
        fetchActiveBanner();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setBannerForm({
      _id: '',
      promoText: '',
      btnText: 'Claim Now',
      isActive: false
    });
  };

  const handleStatusChange = async (id, status) => {
    try {
      const response = await axiosSecure.put(`/api/admin/users/${id}/status`, { status });
      if (response.data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-base-300 pb-24 text-base-content font-sans">
      
      {/* Live Preview of active banner */}
      {activeBanner && activeBanner.isActive && activeBanner.promoText && activeBanner.promoText.trim() !== '' && (
        <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-teal-700 text-white font-semibold py-2.5 px-4 text-center text-xs sm:text-sm flex items-center justify-center gap-2 relative z-50 shadow-md">
          <Gift className="w-4 h-4 shrink-0 animate-bounce text-[#66fcf1]" />
          <span>[LIVE PREVIEW] {activeBanner.promoText}</span>
          <button className="ml-2 px-3 py-1 bg-white text-[#0b0c10] rounded-full text-[10px] sm:text-xs font-bold hover:bg-gray-100 transition-colors cursor-pointer">
            {activeBanner.btnText || 'Claim Now'}
          </button>
        </div>
      )}

      <div className="bg-base-200 p-6 rounded-b-3xl shadow-lg border-b border-base-200 flex items-center gap-4">
        <button onClick={() => navigate('/more')} className="btn btn-ghost btn-circle btn-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-error flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> Admin Portal
          </h1>
          <p className="text-[10px] opacity-60">Zero-Trust Account Control & Promotional Banners</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* Promotional Banner Editor Form */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="card-title text-sm font-bold opacity-75">
                {bannerForm._id ? 'Edit Promotional Banner' : 'Create Promotional Banner'}
              </h2>
              {bannerForm._id && (
                <button onClick={resetForm} className="btn btn-ghost btn-xs font-bold text-primary">
                  Cancel Edit
                </button>
              )}
            </div>
            {bannerMessage && <div className="alert alert-success text-xs py-2 mb-2 font-semibold">{bannerMessage}</div>}
            {bannerError && <div className="alert alert-error text-xs py-2 mb-2 font-semibold">{bannerError}</div>}
            <form onSubmit={handleSaveBanner} className="space-y-3">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs">Banner Promotional Text</span>
                </label>
                <textarea
                  className="textarea textarea-bordered textarea-sm w-full font-semibold text-xs"
                  value={bannerForm.promoText}
                  onChange={(e) => setBannerForm({ ...bannerForm, promoText: e.target.value })}
                  placeholder="Enter banner promotional text..."
                  rows={2}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-xs">CTA Button Text</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm w-full font-semibold text-xs"
                    value={bannerForm.btnText}
                    onChange={(e) => setBannerForm({ ...bannerForm, btnText: e.target.value })}
                    placeholder="Claim Now"
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-xs">Banner Visibility</span>
                  </label>
                  <select
                    className="select select-bordered select-sm w-full font-semibold text-xs"
                    value={bannerForm.isActive ? 'true' : 'false'}
                    onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.value === 'true' })}
                  >
                    <option value="true">Active (Visible)</option>
                    <option value="false">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={bannerLoading}
                className="btn btn-primary btn-sm w-full font-bold mt-2 text-xs"
              >
                {bannerLoading ? 'Saving...' : (bannerForm._id ? 'Update Banner' : 'Create Banner')}
              </button>
            </form>
          </div>
        </div>

        {/* Promotional Banners List (CRUD) */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <h2 className="card-title text-sm font-bold opacity-75 mb-2">Banner History & List</h2>
            <div className="divide-y divide-base-200">
              {banners.length === 0 ? (
                <div className="text-center text-xs opacity-50 py-4">No banners configured yet.</div>
              ) : (
                banners.map((b) => (
                  <div key={b._id} className="py-3 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold">{b.promoText}</span>
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] bg-base-200 px-2 py-0.5 rounded font-mono">Button: {b.btnText}</span>
                          <span className={`badge badge-xs font-bold text-[8px] ${b.isActive ? 'badge-success' : 'badge-ghost'}`}>
                            {b.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={() => handleToggleActive(b)}
                          className={`btn btn-xs ${b.isActive ? 'btn-outline btn-warning' : 'btn-success'} font-bold text-[9px]`}
                        >
                          {b.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleEdit(b)} className="btn btn-xs btn-ghost btn-circle">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(b._id)} className="btn btn-xs btn-ghost btn-circle text-error">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* User Account Controls */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <h2 className="card-title text-sm font-bold opacity-75 mb-4">Manage User Accounts</h2>
            <div className="divide-y divide-base-200">
              {users.map((u) => (
                <div key={u._id} className="flex justify-between items-center py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{u.name}</span>
                    <span className="text-[10px] opacity-50">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[10px] font-bold ${
                      u.status === 'ACTIVE' ? 'badge-primary' : 'badge-error'
                    }`}>
                      {u.status}
                    </span>
                    <select
                      value={u.status}
                      onChange={(e) => handleStatusChange(u._id, e.target.value)}
                      className="select select-xs select-bordered font-semibold text-[10px]"
                    >
                      <option value="ACTIVE">Activate</option>
                      <option value="SUSPENDED">Suspend</option>
                      <option value="BANNED">Ban</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Custom Confirmation Modal */}
      {deleteBannerId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
          <div className="bg-base-200 border border-base-content/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scaleIn">
            <div className="flex items-center gap-4 text-error mb-4">
              <div className="p-3 bg-error/10 rounded-full">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-base-content">Delete Banner</h3>
                <p className="text-xs text-base-content/60">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-base-content/80 mb-6">
              Are you sure you want to delete this promotional banner?
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteBannerId(null)}
                className="btn btn-ghost btn-sm text-xs font-semibold px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn btn-error btn-sm text-xs font-bold text-white px-4 shadow-md hover:shadow-lg transition-all"
              >
                Delete Banner
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
