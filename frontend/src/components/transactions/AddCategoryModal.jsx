import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export default function AddCategoryModal({
  isOpen,
  onClose,
  handleCreateCategory,
  categories = [],
  user = null
}) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🏷️');
  const [selectedParentId, setSelectedParentId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await handleCreateCategory(newCatName.trim(), newCatEmoji, selectedParentId || null);
      onClose();
      setNewCatName('');
      setNewCatEmoji('🏷️');
      setSelectedParentId('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-base-200 border border-base-content/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scaleIn text-base-content">
        <h3 className="text-base font-bold text-base-content mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> Create New Category
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs">Category Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered input-sm w-full text-xs font-semibold"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Groceries, Rent, Salary..."
              required
              autoFocus
            />
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs">Emoji Icon</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                maxLength={2}
                className="input input-bordered input-sm w-12 text-center text-sm font-bold p-0"
                value={newCatEmoji}
                onChange={(e) => setNewCatEmoji(e.target.value)}
              />
              <span className="text-[10px] opacity-60 self-center">
                Type an emoji or select one below
              </span>
            </div>
            <div className="grid grid-cols-6 gap-2 bg-base-300 p-2.5 rounded-xl max-h-24 overflow-y-auto">
              {['🏷️', '🍔', '🚗', '🛍️', '💰', '📈', '🏠', '🎮', '💡', '🏥', '✈️', '🎓', '🍿', '🏋️', '☕', '🐱', '🎁', '💈'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewCatEmoji(emoji)}
                  className={`text-lg p-1 hover:bg-base-100 rounded transition-colors ${
                    newCatEmoji === emoji ? 'bg-primary/20 scale-110 border border-primary/30' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {user?.settings?.subcategoryEnabled && (
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">Parent Category (Optional)</span>
              </label>
              <select
                className="select select-bordered select-sm w-full text-xs"
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
              >
                <option value="">None (Top-Level Category)</option>
                {categories.filter(c => !c.parentId).map((c) => (
                  <option key={c._id || c.clientCatId} value={c._id || c.clientCatId}>
                    {c.emoji || '🏷️'} {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm text-xs font-semibold px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="btn btn-primary btn-sm text-xs font-bold text-white px-4 shadow-md hover:shadow-lg transition-all"
            >
              Add Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
