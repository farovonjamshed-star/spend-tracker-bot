import React, { useState, useMemo } from 'react';
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
  Sector,
} from 'recharts';
import { SummaryStats, Expense, UserProfile, CATEGORY_COLORS } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';
import {
  Calendar,
  PieChart as PieChartIcon,
  BarChart3,
  SlidersHorizontal,
  ChevronRight,
  TrendingDown,
  Info,
} from 'lucide-react';

export type TimePeriod = 'today' | 'week' | 'month' | 'all';

interface AnalyticsSectionProps {
  stats: SummaryStats | null;
  expenses?: Expense[];
  currency: string;
  user?: UserProfile | null;
  onOpenLimitsModal: () => void;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  stats,
  expenses = [],
  currency,
  user,
  onOpenLimitsModal,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Period label text
  const periodLabels: Record<TimePeriod, string> = {
    today: 'Сегодня',
    week: 'Последние 7 дней',
    month: 'Текущий месяц',
    all: 'Всё время',
  };

  const periodShortLabels: Record<TimePeriod, string> = {
    today: 'Сегодня',
    week: '7 дней',
    month: 'Этот месяц',
    all: 'Всё время',
  };

  // Helper date calculations
  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => now.toISOString().split('T')[0], [now]);
  const currentYearMonth = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Filter expenses according to selected period
  const filteredExpenses = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    return expenses.filter((exp) => {
      if (!exp.date) return false;
      const expDateStr = exp.date.includes('T') ? exp.date.split('T')[0] : exp.date;

      switch (selectedPeriod) {
        case 'today':
          return expDateStr === todayStr;
        case 'week': {
          const expDate = new Date(expDateStr);
          return expDate >= sevenDaysAgo;
        }
        case 'month':
          return expDateStr.startsWith(currentYearMonth);
        case 'all':
        default:
          return true;
      }
    });
  }, [expenses, selectedPeriod, todayStr, currentYearMonth]);

  // Aggregate category data for the interactive donut chart
  const categoryData = useMemo(() => {
    // If expenses array is provided and has items or period is not month, compute from filteredExpenses
    if (expenses && expenses.length > 0) {
      const catMap: Record<string, { amount: number; count: number }> = {};
      let total = 0;

      for (const exp of filteredExpenses) {
        const cat = exp.category || 'Другое';
        if (!catMap[cat]) {
          catMap[cat] = { amount: 0, count: 0 };
        }
        catMap[cat].amount += exp.amount;
        catMap[cat].count += 1;
        total += exp.amount;
      }

      const items = Object.entries(catMap).map(([cat, val]) => {
        const pct = total > 0 ? Math.round((val.amount / total) * 100) : 0;
        const limit = user?.categoryLimits?.[cat];
        return {
          name: cat,
          category: cat,
          value: val.amount,
          amount: val.amount,
          count: val.count,
          percentage: pct,
          color: CATEGORY_COLORS[cat] || '#64748b',
          limit: limit,
          isOverLimit: limit ? val.amount > limit : false,
        };
      });

      // Sort descending
      items.sort((a, b) => b.value - a.value);

      return {
        items,
        total,
        count: filteredExpenses.length,
      };
    }

    // Fallback to stats if expenses array is not populated yet
    if (stats && stats.byCategory) {
      const items = stats.byCategory.map((c) => ({
        name: c.category,
        category: c.category,
        value: c.amount,
        amount: c.amount,
        count: c.count,
        percentage: c.percentage,
        color: c.color || CATEGORY_COLORS[c.category] || '#64748b',
        limit: c.limit,
        isOverLimit: c.isOverLimit,
      }));

      const total = items.reduce((acc, curr) => acc + curr.value, 0);

      return {
        items,
        total,
        count: stats.expenseCount || items.reduce((acc, curr) => acc + curr.count, 0),
      };
    }

    return { items: [], total: 0, count: 0 };
  }, [expenses, filteredExpenses, stats, selectedPeriod, user]);

  // Aggregate daily bar chart data for selected period
  const dailyChartData = useMemo(() => {
    if (selectedPeriod === 'week') {
      // Generate last 7 days slots
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
        days.push({
          key: dStr,
          day: dayLabel,
          fullDate: dStr,
          amount: 0,
          count: 0,
        });
      }

      for (const exp of filteredExpenses) {
        const expDateStr = exp.date.includes('T') ? exp.date.split('T')[0] : exp.date;
        const slot = days.find((d) => d.fullDate === expDateStr);
        if (slot) {
          slot.amount += exp.amount;
          slot.count += 1;
        }
      }
      return days;
    }

    if (selectedPeriod === 'today') {
      // For today, show breakdown by category or hourly
      return categoryData.items.slice(0, 6).map((c) => ({
        day: c.category.slice(0, 8),
        fullDate: c.category,
        amount: c.amount,
        count: c.count,
      }));
    }

    // Default to monthly day data from stats or computed
    if (stats && stats.byDay && selectedPeriod === 'month') {
      return stats.byDay.map((d) => {
        const dayNum = parseInt(d.date.split('-')[2], 10);
        return {
          day: String(dayNum),
          fullDate: d.date,
          amount: d.amount,
          count: d.count,
        };
      });
    }

    // Computed for all time or month
    const dayMap: Record<string, { amount: number; count: number }> = {};
    for (const exp of filteredExpenses) {
      const expDateStr = exp.date.includes('T') ? exp.date.split('T')[0] : exp.date;
      if (!dayMap[expDateStr]) {
        dayMap[expDateStr] = { amount: 0, count: 0 };
      }
      dayMap[expDateStr].amount += exp.amount;
      dayMap[expDateStr].count += 1;
    }

    const sortedDates = Object.keys(dayMap).sort();
    return sortedDates.slice(-14).map((dStr) => {
      const parts = dStr.split('-');
      return {
        day: `${parseInt(parts[2], 10)}.${parseInt(parts[1], 10)}`,
        fullDate: dStr,
        amount: dayMap[dStr].amount,
        count: dayMap[dStr].count,
      };
    });
  }, [selectedPeriod, filteredExpenses, stats, categoryData.items]);

  // Custom tooltips
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white text-xs rounded-lg p-2.5 shadow-lg border border-slate-800 z-50">
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
        <div className="bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl border border-slate-800/90 z-50 min-w-[150px]">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: data.color }}
            />
            <p className="font-semibold text-slate-100 text-xs truncate">{data.name}</p>
          </div>
          <p className="text-sm font-bold text-white">
            {formatCurrency(data.value, currency)}
          </p>
          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-300">
            <span>Доля: {data.percentage}%</span>
            {data.count ? <span>{data.count} трат</span> : null}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom interactive active shape on donut hover
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        {/* Subtle glow / outer ring shadow */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 3}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.2}
        />
        {/* Main active arc with enhanced thickness */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 1}
          outerRadius={outerRadius + 5}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          cornerRadius={4}
        />
      </g>
    );
  };

  // Active slice data (if hovered or focused)
  const currentActiveCategory =
    activeIndex !== null && categoryData.items[activeIndex]
      ? categoryData.items[activeIndex]
      : null;

  return (
    <div id="analytics-section" className="space-y-6 mb-8 w-full max-w-full">
      
      {/* Top Controls Bar: Section Title + Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs w-full max-w-full">
        <div>
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-slate-700" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Аналитика расходов
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Распределение по категориям и динамика: <span className="font-semibold text-slate-700">{periodLabels[selectedPeriod]}</span>
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div
          id="analytics-period-selector"
          role="tablist"
          aria-label="Период аналитики"
          className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/60 w-full sm:w-auto overflow-x-auto justify-between sm:justify-start"
        >
          {(['today', 'week', 'month', 'all'] as TimePeriod[]).map((period) => {
            const isActive = selectedPeriod === period;
            return (
              <button
                key={period}
                id={`period-tab-${period}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setSelectedPeriod(period);
                  setActiveIndex(null);
                }}
                className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {periodShortLabels[period]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-full">
        
        {/* 1. Interactive Ring Donut Chart (5 cols on lg) */}
        <div
          id="category-donut-chart-container"
          className="w-full max-w-full lg:col-span-5 bg-white rounded-xl p-4 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between overflow-hidden"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Категории ({categoryData.items.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Интерактивная кольцевая диаграмма
                </p>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                {periodShortLabels[selectedPeriod]}
              </span>
            </div>

            {categoryData.items.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-4">
                <Info className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-500">
                  Нет расходов за выбранный период
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                  Выберите другой интервал или добавьте трату через бота
                </p>
              </div>
            ) : (
              <div>
                {/* Donut Chart with Center Information Ring */}
                <div className="relative h-60 w-full flex items-center justify-center my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData.items}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={92}
                        paddingAngle={3}
                        dataKey="value"
                        activeIndex={activeIndex !== null ? activeIndex : undefined}
                        activeShape={renderActiveShape}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                        onClick={(_, index) => {
                          setActiveIndex((prev) => (prev === index ? null : index));
                        }}
                        isAnimationActive={true}
                        animationDuration={700}
                        animationEasing="ease-out"
                        cursor="pointer"
                      >
                        {categoryData.items.map((entry, index) => (
                          <Cell
                            key={`donut-cell-${index}`}
                            fill={entry.color}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Ring Text (Center Hole Overlay) */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4"
                    aria-hidden="true"
                  >
                    {currentActiveCategory ? (
                      <div className="animate-in fade-in zoom-in-95 duration-150 max-w-[130px]">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mb-1"
                          style={{ backgroundColor: currentActiveCategory.color }}
                        />
                        <p className="text-[11px] font-semibold text-slate-700 truncate">
                          {currentActiveCategory.name}
                        </p>
                        <p className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                          {formatCurrency(currentActiveCategory.value, currency)}
                        </p>
                        <span className="inline-block text-[10px] font-medium text-slate-500 mt-0.5 bg-slate-100 px-1.5 py-0.5 rounded">
                          {currentActiveCategory.percentage}% трат
                        </span>
                      </div>
                    ) : (
                      <div className="animate-in fade-in duration-150">
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          Всего
                        </p>
                        <p className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                          {formatCurrency(categoryData.total, currency)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                          {categoryData.count} операций
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtext instruction */}
                <p className="text-[11px] text-center text-slate-400 mb-3">
                  Наведите или нажмите на сектор для детальной информации
                </p>

                {/* Interactive Category List */}
                <div
                  id="category-breakdown-list"
                  className="space-y-1.5 max-h-48 overflow-y-auto pr-1 divide-y divide-slate-100"
                >
                  {categoryData.items.map((cat, index) => {
                    const isHovered = activeIndex === index;
                    return (
                      <div
                        key={cat.category}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                        onClick={() =>
                          setActiveIndex((prev) => (prev === index ? null : index))
                        }
                        className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                          isHovered
                            ? 'bg-slate-100 shadow-2xs font-medium'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform"
                            style={{
                              backgroundColor: cat.color,
                              transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                            }}
                          />
                          <span className="text-slate-800 truncate font-medium">
                            {cat.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-slate-400 text-[11px]">
                            {cat.percentage}%
                          </span>
                          <span className="text-slate-900 font-semibold text-xs">
                            {formatCurrency(cat.amount, currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Dynamic Daily Expenses Bar Chart (7 cols on lg) */}
        <div
          id="daily-expenses-chart-container"
          className="w-full max-w-full lg:col-span-7 bg-white rounded-xl p-4 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between overflow-hidden"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {selectedPeriod === 'week'
                      ? 'Динамика по дням (за 7 дней)'
                      : selectedPeriod === 'today'
                      ? 'Структура расходов за сегодня'
                      : 'Динамика трат по дням'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedPeriod === 'week'
                    ? 'Сравнение расходов за последнюю неделю'
                    : selectedPeriod === 'today'
                    ? 'Категории и объемы за сегодняшний день'
                    : `Дневные суммы (${new Date().toLocaleString('ru-RU', { month: 'long', year: 'numeric' })})`}
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60">
                Сумма: {formatCurrency(categoryData.total, currency)}
              </span>
            </div>

            {dailyChartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400">
                Нет данных для графика за этот период
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailyChartData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
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
                      tickFormatter={(val) =>
                        val >= 1000 ? `${Math.round(val / 1000)}k` : val
                      }
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar
                      dataKey="amount"
                      fill="#0f172a"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Всего транзакций: <strong className="text-slate-800">{categoryData.count}</strong></span>
            <span>Средний чек: <strong className="text-slate-800">{categoryData.count > 0 ? formatCurrency(Math.round(categoryData.total / categoryData.count), currency) : '0'}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Category Budgets & Limit Progress (Full Width Banner below) */}
      <div
        id="category-limits-progress-container"
        className="w-full max-w-full bg-white rounded-xl p-4 sm:p-6 border border-slate-200/80 shadow-xs overflow-hidden"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Лимиты и контроль бюджета по категориям
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Предупреждения при приближении к 80% и превышении месячного порога
            </p>
          </div>
          <button
            id="manage-limits-btn"
            onClick={onOpenLimitsModal}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Настроить лимиты</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List configured limits or prompt */}
        {(!stats?.byCategory || stats.byCategory.filter((c) => c.limit && c.limit > 0).length === 0) ? (
          <div className="py-5 text-center bg-slate-50/70 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-500 mb-2">
              У вас пока не настроены месячные лимиты по категориям.
            </p>
            <button
              onClick={onOpenLimitsModal}
              className="text-xs font-medium px-3.5 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Задать лимиты (например, Продукты 3 000 сомони / 25 000 ₽)
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
                    className="p-3.5 rounded-lg border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-900 truncate">
                        {c.category}
                      </span>
                      <span
                        className={`font-bold ${
                          isOver
                            ? 'text-red-600'
                            : isWarning
                            ? 'text-amber-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {percent}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
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
