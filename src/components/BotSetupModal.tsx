import React, { useState } from 'react';
import { X, Bot, Check, ExternalLink, KeyRound, Loader2, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { TelegramBotStatus } from '../types.ts';

interface BotSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  botStatus: TelegramBotStatus | null;
  onTokenUpdated: () => void;
}

export const BotSetupModal: React.FC<BotSetupModalProps> = ({
  isOpen,
  onClose,
  botStatus,
  onTokenUpdated,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/bot-config/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });

      const data = await res.json();
      if (data.isConfigured && data.botUsername) {
        setMessage(`✅ Бот успешно подключен: @${data.botUsername}!`);
        onTokenUpdated();
      } else {
        setMessage('⚠️ Токен сохранен. Проверяем статус соединения...');
        onTokenUpdated();
      }
    } catch (e) {
      console.error(e);
      setMessage('Ошибка подключения. Проверьте правильность токена.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/bot-config/restart', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.conflictDetected) {
        setMessage('⚠️ Другой экземпляр бота все еще активен. Убедитесь, что бот закрыт на других устройствах.');
      } else if (data.isConfigured) {
        setMessage('✅ Бот успешно переподключен!');
      }
      onTokenUpdated();
    } catch (e) {
      console.error(e);
      setMessage('Ошибка при переподключении.');
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <div 
      id="bot-setup-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div 
        id="bot-setup-modal"
        className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 border border-slate-200/80 max-h-[92vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Подключение Telegram-бота
              </h3>
              <p className="text-xs text-slate-500">
                Запуск на реальном токене бота через @BotFather
              </p>
            </div>
          </div>
          <button
            id="close-bot-setup-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs sm:text-sm text-slate-700">
          
          {/* Conflict Warning Banner if Telegram reports conflict */}
          {botStatus?.conflictDetected && (
            <div className="bg-amber-50 border border-amber-200/90 rounded-lg p-3.5 text-amber-950 flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-xs text-amber-900">
                    Обнаружен параллельный опрос Telegram API (409 Conflict)
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Telegram сообщает, что этот бот запущен где-то еще (например, локально на компьютере или в другом терминале). Telegram API разрешает только один процесс <code>getUpdates</code> на один токен.
                  </p>
                  <p className="text-xs text-amber-700">
                    Остановите посторонний скрипт и нажмите «Переподключить».
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  id="bot-reconnect-btn"
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
                  <span>{isReconnecting ? 'Переподключение...' : 'Переподключить бота'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Current Status Banner */}
          {botStatus?.isConfigured && botStatus.botUsername ? (
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-3.5 text-emerald-900 flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold flex items-center gap-1.5 text-xs sm:text-sm mb-1 text-emerald-950">
                  <span className={`w-2 h-2 rounded-full ${botStatus.conflictDetected ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                  <span>{botStatus.conflictDetected ? 'Ожидание завершения внешнего экземпляра' : 'Бот активен и слушает сообщения'}</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Юзернейм бота: <strong>@{botStatus.botUsername}</strong>
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                  title="Перезапустить опрос"
                  className="p-1.5 bg-white border border-emerald-200 hover:bg-emerald-100/60 text-emerald-800 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                </button>
                <a
                  href={botStatus.botUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <span>Открыть</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-3.5 text-slate-800">
              <div className="font-semibold text-xs flex items-center gap-1.5 mb-1 text-slate-900">
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                <span>Сейчас работает встроенный симулятор</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Вы можете тестировать все сценарии прямо в веб-интерфейсе через кнопку «Telegram-чат» вверху экрана! Чтобы подключить собственного настоящего бота в Telegram, выполните 3 шага ниже.
              </p>
            </div>
          )}

          {/* Instructions Step-by-Step */}
          <div className="space-y-2.5 bg-slate-50/50 border border-slate-200/80 rounded-lg p-3.5">
            <span className="font-semibold text-slate-900 text-xs block mb-1">
              Как получить токен за 1 минуту:
            </span>
            <div className="flex items-start gap-2 text-xs">
              <span className="w-4 h-4 rounded bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                1
              </span>
              <span>
                Откройте в Telegram официального бота{' '}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-slate-900 underline"
                >
                  @BotFather
                </a>
                .
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="w-4 h-4 rounded bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                2
              </span>
              <span>
                Отправьте команду <code className="bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px]">/newbot</code> и укажите название и юзернейм.
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="w-4 h-4 rounded bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                3
              </span>
              <span>
                Скопируйте полученный токен (вида <code className="bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px]">123456789:ABCdefGh...</code>) и вставьте его ниже:
              </span>
            </div>
          </div>

          {/* Token input form */}
          <form onSubmit={handleSaveToken} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Токен бота (TELEGRAM_BOT_TOKEN):
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="telegram-bot-token-input"
                  type="password"
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-8.5 pr-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            {message && (
              <p className="text-xs font-medium text-slate-900">{message}</p>
            )}

            <button
              id="submit-bot-token-btn"
              type="submit"
              disabled={isSaving || !tokenInput.trim()}
              className="w-full py-2 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Проверка токена...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Подключить бота</span>
                </>
              )}
            </button>
          </form>

        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
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
