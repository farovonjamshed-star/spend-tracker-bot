import React from 'react';
import { Bot, ExternalLink } from 'lucide-react';
import { TelegramBotStatus } from '../types.ts';

interface HeaderProps {
  currency: string;
  onChangeCurrency: (currency: string) => void;
  onExportCsv: () => void;
  botStatus: TelegramBotStatus | null;
}

export const Header: React.FC<HeaderProps> = ({
  currency,
  onChangeCurrency,
  onExportCsv,
  botStatus,
}) => {
  return (
    <header 
      id="app-header" 
      className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 w-full px-3.5 py-2.5 shadow-xs"
    >
      <div className="flex items-center justify-between gap-2 w-full">
        {/* Логотип ExpenseBot и статус подключения */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
              ExpenseBot
            </span>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="truncate max-w-[110px]">
                {botStatus?.isConfigured && botStatus.botUsername 
                  ? `@${botStatus.botUsername}` 
                  : 'Бот активен'}
              </span>
              {botStatus?.isConfigured && botStatus.botUrl && (
                <a 
                  href={botStatus.botUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-sky-600 transition-colors inline-flex shrink-0"
                  title="Открыть в Telegram"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Выбор валюты и кнопка экспорта в CSV */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Переключатель валюты */}
          <select
            id="header-currency-selector"
            value={currency || 'TJS'}
            onChange={(e) => onChangeCurrency(e.target.value)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg px-2 py-1.5 border border-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
            title="Сменить основную валюту"
          >
            <option value="TJS">c. TJS</option>
            <option value="RUB">₽ RUB</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="KZT">₸ KZT</option>
          </select>

          {/* Кнопка экспорта CSV */}
          <button
            id="header-export-csv-btn"
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-medium text-xs rounded-lg px-2.5 py-1.5 shadow-xs cursor-pointer transition-all whitespace-nowrap"
            title="Скачать expenses_report.csv"
          >
            <span>📥 CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
};
