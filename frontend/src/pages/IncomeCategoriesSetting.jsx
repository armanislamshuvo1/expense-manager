import React, { useEffect, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAxiosSecure } from '../hooks/useApi';
import { ArrowLeft, Plus, Trash2, Edit2, ListFilter, GripVertical, CornerDownRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import { getMergedCategories, setCategoriesCache, queueCategoryOperation, generateUUID } from '../utils/syncManager';

export default function IncomeCategoriesSetting() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💰');
  const [color, setColor] = useState('#10b981');
  const [parentId, setParentId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const queryClient = useQueryClient();
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();

  const loadFromLocal = () => {
    const merged = getMergedCategories().filter((cat) => cat.type === 'INCOME');
    setCategories(merged);
  };

  const fetchCategories = async () => {
    loadFromLocal();
    if (navigator.onLine) {
      try {
        const response = await axiosSecure.get('/api/categories');
        if (response.data.success) {
          setCategoriesCache(response.data.data);
          loadFromLocal();
        }
      } catch (_err) {
        console.warn('Using cached categories offline');
      }
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const topLevelCategories = useMemo(() => {
    return categories.filter(c => !c.parentId && (c._id || c.clientCatId) !== editingId);
  }, [categories, editingId]);

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        emoji: emoji || '💰',
        color: color || '#10b981',
        parentId: parentId || null,
        type: 'INCOME'
      };

      if (editingId) {
        queueCategoryOperation('UPDATE', null, editingId, payload);
      } else {
        const clientCatId = generateUUID('cat');
        queueCategoryOperation('CREATE', clientCatId, null, payload);
      }

      // Instant local reflection
      loadFromLocal();
      queryClient.invalidateQueries({ queryKey: ['categories'] });

      setEditingId(null);
      setName('');
      setEmoji('💰');
      setColor('#10b981');
      setParentId('');
      const modal = document.getElementById('category_modal');
      if (modal) modal.close();
    } catch (_err) {
      setError('Failed to save category.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (cat) => {
    const id = cat._id || cat.clientCatId;
    setEditingId(id);
    setName(cat.name);
    setEmoji(cat.emoji || '💰');
    setColor(cat.color || '#10b981');
    const pId = typeof cat.parentId === 'object' && cat.parentId ? cat.parentId._id : cat.parentId;
    setParentId(pId || '');
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
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      background: '#1e1e24',
      color: '#ffffff'
    });
    if (!result.isConfirmed) return;
    try {
      queueCategoryOperation('DELETE', null, id, null);
      loadFromLocal();
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and drop reordering handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const reordered = [...categories];
    const draggedItem = reordered[draggedIndex];
    reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setCategories(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setCategoriesCache(categories);
  };

  // Group categories so subcategories nest under their parents
  const structuredCategories = useMemo(() => {
    const parents = categories.filter(c => !c.parentId);
    const result = [];
    parents.forEach(p => {
      result.push({ ...p, isParent: true });
      const pId = String(p._id || p.clientCatId);
      const subs = categories.filter(c => {
        if (!c.parentId) return false;
        const subPid = typeof c.parentId === 'object' ? String(c.parentId._id || '') : String(c.parentId);
        return subPid === pId;
      });
      subs.forEach(s => result.push({ ...s, isSub: true, parentName: p.name }));
    });
    // Add any remaining unparented or orphaned categories
    categories.forEach(c => {
      const cId = String(c._id || c.clientCatId);
      if (!result.some(r => String(r._id || r.clientCatId) === cId)) {
        result.push(c);
      }
    });
    return result;
  }, [categories]);

  return (
    <div className="min-h-screen bg-base-200 text-base-content font-sans pb-10">
      {/* Header */}
      <div className="bg-base-300 p-4 flex items-center gap-4 border-b border-base-content/10">
        <button onClick={() => navigate('/more')} className="btn btn-ghost btn-circle text-base-content/60 hover:text-base-content">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Income Category Setting</h1>
          <p className="text-xs text-base-content/50">Manage, nest subcategories & drag to reorder</p>
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
              setParentId('');
              document.getElementById('category_modal').showModal();
            }}
            className="btn btn-xs bg-emerald-500 hover:bg-emerald-600 border-none text-white gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add New
          </button>
        </div>

        {structuredCategories.length === 0 ? (
          <div className="text-center py-12 text-base-content/50 text-sm">
            No income categories defined.
          </div>
        ) : (
          <div className="bg-base-300 rounded-2xl divide-y divide-base-content/10 overflow-hidden shadow-lg border border-base-content/10">
            {structuredCategories.map((cat, idx) => (
              <div 
                key={cat._id || cat.clientCatId} 
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`flex justify-between items-center p-3.5 transition-colors cursor-move select-none ${
                  cat.isSub ? 'bg-base-200/50 pl-7 border-l-4 border-emerald-500/40' : 'hover:bg-base-200'
                } ${draggedIndex === idx ? 'opacity-50 scale-[0.98]' : ''}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="cursor-grab active:cursor-grabbing text-base-content/30 hover:text-base-content/70">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  {cat.isSub && <CornerDownRight className="w-3.5 h-3.5 text-base-content/40 -mr-1 shrink-0" />}
                  <span className="text-xl p-1.5 rounded-xl bg-base-200 border border-base-content/10 shrink-0" style={{ borderColor: cat.color }}>
                    {cat.emoji || '💰'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{cat.name}</span>
                      {cat.isSub && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-base-100 text-base-content/60 border border-base-content/10">
                          Subcategory
                        </span>
                      )}
                    </div>
                    {cat.parentName && (
                      <span className="text-[10px] text-base-content/50 block truncate">
                        Parent: {cat.parentName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => navigate('/transactions', { state: { filterCategory: cat._id || cat.clientCatId || cat.name, filterType: 'INCOME' } })}
                    className="btn btn-ghost btn-xs text-xs gap-1 text-base-content/60 hover:text-emerald-500 cursor-pointer"
                    title="View category transactions"
                  >
                    <ListFilter className="w-4 h-4" />
                    <span className="hidden sm:inline text-[11px]">Txns</span>
                  </button>
                  <button
                    onClick={() => handleEditClick(cat)}
                    className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content"
                    title="Edit category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat._id || cat.clientCatId)}
                    className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-error"
                    title="Delete category"
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
          <h3 className="font-bold text-lg mb-4 text-emerald-500">
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
                placeholder="e.g. Salary, Dividend, Bonus"
                required
              />
            </div>

            {/* Parent Category Selection for Subcategories */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content/60 font-semibold">Parent Category (Optional)</span>
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="select select-bordered bg-base-200 border-base-content/20 text-base-content text-xs"
              >
                <option value="">None (Top-Level Category)</option>
                {topLevelCategories.map((c) => (
                  <option key={c._id || c.clientCatId} value={c._id || c.clientCatId}>
                    {c.emoji || '🏷️'} {c.name}
                  </option>
                ))}
              </select>
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
                    '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
                    '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#a8a29e'
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                      style={{
                        backgroundColor: c,
                        borderColor: color === c ? '#ffffff' : 'transparent',
                        boxShadow: color === c ? '0 0 0 2px #10b981' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-action flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => document.getElementById('category_modal').close()}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn bg-emerald-500 hover:bg-emerald-600 btn-sm text-white border-none"
              >
                {loading ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
