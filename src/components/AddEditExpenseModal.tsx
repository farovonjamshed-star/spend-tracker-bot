import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, Calendar, Tag, DollarSign, FileText } from 'lucide-react';
import { Expense, DEFAULT_CATEGORIES } from '../types.ts';

interface AddEditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingExpense: Expense | null;
  currency: string;
  onSave: (expenseData: {
    id?: string;
    amount: number;
    description: string;
    category: string;
    currency: string;
    date: string;
    rawMessage?: string;
  }) => Promise<void>;
}

export const AddEditExpenseModal: React.FC<AddEditExpenseModalProps> = ({
  isOpen,
  onClose,
  editingExpense,
  currency,
  onSave,
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(currency);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setAmount(String(editingExpense.amount));
      setDescription(editingExpense.description);
      setCategory(editingExpense.category);
      setSelectedCurrency(editingExpense.currency || currency);
      setDate(editingExpense.date);
      setQuickInput('');
    } else {
      setAmount('');
      setDescription('');
      setCategory(DEFAULT_CATEGORIES[0]);
      setSelectedCurrency(currency);
      setDate(new Date().toISOString().split('T')[0]);
      setQuickInput('');
    }
  }, [editingExpense, isOpen, currency]);

  if (!isOpen) return null;

  // Realtime quick input parser: e.g. "кофе 350"
  const handleQuickInputChange = (val: string) => {
    setQuickInput(val);
    const match = val.match(/(\d+(?:[.,]\d{1,2})?)/);
    if (match) {
      setAmount(match[1].replace(',', '.'));
      const cleanDesc = val.replace(match[0], '').trim();
      if (cleanDesc) {
        setDescription(cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    setIsSaving(true);
    try {
      await onSave({
        id: editingExpense?.id,
        amount: numAmount,
        description: description.trim() || 'Расход',
        category,
        currency: selectedCurrency,
        date,
        rawMessage: quickInput || undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      id="add-edit-expense-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div 
        id="add-edit-expense-modal"
        className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 border border-slate-200/80"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            {editingExpense ? 'Редактировать трату' : 'Записать новую трату'}
          </h3>
          <button
            id="close-add-edit-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Quick Smart Input for new expenses */}
          {!editingExpense && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                Быстрый ввод (как в боте):
              </label>
              <input
                id="modal-quick-input"
                type="text"
                placeholder="например: латте 320 или такси 850"
                value={quickInput}
                onChange={(e) => handleQuickInputChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              />
            </div>
          )}

          {/* Amount & Currency */}
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Сумма *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="modal-amount-input"
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-base font-bold text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                />
              </div>
              <select
                id="modal-currency-select"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer"
              >
                <option value="RUB">₽ RUB</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="KZT">₸ KZT</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Описание покупки *
            </label>
            <input
              id="modal-description-input"
              type="text"
              required
              placeholder="Кофе, такси, супермаркет..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Категория
            </label>
            <select
              id="modal-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer"
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Дата
            </label>
            <input
              id="modal-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              id="modal-save-expense-btn"
              type="submit"
              disabled={isSaving || !amount}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {isSaving ? 'Сохранение...' : editingExpense ? 'Сохранить изменения' : 'Добавить трату'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
