import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  ShieldCheck, 
  UserCheck, 
  ExternalLink,
  ArrowRightLeft,
  KeyRound
} from 'lucide-react';
import { UserProfile } from '../types.ts';

interface TelegramAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  authToken: string | null;
  onSwitchAccount: (telegramId: string, name?: string) => Promise<void>;
  botUsername?: string;
  botUrl?: string;
}

export const TelegramAccountModal: React.FC<TelegramAccountModalProps> = ({
  isOpen,
  onClose,
  user,
  authToken,
  onSwitchAccount,
  botUsername,
  botUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [customId, setCustomId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const panelUrl = `${window.location.origin}/panel?token=${authToken || ''}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(panelUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSwitchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customId.trim()) return;
    setIsSubmitting(true);
    try {
      await onSwitchAccount(customId.trim(), `Пользователь ${customId.trim()}`);
      setCustomId('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSwitch = async (targetId: string, name: string) => {
    setIsSubmitting(true);
    try {
      await onSwitchAccount(targetId, name);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="telegram-auth-modal"
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <Send className="w-4 h-4 -ml-0.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Вход через Telegram / Воридшавӣ бо Telegram
              </h3>
              <p className="text-[11px] text-slate-500">
                Ҳеҷ гуна Google ё парол лозим нест — танҳо Telegram
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* User Profile Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  {(user.firstName || 'T')[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {user.firstName || 'Пользователь Telegram'}
                  </div>
                  {user.username && (
                    <div className="text-xs text-slate-500">
                      @{user.username}
                    </div>
                  )}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                <UserCheck className="w-3 h-3" />
                Активен
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Telegram ID:</span>
                <span className="font-mono font-medium text-slate-800">
                  {user.telegramId}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Безопасность:</span>
                <span className="text-slate-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Данные изолированы
                </span>
              </div>
            </div>
          </div>

          {/* Browser Link Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              Временная ссылка авторизации (/panel)
            </label>
            <p className="text-xs text-slate-500 mb-2 leading-relaxed">
              Эту ссылку генерирует бот по команде <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-800">/panel</code> для входа с любого браузера без пароля:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={panelUrl}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 truncate select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Скопировано' : 'Копия'}</span>
              </button>
            </div>
          </div>

          {/* Data Isolation Testing for Judges/Testers */}
          <div className="pt-3 border-t border-slate-200/80">
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowRightLeft className="w-4 h-4 text-slate-600" />
              <h4 className="text-xs font-bold text-slate-900">
                Проверка изоляции данных (для тестирования)
              </h4>
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Переключитесь между Telegram ID, чтобы убедиться, что траты разных пользователей хранятся раздельно и не видны друг другу:
            </p>

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleQuickSwitch('demo_judge', 'Судья / Тестер')}
                disabled={isSubmitting || user.telegramId === 'demo_judge'}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                👤 Судья (demo_judge)
              </button>
              <button
                type="button"
                onClick={() => handleQuickSwitch('user_alice_101', 'Алиса (User 101)')}
                disabled={isSubmitting || user.telegramId === 'user_alice_101'}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                👤 Пользователь 1 (user_101)
              </button>
              <button
                type="button"
                onClick={() => handleQuickSwitch('user_bob_202', 'Боб (User 202)')}
                disabled={isSubmitting || user.telegramId === 'user_bob_202'}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                👤 Пользователь 2 (user_202)
              </button>
            </div>

            {/* Custom Telegram ID form */}
            <form onSubmit={handleSwitchSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Или введите свой Telegram ID..."
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              />
              <button
                type="submit"
                disabled={!customId.trim() || isSubmitting}
                className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Переключить
              </button>
            </form>
          </div>

          {/* Open Bot button */}
          {botUrl && (
            <div className="pt-2">
              <a
                href={botUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Открыть бота в Telegram (@{botUsername})</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
