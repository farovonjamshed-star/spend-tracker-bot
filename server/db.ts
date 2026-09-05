import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Expense, UserProfile, SummaryStats } from '../src/types.ts';
import { CATEGORY_COLORS } from '../src/types.ts';

interface DbSchema {
  expenses: Expense[];
  users: Record<string, UserProfile>;
  sessions: Record<string, { telegramId: string; createdAt: number; expiresAt: number }>;
  botToken?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export const CURRENCY_RATES_TO_TJS: Record<string, number> = {
  TJS: 1.0,
  USD: 10.7,      // 1 USD = 10.7 TJS
  RUB: 0.107,     // 1000 RUB = 107 TJS -> 1 RUB = 0.107 TJS
  EUR: 11.6,      // 1 EUR = 11.6 TJS
  KZT: 0.0238,    // 1 KZT = 0.0238 TJS
};

export function convertAmount(amount: number, fromCurrency: string = 'TJS', toCurrency: string = 'TJS'): number {
  if (!amount || isNaN(amount)) return 0;
  const from = (fromCurrency || 'TJS').toUpperCase();
  const to = (toCurrency || 'TJS').toUpperCase();
  if (from === to) return amount;

  const rateFrom = CURRENCY_RATES_TO_TJS[from] ?? 1.0;
  const rateTo = CURRENCY_RATES_TO_TJS[to] ?? 1.0;

  const inTjs = amount * rateFrom;
  return inTjs / rateTo;
}

class Database {
  private data: DbSchema = {
    expenses: [],
    users: {},
    sessions: {},
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(content);
      } else {
        this.seedInitialDemoData();
        this.save();
      }
    } catch (e) {
      console.error('Error initializing database:', e);
      this.seedInitialDemoData();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save database to disk:', e);
    }
  }

  private seedInitialDemoData() {
    const demoId = 'demo_judge';
    const now = new Date();

    const sampleExpenses: Array<{ desc: string; amount: number; cat: string; daysAgo: number }> = [
      { desc: 'Кофе и круассан', amount: 350, cat: 'Кафе и рестораны', daysAgo: 0 },
      { desc: 'Такси в офис', amount: 720, cat: 'Транспорт и такси', daysAgo: 0 },
      { desc: 'Супермаркет ВкусВилл', amount: 2450, cat: 'Продукты', daysAgo: 1 },
      { desc: 'Бизнес-ланч', amount: 490, cat: 'Кафе и рестораны', daysAgo: 1 },
      { desc: 'Подписка Яндекс Плюс', amount: 299, cat: 'Подписки и сервисы', daysAgo: 2 },
      { desc: 'Аптека витамины', amount: 1150, cat: 'Здоровье и аптека', daysAgo: 3 },
      { desc: 'Заправка бензин 95', amount: 2500, cat: 'Транспорт и такси', daysAgo: 4 },
      { desc: 'Заказ Ozon книги', amount: 1890, cat: 'Покупки и одежда', daysAgo: 5 },
      { desc: 'Ужин с друзьями', amount: 3400, cat: 'Кафе и рестораны', daysAgo: 6 },
      { desc: 'Продукты Перекресток', amount: 4120, cat: 'Продукты', daysAgo: 8 },
      { desc: 'Кино билеты', amount: 1200, cat: 'Развлечения и отдых', daysAgo: 10 },
      { desc: 'Абонемент в фитнес', amount: 5000, cat: 'Спорт и фитнес', daysAgo: 12 },
      { desc: 'Квартплата ЖКХ', amount: 6800, cat: 'Жилье и ЖКХ', daysAgo: 15 },
      { desc: 'Кроссовки спорт', amount: 6400, cat: 'Покупки и одежда', daysAgo: 18 },
      { desc: 'Кофе на вынос', amount: 280, cat: 'Кафе и рестораны', daysAgo: 20 },
      { desc: 'Такси аэропорт', amount: 1650, cat: 'Транспорт и такси', daysAgo: 22 },
    ];

    this.data.users[demoId] = {
      telegramId: demoId,
      username: 'judge_demo',
      firstName: 'Судья / Тестер',
      currency: 'TJS',
      preferredLanguage: 'ru',
      categoryLimits: {
        'Кафе и рестораны': 1200,
        'Продукты': 2500,
        'Транспорт и такси': 1000,
        'Развлечения и отдых': 800,
      },
      shareCode: 'DEMO99',
      createdAt: Date.now(),
    };

    // Pre-create session for instant judge preview login
    this.data.sessions['demo-session-token'] = {
      telegramId: demoId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    sampleExpenses.forEach((item, index) => {
      const d = new Date(now);
      d.setDate(d.getDate() - item.daysAgo);
      const dateStr = d.toISOString().split('T')[0];

      this.data.expenses.push({
        id: `demo_${index + 1}`,
        userId: demoId,
        amount: item.amount,
        currency: 'TJS',
        category: item.cat,
        description: item.desc,
        date: dateStr,
        createdAt: d.getTime(),
        merchant: item.desc.split(' ')[1] || item.desc,
      });
    });
  }

  // User methods
  getUser(telegramId: string, firstName?: string, username?: string): UserProfile {
    if (!this.data.users[telegramId]) {
      const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      this.data.users[telegramId] = {
        telegramId,
        username: username || '',
        firstName: firstName || 'Пользователь',
        currency: 'TJS',
        preferredLanguage: 'tg',
        categoryLimits: {
          'Кафе и рестораны': 1500,
          'Продукты': 3000,
          'Транспорт и такси': 1000,
        },
        shareCode,
        createdAt: Date.now(),
      };
      this.save();
    } else {
      let updated = false;
      if (firstName && this.data.users[telegramId].firstName !== firstName) {
        this.data.users[telegramId].firstName = firstName;
        updated = true;
      }
      if (username && this.data.users[telegramId].username !== username) {
        this.data.users[telegramId].username = username;
        updated = true;
      }
      if (updated) this.save();
    }
    return this.data.users[telegramId];
  }

  updateUser(telegramId: string, updates: Partial<UserProfile>): UserProfile {
    const user = this.getUser(telegramId);
    Object.assign(user, updates);
    this.save();
    return user;
  }

  // Sessions
  createSession(telegramId: string): string {
    const token = crypto.randomBytes(24).toString('hex');
    this.data.sessions[token] = {
      telegramId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    this.save();
    return token;
  }

  getUserByToken(token: string): UserProfile | null {
    const session = this.data.sessions[token];
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      delete this.data.sessions[token];
      this.save();
      return null;
    }
    return this.getUser(session.telegramId);
  }

  // Partner linkage for shared budgets ("бюджет на двоих")
  linkPartner(telegramId: string, partnerCode: string): { success: boolean; message: string; partner?: UserProfile } {
    const user = this.getUser(telegramId);
    const target = Object.values(this.data.users).find(
      (u) => u.shareCode === partnerCode.trim().toUpperCase() && u.telegramId !== telegramId
    );

    if (!target) {
      return { success: false, message: 'Код не найден или принадлежит вам' };
    }

    user.partnerTelegramId = target.telegramId;
    target.partnerTelegramId = user.telegramId;
    this.save();

    return {
      success: true,
      message: `Бюджет успешно объединен с пользователем ${target.firstName || target.username || target.telegramId}!`,
      partner: target,
    };
  }

  getBotToken(): string | null {
    return this.data.botToken || null;
  }

  setBotToken(token: string | null) {
    if (token) {
      this.data.botToken = token.trim();
    } else {
      delete this.data.botToken;
    }
    this.save();
  }

  // Expenses methods
  getExpenses(telegramId: string): Expense[] {
    const user = this.getUser(telegramId);
    const allowedIds = [telegramId];
    if (user.partnerTelegramId) {
      allowedIds.push(user.partnerTelegramId);
    }

    return this.data.expenses
      .filter((e) => allowedIds.includes(e.userId))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getExpenseById(id: string): Expense | null {
    return this.data.expenses.find((e) => e.id === id) || null;
  }

  addExpense(item: {
    userId: string;
    amount: number;
    currency?: string;
    category?: string;
    description: string;
    date?: string;
    rawMessage?: string;
    receiptItems?: Array<{ name: string; price: number; quantity?: number }>;
    merchant?: string;
  }): Expense {
    const user = this.getUser(item.userId);
    const todayStr = new Date().toISOString().split('T')[0];

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      userId: item.userId,
      amount: Math.abs(Number(item.amount)),
      currency: item.currency || user.currency || 'TJS',
      category: item.category || 'Другое',
      description: item.description || 'Расход',
      date: item.date || todayStr,
      createdAt: Date.now(),
      rawMessage: item.rawMessage,
      receiptItems: item.receiptItems,
      merchant: item.merchant,
    };

    this.data.expenses.unshift(newExpense);
    this.save();
    return newExpense;
  }

  updateExpense(id: string, telegramId: string, updates: Partial<Expense>): Expense | null {
    const user = this.getUser(telegramId);
    const allowedIds = [telegramId];
    if (user.partnerTelegramId) allowedIds.push(user.partnerTelegramId);

    const index = this.data.expenses.findIndex((e) => e.id === id && allowedIds.includes(e.userId));
    if (index === -1) return null;

    const current = this.data.expenses[index];
    const updated: Expense = {
      ...current,
      ...updates,
      id: current.id,
      userId: current.userId,
      amount: updates.amount !== undefined ? Math.abs(Number(updates.amount)) : current.amount,
    };

    this.data.expenses[index] = updated;
    this.save();
    return updated;
  }

  deleteExpense(id: string, telegramId: string): boolean {
    const user = this.getUser(telegramId);
    const allowedIds = [telegramId];
    if (user.partnerTelegramId) allowedIds.push(user.partnerTelegramId);

    const prevLength = this.data.expenses.length;
    this.data.expenses = this.data.expenses.filter((e) => !(e.id === id && allowedIds.includes(e.userId)));
    const deleted = this.data.expenses.length < prevLength;
    if (deleted) this.save();
    return deleted;
  }

  // Statistics calculation for telegramId with dynamic currency conversion
  getStats(telegramId: string, requestedCurrency?: string): SummaryStats {
    const user = this.getUser(telegramId);
    const expenses = this.getExpenses(telegramId);
    const targetCurrency = (requestedCurrency || user.currency || 'TJS').toUpperCase();
    const isDecimalCurrency = targetCurrency === 'USD' || targetCurrency === 'EUR';

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Current week calculation (Monday to Sunday)
    const dayOfWeek = now.getDay() || 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    // Current month start
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    let todayTotal = 0;
    let yesterdayTotal = 0;
    let weekTotal = 0;
    let lastWeekTotal = 0;
    let monthTotal = 0;
    let lastMonthTotal = 0;

    const catTotals: Record<string, { amount: number; count: number }> = {};
    const dayTotals: Record<string, { amount: number; count: number }> = {};

    expenses.forEach((e) => {
      const expDate = new Date(e.date + 'T00:00:00');
      // Convert raw amount to active target currency
      const convertedVal = convertAmount(e.amount, e.currency || 'TJS', targetCurrency);

      // Month stats
      if (expDate >= startOfMonth && expDate <= now) {
        monthTotal += convertedVal;

        // Categories this month
        if (!catTotals[e.category]) {
          catTotals[e.category] = { amount: 0, count: 0 };
        }
        catTotals[e.category].amount += convertedVal;
        catTotals[e.category].count += 1;

        // Days this month
        const dKey = e.date;
        if (!dayTotals[dKey]) {
          dayTotals[dKey] = { amount: 0, count: 0 };
        }
        dayTotals[dKey].amount += convertedVal;
        dayTotals[dKey].count += 1;
      }

      if (expDate >= startOfLastMonth && expDate <= endOfLastMonth) {
        lastMonthTotal += convertedVal;
      }

      // Today / Yesterday
      if (e.date === todayStr) todayTotal += convertedVal;
      if (e.date === yesterdayStr) yesterdayTotal += convertedVal;

      // Week / Last week
      if (expDate >= startOfWeek && expDate <= now) weekTotal += convertedVal;
      if (expDate >= startOfLastWeek && expDate < startOfWeek) lastWeekTotal += convertedVal;
    });

    const roundVal = (num: number) => (isDecimalCurrency ? Number(num.toFixed(2)) : Math.round(num));

    const byCategory = Object.entries(catTotals).map(([cat, val]) => {
      const rawLimit = user.categoryLimits[cat];
      const limit = rawLimit ? roundVal(convertAmount(rawLimit, 'TJS', targetCurrency)) : undefined;
      const isOverLimit = limit ? val.amount > limit : false;
      return {
        category: cat,
        amount: roundVal(val.amount),
        count: val.count,
        percentage: monthTotal > 0 ? Math.round((val.amount / monthTotal) * 100) : 0,
        limit,
        isOverLimit,
        color: CATEGORY_COLORS[cat] || '#94a3b8',
      };
    }).sort((a, b) => b.amount - a.amount);

    // Days array for current month (all days up to today or all 30 days)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const byDay: Array<{ date: string; amount: number; count: number }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(now.getFullYear(), now.getMonth(), day);
      const str = d.toISOString().split('T')[0];
      const found = dayTotals[str] || { amount: 0, count: 0 };
      byDay.push({
        date: str,
        amount: roundVal(found.amount),
        count: found.count,
      });
    }

    return {
      todayTotal: roundVal(todayTotal),
      yesterdayTotal: roundVal(yesterdayTotal),
      weekTotal: roundVal(weekTotal),
      lastWeekTotal: roundVal(lastWeekTotal),
      monthTotal: roundVal(monthTotal),
      lastMonthTotal: roundVal(lastMonthTotal),
      currency: targetCurrency,
      expenseCount: expenses.length,
      byCategory,
      byDay,
      topExpenses: expenses.slice(0, 5),
    };
  }

  // Check category limit warning
  checkCategoryLimit(telegramId: string, category: string): { isExceeded: boolean; percentage: number; limit: number; currentMonthTotal: number } | null {
    const user = this.getUser(telegramId);
    const limit = user.categoryLimits[category];
    if (!limit || limit <= 0) return null;

    const stats = this.getStats(telegramId);
    const found = stats.byCategory.find((c) => c.category === category);
    const currentMonthTotal = found ? found.amount : 0;
    const percentage = Math.round((currentMonthTotal / limit) * 100);

    return {
      isExceeded: currentMonthTotal >= limit,
      percentage,
      limit,
      currentMonthTotal,
    };
  }

  getAllUsersCount(): number {
    return Object.keys(this.data.users).length;
  }

  getAllExpensesCount(): number {
    return this.data.expenses.length;
  }
}

export const db = new Database();
