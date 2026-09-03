import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { StatsCards } from './components/StatsCards.tsx';
import { AnalyticsSection } from './components/AnalyticsSection.tsx';
import { ExpensesList } from './components/ExpensesList.tsx';
import { TelegramSimulatorModal } from './components/TelegramSimulatorModal.tsx';
import { AddEditExpenseModal } from './components/AddEditExpenseModal.tsx';
import { ReceiptScannerModal } from './components/ReceiptScannerModal.tsx';
import { CategoryLimitsModal } from './components/CategoryLimitsModal.tsx';
import { SharedBudgetModal } from './components/SharedBudgetModal.tsx';
import { BotSetupModal } from './components/BotSetupModal.tsx';
import { TelegramAccountModal } from './components/TelegramAccountModal.tsx';
import { Expense, SummaryStats, TelegramBotStatus, UserProfile } from './types.ts';
import { Bot, Sparkles, Plus, Receipt } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [botStatus, setBotStatus] = useState<TelegramBotStatus | null>(null);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currency, setCurrency] = useState<string>('RUB');
  const [authToken, setAuthToken] = useState<string | null>(() => {
    // Check URL params first
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) return urlToken;
    return localStorage.getItem('expense_app_token') || 'demo-session-token';
  });

  // Modal visibility states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [isSharedBudgetOpen, setIsSharedBudgetOpen] = useState(false);
  const [isBotSetupOpen, setIsBotSetupOpen] = useState(false);
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
            if (verifyData.user) {
              setUser(verifyData.user);
            }
          }
        } catch (e) {
          console.error('Error verifying url token:', e);
        }
      }
    };

    initAuth().finally(() => {
      fetchData();
    });
  }, [fetchData]);

  // Switch account / test data isolation
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

  // Export CSV download
  const handleExportCsv = () => {
    const tokenQuery = authToken ? `?token=${authToken}` : '';
    window.location.href = `/api/export-csv${tokenQuery}`;
  };

  return (
    <div id="expense-app-root" className="min-h-screen bg-[#F9FAFB] text-slate-900 flex flex-col font-sans">
      
      {/* Toast notification */}
      {toastMessage && (
        <div 
          id="app-toast-notification"
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-slate-900 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg border border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-150"
        >
          {toastMessage}
        </div>
      )}

      {/* Main Header */}
      <Header
        botStatus={botStatus}
        user={user}
        onOpenAddExpense={() => {
          setEditingExpense(null);
          setIsAddEditOpen(true);
        }}
        onOpenReceiptScanner={() => setIsReceiptScannerOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenSettings={() => setIsBotSetupOpen(true)}
        onOpenSharedBudget={() => setIsSharedBudgetOpen(true)}
        onOpenTelegramAccount={() => setIsTelegramAccountOpen(true)}
        onExportCsv={handleExportCsv}
        onChangeCurrency={handleChangeCurrency}
      />

      {/* Main Dashboard Container */}
      <main id="app-main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Quick Welcome & Guide Banner in Clean Minimalism */}
        <div id="quick-guide-banner" className="bg-white rounded-xl p-5 sm:p-6 mb-6 sm:mb-8 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Умный трекер расходов
                </span>
                {user?.partnerTelegramId && (
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    👥 Бюджет на двоих активен
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                Управляйте тратами через Telegram в одно сообщение
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Напишите боту «<code className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 font-mono text-xs">кофе 350</code>» или «<code className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 font-mono text-xs">такси 900 работа</code>» — категория определится автоматически, а трата мгновенно появится в аналитике.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                id="banner-open-sim-btn"
                onClick={() => setIsSimulatorOpen(true)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <Bot className="w-4 h-4" />
                <span>Telegram-чат</span>
              </button>
              <button
                id="banner-scan-receipt-btn"
                onClick={() => setIsReceiptScannerOpen(true)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs sm:text-sm font-medium border border-slate-200 shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-slate-400" />
                <span>Фото чека (AI)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 1. Summary Metric Cards */}
        <StatsCards
          stats={stats}
          currency={currency}
          onOpenLimitsModal={() => setIsLimitsModalOpen(true)}
        />

        {/* 2. Visual Analytics (Charts & Limits) */}
        <AnalyticsSection
          stats={stats}
          currency={currency}
          onOpenLimitsModal={() => setIsLimitsModalOpen(true)}
        />

        {/* 3. Expense History Feed & Management */}
        <ExpensesList
          expenses={expenses}
          currency={currency}
          onEditExpense={(exp) => {
            setEditingExpense(exp);
            setIsAddEditOpen(true);
          }}
          onDeleteExpense={handleDeleteExpense}
        />

      </main>

      {/* Floating Bottom Mobile Bar for Quick Action */}
      <div id="mobile-floating-bar" className="sm:hidden fixed bottom-4 right-4 left-4 z-40 flex items-center justify-between gap-2 p-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 text-slate-900">
        <button
          onClick={() => setIsSimulatorOpen(true)}
          className="flex-1 py-2 px-3 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
        >
          <Bot className="w-4 h-4" />
          <span>Telegram-чат</span>
        </button>
        <button
          onClick={() => {
            setEditingExpense(null);
            setIsAddEditOpen(true);
          }}
          className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>+ Трата</span>
        </button>
      </div>

      {/* Modals */}
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

      <BotSetupModal
        isOpen={isBotSetupOpen}
        onClose={() => setIsBotSetupOpen(false)}
        botStatus={botStatus}
        onTokenUpdated={() => {
          showToast('🤖 Настройки бота обновлены');
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
