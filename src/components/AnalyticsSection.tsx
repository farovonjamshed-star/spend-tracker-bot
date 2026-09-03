import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { SummaryStats } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';

interface AnalyticsSectionProps {
  stats: SummaryStats | null;
  currency: string;
  onOpenLimitsModal: () => void;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  stats,
  currency,
  onOpenLimitsModal,
}) => {
  if (!stats) return null;

  // Format daily chart data: show only day numbers (e.g. "1", "2", ... "15")
  const dailyData = stats.byDay.map((d) => {
    const dayNum = parseInt(d.date.split('-')[2], 10);
    return {
      day: String(dayNum),
      fullDate: d.date,
      amount: d.amount,
      count: d.count,
    };
  });

  // Category donut data: limit top 6 + 'Другие'
  const pieData = stats.byCategory.map((c) => ({
    name: c.category,
    value: c.amount,
    percentage: c.percentage,
    color: c.color,
  }));

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white text-xs rounded-lg p-2.5 shadow-md border border-slate-800">
          <p className="font-semibold text-slate-200">{data.fullDate}</p>
          <p className="text-sm font-bold text-white mt-1">
            {formatCurrency(data.amount, currency)}
          </p>
          {data.count > 0 && (
            <p className="text-slate-400 mt-0.5">{data.count} операций</p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white text-xs rounded-lg p-2.5 shadow-md border border-slate-800">
          <p className="font-semibold text-slate-200">{data.name}</p>
          <p className="text-sm font-bold text-white mt-1">
            {formatCurrency(data.value, currency)} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="analytics-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      
      {/* 1. Daily Expenses Timeline (2 cols on large screen) */}
      <div id="daily-expenses-chart-container" className="lg:col-span-2 bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Расходы по дням
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Динамика трат за текущий месяц
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200/60">
            {new Date().toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="h-64 sm:h-72 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="day" 
                tickLine={false} 
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(val) => val >= 1000 ? `${Math.round(val / 1000)}k` : val}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar 
                dataKey="amount" 
                fill="#0f172a" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Category Breakdown Donut (1 col on large screen) */}
      <div id="category-breakdown-chart-container" className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Категории расходов
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Структура трат за месяц
            </p>
          </div>
        </div>

        {pieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            Нет данных по категориям
          </div>
        ) : (
          <div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top 4 Categories List with percentages */}
            <div className="mt-3 space-y-2 max-h-36 overflow-y-auto pr-1">
              {stats.byCategory.slice(0, 5).map((cat) => (
                <div key={cat.category} className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-slate-700 truncate font-medium">
                      {cat.category}
                    </span>
                  </div>
                  <div className="text-slate-900 font-semibold shrink-0 ml-2">
                    {formatCurrency(cat.amount, currency)}{' '}
                    <span className="text-slate-400 font-normal text-[11px]">({cat.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Category Budgets & Limit Progress (Full Width Banner below) */}
      <div id="category-limits-progress-container" className="lg:col-span-3 bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Лимиты и контроль бюджета по категориям
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Предупреждения при приближении к 80% и превышении
            </p>
          </div>
          <button
            id="manage-limits-btn"
            onClick={onOpenLimitsModal}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
          >
            Настроить лимиты &rarr;
          </button>
        </div>

        {stats.byCategory.filter((c) => c.limit && c.limit > 0).length === 0 ? (
          <div className="py-5 text-center bg-slate-50/50 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-500 mb-2">
              У вас пока не настроены месячные лимиты по категориям.
            </p>
            <button
              onClick={onOpenLimitsModal}
              className="text-xs font-medium px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Задать лимиты (например, Продукты 25 000 ₽)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.byCategory
              .filter((c) => c.limit && c.limit > 0)
              .map((c) => {
                const limit = c.limit!;
                const percent = Math.min(150, Math.round((c.amount / limit) * 100));
                const isOver = c.amount > limit;
                const isWarning = !isOver && percent >= 80;

                return (
                  <div
                    key={c.category}
                    className="p-3.5 rounded-lg border border-slate-200/80 bg-white"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-900 truncate">
                        {c.category}
                      </span>
                      <span
                        className={`font-bold ${
                          isOver ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-700'
                        }`}
                      >
                        {percent}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-slate-900'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{formatCurrency(c.amount, currency)}</span>
                      <span>из {formatCurrency(limit, currency)}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

    </div>
  );
};
