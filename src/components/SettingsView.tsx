import React from 'react';
import { 
  Bot, 
  Users, 
  Coins, 
  ExternalLink, 
  Check, 
  CheckCircle2
} from 'lucide-react';
import { TelegramBotStatus, UserProfile } from '../types.ts';

interface SettingsViewProps {
  botStatus: TelegramBotStatus | null;
  user: UserProfile | null;
  partner: UserProfile | null;
  currency: string;
  onChangeCurrency: (currency: string) => void;
  onOpenSharedBudget: () => void;
  onOpenTelegramAccount?: () => void;
  onOpenSimulator?: () => void;
  onTokenUpdated?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  botStatus,
  user,
  partner,
  currency,
  onChangeCurrency,
  onOpenSharedBudget,
}) => {
  const botUsername = botStatus?.botUsername || 'farovon_spend2026_bot';
  const botUrl = botStatus?.botUrl || `https://t.me/${botUsername}`;

  return (
    <div id="settings-view-container" className="space-y-4 pb-4">
      {/* Заголовок страницы */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Настройки
          </h2>
          <p className="text-xs text-slate-500">
            Статус бота, бюджет на двоих и валюта
          </p>
        </div>
      </div>

      {/* 1. Карточка "Статус подключения" */}
      <div 
        id="settings-bot-status-card"
        className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                Статус подключения
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Интеграция с Telegram
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Активен
          </span>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 text-xs text-slate-700 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Bot className="w-4 h-4 text-sky-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">
              Бот @{botUsername} подключен и работает
            </p>
            <p className="text-[11px] text-slate-500">
              Синхронизация расходов и чеков в реальном времени
            </p>
          </div>
        </div>

        <a
          id="settings-open-telegram-btn"
          href={botUrl}
          target="_blank"
          rel="noreferrer"
          className="w-full py-2.5 px-3.5 bg-sky-500 hover:bg-sky-600 active:scale-98 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Перейти в Telegram (@{botUsername})</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 2. Блок "Бюджет «На двоих»" */}
      <div 
        id="settings-shared-budget-card"
        className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                Бюджет «На двоих»
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Совместный семейный учет
              </p>
            </div>
          </div>
          {user?.partnerTelegramId ? (
            <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              Связан
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-full">
              Не настроен
            </span>
          )}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {user?.partnerTelegramId 
            ? `Связан с партнером: ${partner?.firstName || user.partnerTelegramId}. Ваши расходы объединяются в единую аналитику.`
            : 'Ведите семейный бюджет вместе. Траты от обоих партнеров объединяются в единую аналитику в реальном времени.'}
        </p>

        <button
          id="settings-manage-shared-budget-btn"
          type="button"
          onClick={onOpenSharedBudget}
          className="w-full py-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
        >
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          <span>{user?.partnerTelegramId ? 'Управление бюджетом на двоих' : 'Подключить партнера'}</span>
        </button>
      </div>

      {/* 3. Выбор основной валюты */}
      <div 
        id="settings-currency-selection-card"
        className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2.5"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 leading-tight">
              Основная валюта учета
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Единица измерения расходов
            </p>
          </div>
        </div>
        
        <p className="text-xs text-slate-600">
          Все сводки, графики и лимиты отображаются в выбранной валюте:
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { code: 'TJS', label: 'с. TJS (Сомонӣ)' },
            { code: 'RUB', label: '₽ RUB (Рубль)' },
            { code: 'USD', label: '$ USD (Доллар)' },
            { code: 'EUR', label: '€ EUR (Евро)' },
            { code: 'KZT', label: '₸ KZT (Тенге)' },
          ].map((item) => (
            <button
              key={item.code}
              id={`settings-currency-btn-${item.code.toLowerCase()}`}
              type="button"
              onClick={() => onChangeCurrency(item.code)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                currency === item.code
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{item.label}</span>
              {currency === item.code && <Check className="w-3.5 h-3.5 ml-1" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
