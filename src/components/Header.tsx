import React from 'react';
import { 
  Bot, 
  PlusCircle, 
  FileSpreadsheet, 
  Receipt, 
  Settings, 
  Users, 
  ExternalLink,
  MessageSquare,
  Send
} from 'lucide-react';
import { TelegramBotStatus, UserProfile } from '../types.ts';

interface HeaderProps {
  botStatus: TelegramBotStatus | null;
  user: UserProfile | null;
  onOpenAddExpense: () => void;
  onOpenReceiptScanner: () => void;
  onOpenSimulator: () => void;
  onOpenSettings: () => void;
  onOpenSharedBudget: () => void;
  onOpenTelegramAccount: () => void;
  onExportCsv: () => void;
  onChangeCurrency: (currency: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  botStatus,
  user,
  onOpenAddExpense,
  onOpenReceiptScanner,
  onOpenSimulator,
  onOpenSettings,
  onOpenSharedBudget,
  onOpenTelegramAccount,
  onExportCsv,
  onChangeCurrency,
}) => {
  return (
    <header id="app-header" className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Logo & Status */}
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  ExpenseBot
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                  Telegram & Web
                </span>
              </div>
              
              {/* Bot status badge */}
              <div className="flex items-center gap-2 text-xs mt-0.5">
                {botStatus?.isConfigured && botStatus.botUsername ? (
                  <a
                    id="bot-telegram-link"
                    href={botStatus.botUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-emerald-600 font-medium hover:underline"
                    title="Открыть бота в Telegram"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>@{botStatus.botUsername}</span>
                    <ExternalLink className="w-3 h-3 text-emerald-500" />
                  </a>
                ) : (
                  <button
                    id="bot-setup-pill-btn"
                    onClick={onOpenSettings}
                    className="flex items-center gap-1 text-amber-800 hover:text-amber-900 font-medium bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/80 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Бот: симулятор активен</span>
                    <Settings className="w-3 h-3 ml-0.5 text-amber-600" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Currency selector */}
            <div className="relative hidden md:block">
              <select
                id="header-currency-selector"
                value={user?.currency || 'TJS'}
                onChange={(e) => onChangeCurrency(e.target.value)}
                className="bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg px-2.5 py-1.5 border border-slate-200 cursor-pointer focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors"
                title="Ивази асъори асосӣ / Сменить основную валюту"
              >
                <option value="TJS">с. TJS (Сомонӣ)</option>
                <option value="RUB">₽ RUB</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="KZT">₸ KZT</option>
              </select>
            </div>

            {/* Telegram Account Pill */}
            <button
              id="header-telegram-account-btn"
              onClick={onOpenTelegramAccount}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-medium text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Telegram-аккаунт, авторизация и изоляция данных"
            >
              <Send className="w-3.5 h-3.5 text-sky-500" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate font-semibold">
                {user ? (user.firstName || `@${user.username}` || user.telegramId) : 'Telegram'}
              </span>
              <span className="hidden lg:inline-block text-[10px] text-slate-500 font-mono bg-white px-1 py-0.5 rounded border border-slate-200">
                {user?.telegramId ? `ID:${user.telegramId}` : 'TG'}
              </span>
            </button>

            {/* Telegram Simulator / Live Chat Button */}
            <button
              id="header-open-telegram-btn"
              onClick={onOpenSimulator}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-lg shadow-xs transition-colors cursor-pointer active:scale-98"
              title="Открыть интерактивный Telegram-чат для ввода трат"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Telegram-чат</span>
              <span className="sm:hidden">Чат</span>
            </button>

            {/* Scan receipt button */}
            <button
              id="header-scan-receipt-btn"
              onClick={onOpenReceiptScanner}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Распознать сумму из фото чека"
            >
              <Receipt className="w-4 h-4 text-slate-400" />
              <span>Чек (AI)</span>
            </button>

            {/* Export CSV button */}
            <button
              id="header-export-csv-btn"
              onClick={onExportCsv}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Экспорт расходов в CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>CSV</span>
            </button>

            {/* Shared budget button */}
            <button
              id="header-shared-budget-btn"
              onClick={onOpenSharedBudget}
              className="p-2 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="Бюджет на двоих"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">На двоих</span>
            </button>

            {/* Settings button */}
            <button
              id="header-settings-btn"
              onClick={onOpenSettings}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Настройки бота и окружения"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Add Expense Button */}
            <button
              id="header-add-expense-btn"
              onClick={onOpenAddExpense}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Записать трату</span>
              <span className="sm:hidden">+Трата</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
