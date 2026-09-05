import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { db } from './server/db.ts';
import { telegramService } from './server/telegram.ts';
import { parseExpenseMessage, parseReceiptWithGemini } from './server/categorizer.ts';
import { getCategoryLocalizedName, formatAmountAndCurrency } from './src/types.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

/**
 * Validates Telegram WebApp initData string using HMAC-SHA256 according to official Telegram docs:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
export function verifyTelegramWebAppData(
  initData: string,
  botToken: string
): { verified: boolean; user?: any; authDate?: number } {
  if (!initData || !botToken) return { verified: false };
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { verified: false };

    params.delete('hash');
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys.map((key) => `${key}=${params.get(key)}`).join('\n');

    // secret_key = HMAC-SHA256(key="WebAppData", data=bot_token)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const verified = calculatedHash.toLowerCase() === hash.toLowerCase();
    const userStr = params.get('user');
    const user = userStr ? JSON.parse(userStr) : undefined;
    const authDate = params.get('auth_date') ? parseInt(params.get('auth_date')!, 10) : undefined;

    return { verified, user, authDate };
  } catch (err) {
    console.error('Telegram initData HMAC validation error:', err);
    return { verified: false };
  }
}

// Helper to extract authenticated user from header or query token
function getAuthUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;
  const token = authHeader ? authHeader.replace('Bearer ', '').trim() : queryToken;

  if (token) {
    const user = db.getUserByToken(token);
    if (user) return user;
  }

  // Check header for Telegram WebApp initData if passed directly
  const initDataHeader = req.headers['x-telegram-init-data'] as string | undefined;
  if (initDataHeader) {
    try {
      const params = new URLSearchParams(initDataHeader);
      const userStr = params.get('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.id) {
          return db.getUser(String(u.id), u.first_name, u.username);
        }
      }
    } catch {}
  }

  // Check custom Telegram user ID header (useful for testing and API calls)
  const tgUserIdHeader = req.headers['x-telegram-user-id'] as string | undefined;
  if (tgUserIdHeader) {
    return db.getUser(tgUserIdHeader.trim());
  }

  // Fallback to demo user if no token provided
  return db.getUser('demo_judge');
}

// 1. Bot status & configuration
app.get('/api/bot-status', (req, res) => {
  res.json(telegramService.getStatus());
});

app.post('/api/bot-config/token', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }
  await telegramService.setToken(token);
  res.json(telegramService.getStatus());
});

app.post('/api/bot-config/restart', async (req, res) => {
  await telegramService.restart();
  res.json(telegramService.getStatus());
});

// 2. Auth & Current User
app.get('/api/me', (req, res) => {
  const user = getAuthUser(req);
  res.json({
    user,
    partner: user.partnerTelegramId ? db.getUser(user.partnerTelegramId) : null,
  });
});

// Telegram Web App authentication (handles initData with HMAC-SHA256 and/or user payload)
app.post('/api/auth/telegram-webapp', (req, res) => {
  const { initData, user: rawUser } = req.body;
  const botToken = telegramService.getToken() || process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

  let telegramId = '';
  let firstName = 'Telegram User';
  let username = '';
  let isVerified = false;

  if (initData) {
    if (botToken) {
      const verification = verifyTelegramWebAppData(initData, botToken);
      if (verification.verified && verification.user) {
        isVerified = true;
        telegramId = String(verification.user.id);
        firstName = verification.user.first_name || firstName;
        username = verification.user.username || username;
      }
    }

    // Fallback if bot token is not configured yet or during simulator test
    if (!telegramId) {
      try {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (userStr) {
          const u = JSON.parse(userStr);
          if (u.id) {
            telegramId = String(u.id);
            firstName = u.first_name || firstName;
            username = u.username || username;
          }
        }
      } catch (e) {
        console.error('Error parsing initData:', e);
      }
    }
  }

  if (!telegramId && rawUser && rawUser.id) {
    telegramId = String(rawUser.id);
    firstName = rawUser.first_name || firstName;
    username = rawUser.username || username;
  }

  if (!telegramId) {
    res.status(400).json({ error: 'Не удалось получить данные Telegram пользователя' });
    return;
  }

  const user = db.getUser(telegramId, firstName, username);
  const token = db.createSession(telegramId);
  res.json({ success: true, token, user, verified: isVerified });
});

// Webhook endpoint for Telegram Bot (for Render production deployment)
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;
    if (update && (update.message || update.callback_query)) {
      await telegramService.handleWebhookUpdate(update);
    }
    res.json({ ok: true });
  } catch (e: any) {
    console.error('Webhook error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Verify token generated by /panel command
app.post('/api/auth/token', (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'Token required' });
    return;
  }
  const user = db.getUserByToken(token);
  if (!user) {
    res.status(401).json({ error: 'Недействительный или истекший токен' });
    return;
  }
  res.json({ user, token });
});

// Switch or login account by Telegram ID (allows testing data isolation)
app.post('/api/auth/switch-account', (req, res) => {
  const { telegramId, firstName, username } = req.body;
  if (!telegramId) {
    res.status(400).json({ error: 'telegramId is required' });
    return;
  }
  const cleanId = String(telegramId).trim();
  const user = db.getUser(cleanId, firstName || `User ${cleanId}`, username || '');
  const token = db.createSession(cleanId);
  res.json({ success: true, token, user });
});

// Create a login token for quick switch/demo
app.post('/api/auth/demo-login', (req, res) => {
  const token = db.createSession('demo_judge');
  res.json({ token, user: db.getUser('demo_judge') });
});

// 3. Expenses CRUD
app.get('/api/expenses', (req, res) => {
  const user = getAuthUser(req);
  const expenses = db.getExpenses(user.telegramId);
  res.json(expenses);
});

app.post('/api/expenses', (req, res) => {
  const user = getAuthUser(req);
  const { amount, description, category, currency, date, merchant, rawMessage } = req.body;

  let finalAmount = Number(amount);
  let finalCategory = category;
  let finalDescription = description;
  let finalCurrency = currency || user.currency || 'RUB';

  // If description provided without amount or raw text, parse it
  if (!finalAmount && rawMessage) {
    const parsed = parseExpenseMessage(rawMessage, finalCurrency);
    finalAmount = parsed.amount;
    finalCategory = parsed.category;
    finalDescription = parsed.description;
    finalCurrency = parsed.currency;
  }

  if (!finalAmount || finalAmount <= 0) {
    res.status(400).json({ error: 'Укажите корректную сумму расхода' });
    return;
  }

  const expense = db.addExpense({
    userId: user.telegramId,
    amount: finalAmount,
    currency: finalCurrency,
    category: finalCategory || 'Другое',
    description: finalDescription || 'Расход',
    date: date || new Date().toISOString().split('T')[0],
    merchant,
    rawMessage,
  });

  const limitWarning = db.checkCategoryLimit(user.telegramId, expense.category);

  res.json({
    expense,
    limitWarning,
    stats: db.getStats(user.telegramId),
  });
});

app.put('/api/expenses/:id', (req, res) => {
  const user = getAuthUser(req);
  const { id } = req.params;
  const updates = req.body;

  const updated = db.updateExpense(id, user.telegramId, updates);
  if (!updated) {
    res.status(404).json({ error: 'Трата не найдена' });
    return;
  }

  res.json({
    expense: updated,
    stats: db.getStats(user.telegramId),
  });
});

app.delete('/api/expenses/:id', (req, res) => {
  const user = getAuthUser(req);
  const { id } = req.params;

  const deleted = db.deleteExpense(id, user.telegramId);
  if (!deleted) {
    res.status(404).json({ error: 'Трата не найдена' });
    return;
  }

  res.json({
    success: true,
    stats: db.getStats(user.telegramId),
  });
});

// 4. Statistics
app.get('/api/stats', (req, res) => {
  const user = getAuthUser(req);
  const targetCurrency = (req.query.currency as string) || user.currency || 'TJS';
  res.json(db.getStats(user.telegramId, targetCurrency));
});

// 4.1 Currency rates
app.get('/api/currency-rates', (req, res) => {
  res.json({
    base: 'TJS',
    rates: {
      TJS: 1.0,
      USD: 10.7,
      RUB: 0.107,
      EUR: 11.6,
      KZT: 0.0238,
    },
  });
});

// 5. Category Limits
app.post('/api/limits', (req, res) => {
  const user = getAuthUser(req);
  const { category, monthlyLimit } = req.body;

  if (!category || monthlyLimit === undefined) {
    res.status(400).json({ error: 'Category and monthlyLimit required' });
    return;
  }

  const updatedLimits = { ...user.categoryLimits };
  if (Number(monthlyLimit) <= 0) {
    delete updatedLimits[category];
  } else {
    updatedLimits[category] = Number(monthlyLimit);
  }

  const updated = db.updateUser(user.telegramId, { categoryLimits: updatedLimits });
  res.json({
    user: updated,
    stats: db.getStats(user.telegramId, user.currency),
  });
});

// 6. Currency setting
app.post('/api/me/currency', (req, res) => {
  const user = getAuthUser(req);
  const { currency } = req.body;
  if (!currency) {
    res.status(400).json({ error: 'Currency required' });
    return;
  }
  const updated = db.updateUser(user.telegramId, { currency });
  res.json({
    user: updated,
    stats: db.getStats(user.telegramId, currency),
  });
});

// 7. Shared Budget (Бюджет на двоих)
app.post('/api/shared-budget/link', (req, res) => {
  const user = getAuthUser(req);
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ error: 'Код обязателен' });
    return;
  }

  const result = db.linkPartner(user.telegramId, code);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  res.json({
    success: true,
    message: result.message,
    partner: result.partner,
    stats: db.getStats(user.telegramId),
  });
});

// 8. Receipt AI OCR
app.post('/api/receipt-scan', async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) {
    res.status(400).json({ success: false, error: 'Image data is required' });
    return;
  }

  try {
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
    const result = await parseReceiptWithGemini(cleanBase64, mimeType || 'image/jpeg');

    res.json({
      success: result?.success ?? false,
      amount: result?.amount || 0,
      currency: result?.currency || 'TJS',
      category: result?.category || 'Переводы',
      description: result?.description || result?.title || 'Dushanbe City',
      merchant: result?.merchant || result?.title || 'Dushanbe City',
      date: result?.date || new Date().toISOString().split('T')[0],
      items: result?.items || [],
      error: result?.error,
    });
  } catch (e: any) {
    console.error('API receipt-scan error:', e);
    res.json({
      success: false,
      amount: 0,
      currency: 'TJS',
      category: 'Переводы',
      description: 'Dushanbe City',
      merchant: 'Dushanbe City',
      date: new Date().toISOString().split('T')[0],
      error: 'Чек қабул шуд. Лутфан маблағи чекро дар зер ворид намоед.',
    });
  }
});

// 9. CSV Export
app.get('/api/export-csv', (req, res) => {
  const user = getAuthUser(req);
  const expenses = db.getExpenses(user.telegramId);

  // Generate CSV
  const header = ['ID', 'Дата', 'Категория', 'Описание', 'Сумма', 'Валюта', 'Продавец'].join(';');
  const rows = expenses.map((e) => [
    e.id,
    e.date,
    `"${(e.category || '').replace(/"/g, '""')}"`,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    e.amount,
    e.currency,
    `"${(e.merchant || '').replace(/"/g, '""')}"`,
  ].join(';'));

  const csvContent = '\uFEFF' + [header, ...rows].join('\r\n'); // \uFEFF BOM for Excel Russian encoding

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="expenses_${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csvContent);
});

// 10. Telegram Bot Simulator endpoint
// Allows judges to test typing "кофе 350" or commands right in the browser!
app.post('/api/telegram-sim/message', async (req, res) => {
  const user = getAuthUser(req);
  const { text, photoBase64 } = req.body;

  try {
    let replyText = '';

    if (photoBase64) {
      const cleanBase64 = photoBase64.replace(/^data:image\/\w+;base64,/, '');
      const parsedReceipt = await parseReceiptWithGemini(cleanBase64, 'image/jpeg');
      if (parsedReceipt && parsedReceipt.success && parsedReceipt.amount > 0) {
        db.addExpense({
          userId: user.telegramId,
          amount: parsedReceipt.amount,
          currency: parsedReceipt.currency,
          category: parsedReceipt.category,
          description: parsedReceipt.description || parsedReceipt.title || 'Покупка по чеку',
          merchant: parsedReceipt.merchant || parsedReceipt.title,
          receiptItems: parsedReceipt.items,
          date: parsedReceipt.date,
        });

        replyText = `🧾 Чек бомуваффақият сабт шуд!\n` +
          `Сумма: ${parsedReceipt.amount.toLocaleString('ru-RU')} ${parsedReceipt.currency}\n` +
          `Получатель / Название: ${parsedReceipt.title || parsedReceipt.merchant || '—'}\n` +
          `Категория: ${parsedReceipt.category}\n` +
          (parsedReceipt.items && parsedReceipt.items.length > 0 ? `Товаров в чеке: ${parsedReceipt.items.length} шт.` : '');
      } else {
        replyText = parsedReceipt?.error || 'Маълумоти чек шинохта нашуд. Лутфан чекро равшантар акс гиред ё маблағро бо матн нависед.';
      }
    } else if (text) {
      const simulatedMsg = {
        message_id: Math.floor(Math.random() * 100000),
        chat: { id: user.telegramId, first_name: user.firstName, username: user.username },
        from: { id: user.telegramId, first_name: user.firstName, username: user.username },
        date: Math.floor(Date.now() / 1000),
        text,
      };
      replyText = await telegramService.handleIncomingMessage(simulatedMsg as any);
    }

    res.json({
      reply: replyText,
      stats: db.getStats(user.telegramId),
      expenses: db.getExpenses(user.telegramId),
    });
  } catch (e: any) {
    console.error('Simulator error:', e);
    res.status(500).json({ error: e.message || 'Error processing simulated message' });
  }
});

// Vite middleware & production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Expense Tracker server running on http://localhost:${PORT}`);
  });

  const cleanup = () => {
    telegramService.stopPolling();
    server.close(() => process.exit(0));
  };

  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);
}

startServer();
