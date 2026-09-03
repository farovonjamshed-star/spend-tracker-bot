export interface Expense {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string; // ISO format or YYYY-MM-DD
  createdAt: number;
  rawMessage?: string;
  receiptItems?: Array<{ name: string; price: number; quantity?: number }>;
  merchant?: string;
}

export interface CategoryLimit {
  category: string;
  monthlyLimit: number;
}

export type AppLanguage = 'tg' | 'ru' | 'en';

export interface UserProfile {
  telegramId: string;
  username?: string;
  firstName?: string;
  currency: string;
  preferredLanguage?: AppLanguage;
  categoryLimits: Record<string, number>;
  partnerTelegramId?: string; // For shared budget (бюджет на двоих)
  shareCode?: string;
  createdAt: number;
}

export interface SummaryStats {
  todayTotal: number;
  yesterdayTotal: number;
  weekTotal: number;
  lastWeekTotal: number;
  monthTotal: number;
  lastMonthTotal: number;
  currency: string;
  expenseCount: number;
  byCategory: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
    limit?: number;
    isOverLimit?: boolean;
    color: string;
  }>;
  byDay: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
  topExpenses: Expense[];
}

export interface TelegramBotStatus {
  isConfigured: boolean;
  botUsername?: string;
  botName?: string;
  botUrl?: string;
  activeUsersCount: number;
  totalExpensesCount: number;
  conflictDetected?: boolean;
  lastError?: string;
}

export interface ParsedExpenseInput {
  amount: number;
  currency: string;
  category: string;
  description: string;
  raw: string;
  language?: string;
}

export interface ParsedReceiptResult {
  amount: number;
  currency: string;
  category: string;
  title: string;
  success: boolean;
  error?: string;
  merchant?: string;
  description?: string;
  date?: string;
  items?: Array<{ name: string; price: number; quantity?: number }>;
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Кафе и рестораны': '#f97316', // orange
  'Продукты': '#10b981', // emerald
  'Транспорт и такси': '#3b82f6', // blue
  'Транспорт и авто': '#2563eb', // blue
  'Жилье и ЖКХ': '#6366f1', // indigo
  'Коммунальные услуги': '#4f46e5', // indigo
  'Связь и интернет': '#06b6d4', // cyan
  'Переводы': '#8b5cf6', // purple
  'Покупки и одежда': '#ec4899', // pink
  'Здоровье и аптека': '#ef4444', // red
  'Подписки и сервисы': '#a855f7', // purple
  'Развлечения и отдых': '#f59e0b', // amber
  'Развлечения': '#d97706', // amber
  'Спорт и фитнес': '#14b8a6', // teal
  'Образование': '#0891b2', // cyan
  'Семья и дети': '#84cc16', // lime
  'Другое': '#64748b', // slate
};

export const DEFAULT_CATEGORIES = Object.keys(CATEGORY_COLORS);

export const CATEGORY_TAJIK_NAMES: Record<string, string> = {
  'Кафе и рестораны': 'Қаҳвахона ва тарабхонаҳо',
  'Продукты': 'Маҳсулоти хӯрокворӣ',
  'Транспорт и такси': 'Нақлиёт ва такси',
  'Транспорт и авто': 'Нақлиёт ва худрав',
  'Жилье и ЖКХ': 'Манзил ва коммуналӣ',
  'Коммунальные услуги': 'Хизматрасонии коммуналӣ',
  'Связь и интернет': 'Алоқа ва интернет',
  'Переводы': 'Интиқоли маблағ',
  'Покупки и одежда': 'Харид ва либос',
  'Здоровье и аптека': 'Саломатӣ ва дорухона',
  'Подписки и сервисы': 'Обунаҳо ва хадамот',
  'Развлечения и отдых': 'Фароғат ва истироҳат',
  'Развлечения': 'Фароғат ва дилхушӣ',
  'Спорт и фитнес': 'Варзиш ва фитнес',
  'Образование': 'Маориф ва таҳсил',
  'Семья и дети': 'Оила ва кӯдакон',
  'Другое': 'Дигар',
};

export const CATEGORY_ENGLISH_NAMES: Record<string, string> = {
  'Кафе и рестораны': 'Cafes & Restaurants',
  'Продукты': 'Groceries',
  'Транспорт и такси': 'Transport & Taxi',
  'Транспорт и авто': 'Transport & Auto',
  'Жилье и ЖКХ': 'Housing & Utilities',
  'Коммунальные услуги': 'Utilities',
  'Связь и интернет': 'Telecom & Internet',
  'Переводы': 'Transfers',
  'Покупки и одежда': 'Shopping & Clothes',
  'Здоровье и аптека': 'Health & Pharmacy',
  'Подписки и сервисы': 'Subscriptions & Services',
  'Развлечения и отдых': 'Entertainment & Leisure',
  'Развлечения': 'Entertainment',
  'Спорт и фитнес': 'Sports & Fitness',
  'Образование': 'Education',
  'Семья и дети': 'Family & Kids',
  'Другое': 'Other',
};

export function getCategoryTajikName(cat: string): string {
  return CATEGORY_TAJIK_NAMES[cat] || cat;
}

export function getCategoryLocalizedName(cat: string, lang: AppLanguage): string {
  if (lang === 'tg') return CATEGORY_TAJIK_NAMES[cat] || cat;
  if (lang === 'en') return CATEGORY_ENGLISH_NAMES[cat] || cat;
  return cat; // Russian canonical name
}

export function formatAmountAndCurrency(amount: number, currency: string, lang: AppLanguage): string {
  const formattedAmount = amount.toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU');
  const upperCurr = (currency || 'TJS').toUpperCase();

  if (upperCurr === 'USD' || upperCurr === '$') {
    return lang === 'en' ? `$${formattedAmount}` : `${formattedAmount} $`;
  }
  if (upperCurr === 'EUR' || upperCurr === '€') {
    return lang === 'en' ? `€${formattedAmount}` : `${formattedAmount} €`;
  }
  if (upperCurr === 'TJS') {
    if (lang === 'tg') return `${formattedAmount} сомонӣ`;
    if (lang === 'ru') return `${formattedAmount} сомони`;
    return `${formattedAmount} somoni`;
  }
  if (upperCurr === 'RUB') {
    if (lang === 'tg') return `${formattedAmount} рубл`;
    if (lang === 'ru') return `${formattedAmount} руб.`;
    return `${formattedAmount} RUB`;
  }
  return `${formattedAmount} ${currency}`;
}
