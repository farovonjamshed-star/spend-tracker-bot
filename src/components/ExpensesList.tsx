import React, { useState } from 'react';
import { 
  Search, 
  Edit3, 
  Trash2, 
  Receipt, 
  Calendar,
  Filter
} from 'lucide-react';
import { Expense, CATEGORY_COLORS, DEFAULT_CATEGORIES } from '../types.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';

interface ExpensesListProps {
  expenses: Expense[];
  currency: string;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpensesList: React.FC<ExpensesListProps> = ({
  expenses,
  currency,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter expenses
  const filtered = expenses.filter((e) => {
    const matchesSearch = 
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.merchant && e.merchant.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = 
      selectedCategory === 'all' || e.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleDeleteClick = (id: string) => {
    if (confirmDeleteId === id) {
      onDeleteExpense(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => {
        setConfirmDeleteId((prev) => (prev === id ? null : prev));
      }, 3500);
    }
  };

  return (
    <div id="expenses-list-container" className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mb-12">
      
      {/* List Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            История операций
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Все траты, добавленные через Telegram или панель ({filtered.length} из {expenses.length})
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="expenses-search-input"
              type="text"
              placeholder="Поиск по описанию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-8.5 pr-3 py-1.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              id="expenses-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer"
            >
              <option value="all">Все категории</option>
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Expenses Table / List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
          <Filter className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">Траты не найдены</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Попробуйте изменить поисковый запрос или фильтр
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Категория</th>
                <th className="pb-3">Описание</th>
                <th className="pb-3 hidden sm:table-cell">Дата</th>
                <th className="pb-3 text-right">Сумма</th>
                <th className="pb-3 text-right pr-2">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filtered.map((expense) => {
                const color = CATEGORY_COLORS[expense.category] || '#64748b';
                const isConfirming = confirmDeleteId === expense.id;

                return (
                  <tr 
                    key={expense.id} 
                    id={`expense-row-${expense.id}`}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Category pill */}
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium text-slate-800 truncate max-w-[130px] sm:max-w-[180px]">
                          {expense.category}
                        </span>
                      </div>
                    </td>

                    {/* Description & metadata */}
                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-900">
                        <span>{expense.description}</span>
                        {expense.receiptItems && (
                          <span 
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200/60"
                            title="Распознано с чека"
                          >
                            <Receipt className="w-2.5 h-2.5 text-slate-400" />
                            <span>чек</span>
                          </span>
                        )}
                      </div>
                      {expense.merchant && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {expense.merchant}
                        </p>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 hidden sm:table-cell text-slate-500 text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(expense.date)}</span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 text-right font-bold text-slate-900">
                      {formatCurrency(expense.amount, expense.currency || currency)}
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="py-3.5 text-right pr-2">
                      <div className="flex items-center justify-end gap-1">
                        
                        {/* Edit Button */}
                        <button
                          id={`edit-expense-${expense.id}`}
                          onClick={() => onEditExpense(expense)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="Редактировать трату"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          id={`delete-expense-${expense.id}`}
                          onClick={() => handleDeleteClick(expense.id)}
                          className={`px-2 py-1 text-xs rounded-md transition-all cursor-pointer ${
                            isConfirming
                              ? 'bg-red-600 text-white font-semibold'
                              : 'p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={isConfirming ? 'Нажмите еще раз для удаления' : 'Удалить трату'}
                        >
                          {isConfirming ? (
                            <span>Удалить?</span>
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
