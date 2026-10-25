import React from 'react';
import { X, Plus, Edit } from 'lucide-react';

export const CategorySelector = ({ categories = [], selectedCategoryId, onSelect, onClose, onAddCategory }) => {
  const getParentName = (parentId) => {
    if (!parentId) return '';
    const pidStr = typeof parentId === 'object' ? String(parentId._id || '') : String(parentId);
    const parent = categories.find(c => String(c._id || c.clientCatId) === pidStr);
    return parent ? parent.name : '';
  };

  const sortedCategories = React.useMemo(() => {
    const parents = categories.filter(c => !c.parentId);
    const result = [];
    parents.forEach(p => {
      result.push(p);
      const subs = categories.filter(c => {
        if (!c.parentId) return false;
        const pidStr = typeof c.parentId === 'object' ? String(c.parentId._id || '') : String(c.parentId);
        return pidStr === String(p._id || p.clientCatId);
      });
      result.push(...subs);
    });
    categories.forEach(c => {
      if (!result.find(r => (r._id && r._id === c._id) || (r.clientCatId && r.clientCatId === c.clientCatId))) {
        result.push(c);
      }
    });
    return result;
  }, [categories]);

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
      {sortedCategories.length === 0 ? (
        <div className="text-center py-6 text-sm text-base-content opacity-60">
          No categories found. Add one to begin tracking!
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
          {sortedCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat._id;
            const parentName = getParentName(cat.parentId);
            return (
              <button
                key={cat._id || cat.clientCatId}
                type="button"
                onClick={() => onSelect(cat)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-semibold transition-all duration-200 ${
                  cat.parentId ? 'border-dashed opacity-90 pl-4' : ''
                } ${
                  isSelected 
                    ? 'bg-error/10 border-error text-error scale-95 shadow-sm' 
                    : 'bg-base-200 border-base-300 hover:bg-base-300 hover:border-base-content/10'
                }`}
              >
                <span className="text-lg flex-shrink-0">{cat.emoji || '🏷️'}</span>
                <div className="overflow-hidden min-w-0 flex-1">
                  {parentName && (
                    <span className="text-[9px] opacity-50 block truncate font-normal">
                      {parentName} ›
                    </span>
                  )}
                  <span className="truncate block font-bold">{cat.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
