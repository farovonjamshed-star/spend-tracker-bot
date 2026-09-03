import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, Save } from 'lucide-react';
import { DEFAULT_CATEGORIES, UserProfile } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';

interface CategoryLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  currency: string;
  onLimitsUpdated: () => void;
}

export const CategoryLimitsModal: React.FC<CategoryLimitsModalProps> = ({
  isOpen,
  onClose,
  user,
  currency,
  onLimitsUpdated,
}) => {
  const [limits, setLimits] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    DEFAULT_CATEGORIES.forEach((cat) => {
      initial[cat] = user?.categoryLimits?.[cat] ? String(user.categoryLimits[cat]) : '';
    });
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleLimitChange = (category: string, value: string) => {
    setLimits((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all categories with non-empty values
      for (const [category, val] of Object.entries(limits)) {
        const num = parseFloat(String(val));
        await fetch('/api/limits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            monthlyLimit: isNaN(num) ? 0 : num,
          }),
        });
      }
      onLimitsUpdated();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      id="category-limits-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div 
        id="category-limits-modal"
        className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 border border-slate-200/80 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Лимиты бюджета по категориям
              </h3>
              <p className="text-xs text-slate-500">
                Предупреждения в боте при 80% и превышении
              </p>
            </div>
          </div>
          <button
            id="close-limits-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          <p className="text-xs text-slate-500 mb-2">
            Укажите максимальную сумму расходов в месяц для каждой категории (оставьте пустым, если лимит не нужен):
          </p>

          {DEFAULT_CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center justify-between gap-3 text-xs">
              <label className="font-medium text-slate-800 truncate flex-1">
                {cat}
              </label>
              <div className="relative w-36 shrink-0">
                <input
                  type="number"
                  placeholder="Без лимита"
                  value={limits[cat] || ''}
                  onChange={(e) => handleLimitChange(cat, e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-right font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">
                  {currency === 'RUB' ? '₽' : currency}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            id="save-limits-btn"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Сохранение...' : 'Сохранить лимиты'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
