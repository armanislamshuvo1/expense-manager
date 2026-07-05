import React from 'react';
import { X, Plus, Edit } from 'lucide-react';

export const CategorySelector = ({ categories = [], selectedCategoryId, onSelect, onClose, onAddCategory }) => {
  return (
    <div className="bg-base-100 p-4 rounded-t-3xl border-t border-base-300 w-full animate-slideUp">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-base-200">
        <h3 className="font-bold text-lg text-base-content">
          Category
        </h3>
        <div className="flex gap-2">
          <button type="button" onClick={onAddCategory} className="btn btn-ghost btn-sm btn-circle">
            <Plus className="w-5 h-5 text-primary" />
          </button>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Categories list */}
      {categories.length === 0 ? (
        <div className="text-center py-6 text-sm text-base-content opacity-60">
          No categories found. Add one to begin tracking!
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat._id;
            return (
              <button
                key={cat._id}
                type="button"
                onClick={() => onSelect(cat)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                  isSelected 
                    ? 'bg-neutral border-error text-error scale-95 shadow-md' 
                    : 'bg-base-200 border-base-300 hover:bg-neutral hover:border-base-content/20'
                }`}
              >
                <span className="text-xl">{cat.emoji || '🏷️'}</span>
                <span className="truncate">{cat.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
