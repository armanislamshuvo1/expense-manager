import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAxiosSecure } from '../hooks/useApi';
import { ArrowLeft, Plus, Trash2, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import { getMergedCategories, setCategoriesCache, queueCategoryOperation, generateUUID } from '../utils/syncManager';

export default function IncomeCategoriesSetting() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💰');
  const [color, setColor] = useState('#10b981');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();

  const fetchCategories = async () => {
    if (navigator.onLine) {
      try {
        const response = await axiosSecure.get('/api/categories');
        if (response.data.success) {
          setCategoriesCache(response.data.data);
        }
      } catch (err) {
        console.warn('Using cached categories offline');
      }
    }
    const merged = getMergedCategories().filter((cat) => cat.type === 'INCOME');
    setCategories(merged);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    setError('');

    try {
      if (editingId) {
        queueCategoryOperation('UPDATE', null, editingId, {
          name,
          emoji,
          color,
          type: 'INCOME'
        });
      } else {
        const clientCatId = generateUUID('cat');
        queueCategoryOperation('CREATE', clientCatId, null, {
          name,
          emoji,
          color,
          type: 'INCOME'
        });
      }

      setEditingId(null);
      setName('');
      setEmoji('💰');
      setColor('#10b981');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      fetchCategories();
      const modal = document.getElementById('category_modal');
      if (modal) modal.close();
    } catch (err) {
      setError('Failed to save category.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (cat) => {
    setEditingId(cat._id || cat.clientCatId);
    setName(cat.name);
    setEmoji(cat.emoji || '💰');
    setColor(cat.color || '#10b981');
    document.getElementById('category_modal').showModal();
  };

  const handleDeleteCategory = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Delete this category?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      background: '#1e1e24',
      color: '#ffffff'
    });
    if (!result.isConfirmed) return;
    try {
      queueCategoryOperation('DELETE', null, id, null);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 text-base-content font-sans pb-10">
      {/* Header */}
      <div className="bg-base-300 p-4 flex items-center gap-4 border-b border-base-content/10">
        <button onClick={() => navigate('/more')} className="btn btn-ghost btn-circle text-base-content/60 hover:text-base-content">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Income Category Setting</h1>
          <p className="text-xs text-base-content/50">Configure your income categories</p>
        </div>
      </div>

      {/* Category List */}
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">Income Categories</span>
          <button
            onClick={() => {
              setEditingId(null);
              setName('');
              setEmoji('💰');
              setColor('#10b981');
              document.getElementById('category_modal').showModal();
            }}
            className="btn btn-xs bg-error hover:bg-error/80 border-none text-white gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add New
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12 text-base-content/50 text-sm">
            No income categories defined.
          </div>
        ) : (
          <div className="bg-base-300 rounded-2xl divide-y divide-base-content/10 overflow-hidden shadow-lg border border-base-content/10">
            {categories.map((cat) => (
              <div key={cat._id} className="flex justify-between items-center p-4 hover:bg-base-200 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-base-200 border border-base-content/10" style={{ borderColor: cat.color }}>
                    {cat.emoji || '💰'}
                  </span>
                  <div>
                    <span className="font-semibold text-sm block">{cat.name}</span>
                    <span className="text-[10px] text-base-content/50" style={{ color: cat.color }}>{cat.color}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditClick(cat)}
                    className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat._id)}
                    className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-error"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <dialog
        id="category_modal"
        className="modal modal-bottom sm:modal-middle"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.currentTarget.close();
          }
        }}
      >
        <div className="modal-box bg-base-300 border border-base-content/10 text-base-content">
          <h3 className="font-bold text-lg mb-4 text-error">
            {editingId ? 'Edit Income Category' : 'Add Income Category'}
          </h3>

          {error && <div className="alert alert-error mb-4 text-xs p-2">{error}</div>}

          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content/60 font-semibold">Category Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input input-bordered bg-base-200 border-base-content/20 text-base-content"
                placeholder="e.g. Freelancing, Investments"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-base-content/60 font-semibold">Emoji / Icon</span>
                </label>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="input input-bordered bg-base-200 border-base-content/20 text-base-content text-center text-xl"
                  placeholder="💰"
                />
              </div>

              <div className="form-control col-span-2">
                <label className="label">
                  <span className="label-text text-base-content/60 font-semibold">Color Tag</span>
                </label>
                <div className="grid grid-cols-6 gap-2 bg-base-200 p-3 rounded-xl border border-base-content/20">
                  {[
                    '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
                    '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#a8a29e'
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                      style={{
                        backgroundColor: c,
                        borderColor: color === c ? '#ffffff' : 'transparent',
                        boxShadow: color === c ? '0 0 8px rgba(255, 255, 255, 0.4)' : 'none',
                      }}
                    >
                      {color === c && <span className="text-white text-xs font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-action flex justify-end gap-2">
              <button
                type="button"
                onClick={() => document.getElementById('category_modal').close()}
                className="btn btn-ghost btn-sm text-base-content/60 hover:text-base-content"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn bg-error hover:bg-error/80 border-none btn-sm text-white"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
