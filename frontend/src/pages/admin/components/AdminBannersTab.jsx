import React, { useState } from 'react';
import { Gift, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';

export default function AdminBannersTab({
  banners = [],
  activeBanner,
  onSaveBanner,
  onDeleteBanner,
  onToggleActive,
  loading
}) {
  const [form, setForm] = useState({
    _id: '',
    promoText: '',
    btnText: 'Claim Now',
    isActive: false
  });
  const [saving, setSaving] = useState(false);
  const safeBanners = Array.isArray(banners) ? banners : [];

  const resetForm = () => {
    setForm({
      _id: '',
      promoText: '',
      btnText: 'Claim Now',
      isActive: false
    });
  };

  const handleEdit = (b) => {
    setForm({
      _id: b._id,
      promoText: b.promoText,
      btnText: b.btnText,
      isActive: b.isActive
    });
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Promotional Banner?',
      text: 'This will remove the banner permanently.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444',
      background: '#1e1e24',
      color: '#ffffff'
    });

    if (result.isConfirmed) {
      await onDeleteBanner(id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveBanner(form);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      {activeBanner && activeBanner.isActive && (
        <div className="rounded-2xl overflow-hidden shadow-lg border border-indigo-500/30">
          <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-teal-700 text-white font-semibold py-2.5 px-4 text-center text-xs sm:text-sm flex items-center justify-center gap-2">
            <Gift className="w-4 h-4 shrink-0 animate-bounce text-[#66fcf1]" />
            <span>[LIVE PREVIEW] {activeBanner.promoText}</span>
            <button className="ml-2 px-3 py-1 bg-white text-[#0b0c10] rounded-full text-[10px] sm:text-xs font-bold hover:bg-gray-100 transition-colors">
              {activeBanner.btnText || 'Claim Now'}
            </button>
          </div>
        </div>
      )}

      {/* Editor Form */}
      <div className="card bg-base-100 shadow-md border border-base-content/10 p-5">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-base-content/10">
          <h3 className="font-bold text-sm">
            {form._id ? 'Edit Promotional Banner' : 'Create Promotional Banner'}
          </h3>
          {form._id && (
            <button onClick={resetForm} className="btn btn-ghost btn-xs text-primary font-bold">
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold">Banner Promotional Message</span>
            </label>
            <textarea
              className="textarea textarea-bordered textarea-sm w-full font-semibold text-xs"
              value={form.promoText}
              onChange={(e) => setForm({ ...form, promoText: e.target.value })}
              placeholder="e.g. Special Launch Offer: Premium features are 100% FREE for the first 100 users!"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold">CTA Button Text</span>
              </label>
              <input
                type="text"
                className="input input-bordered input-sm w-full font-semibold text-xs"
                value={form.btnText}
                onChange={(e) => setForm({ ...form, btnText: e.target.value })}
                placeholder="Claim Now"
                required
              />
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold">Banner Visibility</span>
              </label>
              <select
                className="select select-bordered select-sm w-full font-semibold text-xs"
                value={form.isActive ? 'true' : 'false'}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
              >
                <option value="true">Active (Visible to users)</option>
                <option value="false">Inactive (Hidden)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary btn-sm rounded-xl font-bold gap-2"
          >
            {saving ? <span className="loading loading-spinner loading-xs" /> : <Plus className="w-4 h-4" />}
            {form._id ? 'Update Banner' : 'Create Banner'}
          </button>
        </form>
      </div>

      {/* Banners List */}
      <div className="card bg-base-100 shadow-md border border-base-content/10 overflow-hidden">
        <div className="p-4 border-b border-base-content/10">
          <h3 className="font-bold text-sm">All Promotional Banners</h3>
        </div>

        {safeBanners.length === 0 ? (
          <div className="p-8 text-center text-base-content/50 text-xs">
            No promotional banners created yet.
          </div>
        ) : (
          <div className="divide-y divide-base-content/10">
            {safeBanners.map((b) => (
              <div key={b._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-base-200/40 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-sm text-[10px] font-bold ${b.isActive ? 'badge-success text-white' : 'badge-ghost'}`}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="font-bold text-xs">{b.promoText}</span>
                  </div>
                  <div className="text-[11px] text-base-content/60 flex items-center gap-3">
                    <span>Button: <strong className="text-base-content/80">{b.btnText}</strong></span>
                    <span>Created: {new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    onClick={() => onToggleActive(b)}
                    className="btn btn-ghost btn-xs text-base-content/70"
                    title={b.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {b.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleEdit(b)}
                    className="btn btn-ghost btn-xs text-primary"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(b._id)}
                    className="btn btn-ghost btn-xs text-error"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
