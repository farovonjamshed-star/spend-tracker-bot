import React, { useState } from 'react';
import { X, Users, Copy, Check, Link, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types.ts';

interface SharedBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  partner: UserProfile | null;
  onPartnerLinked: () => void;
}

export const SharedBudgetModal: React.FC<SharedBudgetModalProps> = ({
  isOpen,
  onClose,
  user,
  partner,
  onPartnerLinked,
}) => {
  const [partnerCode, setPartnerCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const copyCode = () => {
    if (user?.shareCode) {
      navigator.clipboard.writeText(user.shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCode.trim()) return;

    setIsLinking(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/shared-budget/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: partnerCode.trim() }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        setStatusMessage({ type: 'error', text: data.error || 'Не удалось подключить партнера' });
      } else {
        setStatusMessage({ type: 'success', text: data.message });
        onPartnerLinked();
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Ошибка сети' });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div 
      id="shared-budget-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div 
        id="shared-budget-modal"
        className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 border border-slate-200/80"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Общий бюджет на двоих
              </h3>
              <p className="text-xs text-slate-500">
                Ведите семейные или совместные расходы с партнером
              </p>
            </div>
          </div>
          <button
            id="close-shared-budget-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          
          {/* Currently linked status */}
          {partner ? (
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-3.5 text-xs text-emerald-900">
              <div className="font-semibold text-xs sm:text-sm mb-1 flex items-center gap-1.5 text-emerald-950">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Бюджет объединен</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Вы синхронизированы с: <strong className="text-slate-900">{partner.firstName || partner.username || partner.telegramId}</strong>.
                Все ваши и совместные траты отображаются в единой ленте и аналитике.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50/60 border border-slate-200/80 rounded-lg p-3.5">
              <span className="text-xs font-medium text-slate-600 block mb-1.5">
                Ваш уникальный код подключения:
              </span>
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-base font-mono font-bold text-slate-900 tracking-wider">
                  {user?.shareCode || 'GENERATING...'}
                </span>
                <button
                  id="copy-share-code-btn"
                  onClick={copyCode}
                  className="p-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copied ? 'Скопировано' : 'Скопировать'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Отправьте этот код партнеру, либо он может ввести в Telegram команду: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">/share {user?.shareCode}</code>
              </p>
            </div>
          )}

          {/* Connect to partner form */}
          {!partner && (
            <form onSubmit={handleLink} className="space-y-3 pt-2">
              <label className="text-xs font-medium text-slate-700 block">
                Или введите код партнера:
              </label>
              <div className="flex gap-2">
                <input
                  id="partner-code-input"
                  type="text"
                  placeholder="Например: AB12CD"
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono uppercase tracking-wider text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                />
                <button
                  id="link-partner-submit-btn"
                  type="submit"
                  disabled={isLinking || !partnerCode.trim()}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>{isLinking ? 'Связка...' : 'Связать'}</span>
                </button>
              </div>
            </form>
          )}

          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
