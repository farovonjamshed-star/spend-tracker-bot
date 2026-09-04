import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { StatsCards } from './components/StatsCards.tsx';
import { AnalyticsSection } from './components/AnalyticsSection.tsx';
import { ExpensesList } from './components/ExpensesList.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { TelegramSimulatorModal } from './components/TelegramSimulatorModal.tsx';
import { AddEditExpenseModal } from './components/AddEditExpenseModal.tsx';
import { ReceiptScannerModal } from './components/ReceiptScannerModal.tsx';
import { CategoryLimitsModal } from './components/CategoryLimitsModal.tsx';
import { SharedBudgetModal } from './components/SharedBudgetModal.tsx';
import { TelegramAccountModal } from './components/TelegramAccountModal.tsx';
import { Expense, SummaryStats, TelegramBotStatus, UserProfile } from './types.ts';
import { 
  BarChart3, 
  TrendingUp, 
  Plus, 
  ScrollText, 
  Settings, 
  Sparkles, 
  Bot, 
  Receipt,
  ArrowRight
} from 'lucide-react';
import { formatCurrency } from './utils/formatters.ts';

export type NavTab = 'overview' | 'analytics' | 'history' | 'settings';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [botStatus, setBotStatus] = useState<TelegramBotStatus | null>(null);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currency, setCurrency] = useState<string>('TJS');
  const [authToken, setAuthToken] = useState<string | null>(() => {
    // Check URL params first
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) return urlToken;
    return localStorage.getItem('expense_app_token') || 'demo-session-token';
  });

  // Navigation tab state: 5 tabs total (Overview, Analytics, Add, History, Settings)
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('overview');

  // Modal visibility states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [isSharedBudgetOpen, setIsSharedBudgetOpen] = useState(false);
  const [isTelegramAccountOpen, setIsTelegramAccountOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Helper headers for API requests
  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  }, [authToken]);

  // Load all app data
  const fetchData = useCallback(async () => {
    try {
      const headers = getHeaders();

      // 1. Bot status
      fetch('/api/bot-status')
        .then((res) => res.json())
        .then((data) => setBotStatus(data))
        .catch(console.error);

      // 2. User info
      const meRes = await fetch('/api/me', { headers });
      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user);
        setPartner(meData.partner);
        if (meData.user?.currency) {
          setCurrency(meData.user.currency);
        }
      }

      // 3. Stats
      const statsRes = await fetch('/api/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 4. Expenses
      const expensesRes = await fetch('/api/expenses', { headers });
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData);
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    }
  }, [getHeaders]);

  // Initialize and check Telegram WebApp
  useEffect(() => {
    const initAuth = async () => {
      // 1. If launched inside Telegram WebApp
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        try {
          tg.ready();
          tg.expand();
        } catch (e) {}

        const initData = tg.initData;
        const tgUser = tg.initDataUnsafe?.user;
        if (initData || tgUser) {
          try {
            const authRes = await fetch('/api/auth/telegram-webapp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData, user: tgUser }),
            });
            if (authRes.ok) {
              const authData = await authRes.json();
              if (authData.token) {
                localStorage.setItem('expense_app_token', authData.token);
                setAuthToken(authData.token);
                setUser(authData.user);
                return;
              }
            }
          } catch (e) {
            console.error('Error authenticating via Telegram WebApp:', e);
          }
        }
      }

      // 2. Save token if in URL (?token=...)
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        localStorage.setItem('expense_app_token', urlToken);
        setAuthToken(urlToken);
        try {
          const verifyRes = await fetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: urlToken }),
          });
          if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            setUser(verifyData.user);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    initAuth().then(() => fetchData());
  }, [fetchData]);

  // Switch account
  const handleSwitchAccount = async (targetId: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/switch-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: targetId, firstName: name }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('expense_app_token', data.token);
        setAuthToken(data.token);
        setUser(data.user);
        showToast(`👤 Аккаунт переключен: Telegram ID ${data.user.telegramId}`);
        fetchData();
      }
    } catch (e) {
      console.error('Error switching account:', e);
    }
  };

  // Add or Edit expense
  const handleSaveExpense = async (expenseData: {
    id?: string;
    amount: number;
    description: string;
    category: string;
    currency: string;
    date: string;
    rawMessage?: string;
  }) => {
    const headers = getHeaders();
    if (expenseData.id) {
      // Update
      const res = await fetch(`/api/expenses/${expenseData.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(expenseData),
      });
      if (res.ok) {
        showToast('✅ Трата успешно обновлена');
        fetchData();
      }
    } else {
      // Create
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers,
        body: JSON.stringify(expenseData),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.limitWarning && data.limitWarning.isExceeded) {
          showToast(`⚠️ Трата добавлена! Внимание: лимит по категории «${expenseData.category}» превышен!`);
        } else {
          showToast('✅ Новая трата сохранена');
        }
        fetchData();
      }
    }
  };

  // Delete expense
  const handleDeleteExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        showToast('🗑️ Трата удалена');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Change currency
  const handleChangeCurrency = async (newCurrency: string) => {
    setCurrency(newCurrency);
    try {
      await fetch('/api/me/currency', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ currency: newCurrency }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Export CSV download (Client-side trigger generating expenses_report.csv)
  const handleExportCsv = () => {
    try {
      const header = ['ID', 'Дата', 'Категория', 'Описание', 'Сумма', 'Валюта', 'Продавец'].join(';');
      const rows = expenses.map((e) => [
        e.id,
        e.date,
        `"${(e.category || '').replace(/"/g, '""')}"`,
        `"${(e.description || '').replace(/"/g, '""')}"`,
        e.amount,
        e.currency || currency,
        `"${(e.merchant || '').replace(/"/g, '""')}"`,
      ].join(';'));

      const csvContent = '\uFEFF' + [header, ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'expenses_report.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('📥 Файл expenses_report.csv успешно скачан!');
    } catch (e) {
      console.error('CSV export error:', e);
      const tokenQuery = authToken ? `?token=${authToken}` : '';
      window.location.href = `/api/export-csv${tokenQuery}`;
    }
  };

  return (
    <div 
      id="expense-app-root" 
      className="min-h-screen max-w-md mx-auto relative flex flex-col overflow-x-hidden bg-gray-50 text-slate-900 font-sans shadow-sm"
    >
      
      {/* Toast notification */}
      {toastMessage && (
        <div 
          id="app-toast-notification"
          className="fixed bottom-20 left-4 right-4 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-sm mx-auto"
        >
          {toastMessage}
        </div>
      )}

      {/* 1. Main Header (Чистый логотип, статус подключения, выбор валюты, кнопка экспорта в CSV) */}
      <Header
        currency={currency}
        onChangeCurrency={handleChangeCurrency}
        onExportCsv={handleExportCsv}
        botStatus={botStatus}
      />

      {/* 2. Main Dashboard Content (С четким нижним отступом pb-28, исключающим перекрытие панелью) */}
      <main 
        id="app-main-content" 
        className="pb-28 px-4 pt-4 flex-1 w-full overflow-x-hidden"
      >
        
        {/* ВКЛАДКА 1: 📊 ОБЗОР */}
        {activeNavTab === 'overview' && (
          <div id="tab-content-overview" className="space-y-4">
            
            {/* Карточка-баннер быстрого статуса */}
            <div id="quick-guide-banner" className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-semibold text-slate-700">
                    Умный Telegram-бот
                  </span>
                </div>
                {user?.partnerTelegramId && (
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    👥 На двоих
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Быстрый учет финансов
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Отправьте боту «<code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">кофе 250</code>» или «<code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">такси 400</code>» — категория определится автоматически!
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(true)}
                  className="flex-1 py-2 px-3 bg-sky-500 hover:bg-sky-600 active:scale-98 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Telegram-чат</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReceiptScannerOpen(true)}
                  className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Receipt className="w-3.5 h-3.5 text-slate-500" />
                  <span>Чек (AI)</span>
                </button>
              </div>
            </div>

            {/* Карточки за день, неделю, месяц и лимиты */}
            <StatsCards
              stats={stats}
              currency={currency}
              onOpenLimitsModal={() => setIsLimitsModalOpen(true)}
            />

            {/* Блок последних трат */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Последние операции
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveNavTab('history')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Вся история</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <p>Пока нет добавленных расходов</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingExpense(null);
                      setIsAddEditOpen(true);
                    }}
                    className="mt-2 text-xs font-semibold text-slate-900 underline cursor-pointer"
                  >
                    + Записать первую трату
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {expenses.slice(0, 4).map((exp) => (
                    <div key={exp.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {exp.description || exp.category}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-600">{exp.category}</span>
                          <span>•</span>
                          <span>{exp.date}</span>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-slate-900 shrink-0">
                        -{exp.amount.toLocaleString('ru-RU')} {exp.currency || currency}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ВКЛАДКА 2: 📈 АНАЛИТИКА */}
        {activeNavTab === 'analytics' && (
          <div id="tab-content-analytics" className="space-y-4">
            <AnalyticsSection
              stats={stats}
              expenses={expenses}
              currency={currency}
              user={user}
              onOpenLimitsModal={() => setIsLimitsModalOpen(true)}
            />
          </div>
        )}

        {/* ВКЛАДКА 4: 📜 ИСТОРИЯ */}
        {activeNavTab === 'history' && (
          <div id="tab-content-history" className="space-y-4">
            <ExpensesList
              expenses={expenses}
              currency={currency}
              onEditExpense={(exp) => {
                setEditingExpense(exp);
                setIsAddEditOpen(true);
              }}
              onDeleteExpense={handleDeleteExpense}
            />
          </div>
        )}

        {/* ВКЛАДКА 5: ⚙️ НАСТРОЙКИ */}
        {activeNavTab === 'settings' && (
          <div id="tab-content-settings" className="space-y-4">
            <SettingsView
              botStatus={botStatus}
              user={user}
              partner={partner}
              currency={currency}
              onChangeCurrency={handleChangeCurrency}
              onOpenSharedBudget={() => setIsSharedBudgetOpen(true)}
              onOpenTelegramAccount={() => setIsTelegramAccountOpen(true)}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
              onTokenUpdated={() => {
                showToast('🤖 Настройки обновлены');
                fetchData();
              }}
            />
          </div>
        )}

      </main>

      {/* 3. Нижняя панель навигации на 5 вкладок (Bottom Navigation Bar) */}
      <nav 
        id="bottom-navigation-bar" 
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 h-16 flex items-center justify-around max-w-md mx-auto px-1 shadow-lg"
      >
        {/* 1. 📊 Обзор */}
        <button
          id="bottom-nav-overview"
          type="button"
          onClick={() => setActiveNavTab('overview')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeNavTab === 'overview' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
          title="Обзор (Главная)"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] sm:text-[11px] mt-0.5 tracking-tight">Обзор</span>
        </button>

        {/* 2. 📈 Аналитика */}
        <button
          id="bottom-nav-analytics"
          type="button"
          onClick={() => setActiveNavTab('analytics')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeNavTab === 'analytics' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
          title="Графики и лимиты"
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] sm:text-[11px] mt-0.5 tracking-tight">Аналитика</span>
        </button>

        {/* 3. ➕ Добавить (Центральная акцентная кнопка) */}
        <div className="flex flex-col items-center justify-center flex-1">
          <button
            id="bottom-nav-add-expense"
            type="button"
            onClick={() => {
              setEditingExpense(null);
              setIsAddEditOpen(true);
            }}
            className="flex items-center justify-center -mt-5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white w-12 h-12 rounded-full shadow-md border-2 border-white transition-all cursor-pointer group"
            title="Добавить расход"
          >
            <Plus className="w-6 h-6 transition-transform group-hover:scale-110" />
          </button>
          <span className="text-[10px] font-semibold text-slate-900 mt-0.5 tracking-tight whitespace-nowrap">
            Добавить
          </span>
        </div>

        {/* 4. 📜 История */}
        <button
          id="bottom-nav-history"
          type="button"
          onClick={() => setActiveNavTab('history')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeNavTab === 'history' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
          title="Список всех операций"
        >
          <ScrollText className="w-5 h-5" />
          <span className="text-[10px] sm:text-[11px] mt-0.5 tracking-tight">История</span>
        </button>

        {/* 5. ⚙️ Настройки */}
        <button
          id="bottom-nav-settings"
          type="button"
          onClick={() => setActiveNavTab('settings')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeNavTab === 'settings' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
          title="Настройки бота, на двоих и валюта"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] sm:text-[11px] mt-0.5 tracking-tight">Настройки</span>
        </button>
      </nav>

      {/* Модальные окна */}
      <TelegramSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        botStatus={botStatus}
        onExpenseAdded={fetchData}
      />

      <AddEditExpenseModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setEditingExpense(null);
        }}
        editingExpense={editingExpense}
        currency={currency}
        onSave={handleSaveExpense}
      />

      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        currency={currency}
        onExpenseAdded={() => {
          showToast('🧾 Чек успешно распознан и добавлен!');
          fetchData();
        }}
      />

      <CategoryLimitsModal
        isOpen={isLimitsModalOpen}
        onClose={() => setIsLimitsModalOpen(false)}
        user={user}
        currency={currency}
        onLimitsUpdated={() => {
          showToast('⚙️ Лимиты категорий сохранены');
          fetchData();
        }}
      />

      <SharedBudgetModal
        isOpen={isSharedBudgetOpen}
        onClose={() => setIsSharedBudgetOpen(false)}
        user={user}
        partner={partner}
        onPartnerLinked={() => {
          showToast('👥 Бюджет успешно объединен!');
          fetchData();
        }}
      />

      <TelegramAccountModal
        isOpen={isTelegramAccountOpen}
        onClose={() => setIsTelegramAccountOpen(false)}
        user={user}
        authToken={authToken}
        onSwitchAccount={handleSwitchAccount}
        botUsername={botStatus?.botUsername}
        botUrl={botStatus?.botUrl}
      />

    </div>
  );
}
