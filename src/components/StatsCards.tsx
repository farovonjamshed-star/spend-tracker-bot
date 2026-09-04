import React from 'react';
import { 
  Calendar, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CalendarRange, 
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { SummaryStats } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';

interface StatsCardsProps {
  stats: SummaryStats | null;
  currency: string;
  onOpenLimitsModal: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, currency, onOpenLimitsModal }) => {
  if (!stats) return null;

  // Calculate today vs yesterday diff
  const todayDiff = stats.todayTotal - stats.yesterdayTotal;
  const todayPct = stats.yesterdayTotal > 0 
    ? Math.round((Math.abs(todayDiff) / stats.yesterdayTotal) * 100)
    : 0;

  // Week diff
  const weekDiff = stats.weekTotal - stats.lastWeekTotal;
  const weekPct = stats.lastWeekTotal > 0 
    ? Math.round((Math.abs(weekDiff) / stats.lastWeekTotal) * 100) 
    : 0;

  // Check exceeded limits
  const overLimitCats = stats.byCategory.filter((c) => c.isOverLimit);
  const approachingLimitCats = stats.byCategory.filter((c) => !c.isOverLimit && c.limit && (c.amount / c.limit) >= 0.8);

  const now = new Date();
  const currentDay = now.getDate();
  const dailyAverage = currentDay > 0 ? Math.round(stats.monthTotal / currentDay) : stats.monthTotal;

  return (
    <div id="stats-cards-container" className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 mb-8 w-full max-w-full">
      
      {/* 1. Сегодня */}
      <div id="stat-card-today" className="w-full max-w-full bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Сегодня
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight break-words">
            {formatCurrency(stats.todayTotal, currency)}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>Вчера: {formatCurrency(stats.yesterdayTotal, currency)}</span>
          {stats.yesterdayTotal > 0 && (
            <span className={`inline-flex items-center gap-0.5 font-semibold ${todayDiff > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {todayDiff > 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{todayPct}%
                </>
              ) : (
                <>
                  <TrendingDown className="w-3.5 h-3.5" />
                  -{todayPct}%
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* 2. Эта неделя */}
      <div id="stat-card-week" className="w-full max-w-full bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Эта неделя
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <CalendarRange className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight break-words">
            {formatCurrency(stats.weekTotal, currency)}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>Пред. неделя: {formatCurrency(stats.lastWeekTotal, currency)}</span>
          {stats.lastWeekTotal > 0 && (
            <span className={`inline-flex items-center gap-0.5 font-semibold ${weekDiff > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {weekDiff > 0 ? `+${weekPct}%` : `-${weekPct}%`}
            </span>
          )}
        </div>
      </div>

      {/* 3. Этот месяц */}
      <div id="stat-card-month" className="w-full max-w-full bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Этот месяц
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight break-words">
            {formatCurrency(stats.monthTotal, currency)}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>Ср. в день: {formatCurrency(dailyAverage, currency)}</span>
          <span className="font-medium text-slate-700">{stats.expenseCount} операций</span>
        </div>
      </div>

      {/* 4. Лимиты и бюджет */}
      <div 
        id="stat-card-limits" 
        onClick={onOpenLimitsModal}
        className="w-full max-w-full bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between cursor-pointer hover:border-slate-300 transition-colors group"
        title="Нажмите для настройки лимитов по категориям"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Лимиты бюджета
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${overLimitCats.length > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'}`}>
              {overLimitCats.length > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </div>
          </div>

          {overLimitCats.length > 0 ? (
            <div>
              <div className="text-base font-bold text-red-600 flex items-center gap-1.5">
                <span>Превышение</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                  {overLimitCats.length} кат.
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 truncate">
                {overLimitCats.map((c) => c.category).join(', ')}
              </p>
            </div>
          ) : approachingLimitCats.length > 0 ? (
            <div>
              <div className="text-base font-bold text-amber-600">
                Внимание (&gt;80%)
              </div>
              <p className="text-xs text-slate-600 mt-1 truncate">
                {approachingLimitCats.map((c) => c.category).join(', ')}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-base font-bold text-slate-900 flex items-center gap-1">
                <span>В пределах нормы</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Все категории под контролем
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-700 font-medium group-hover:text-slate-900">
          <span>Настроить лимиты</span>
          <span>&rarr;</span>
        </div>
      </div>

    </div>
  );
};
