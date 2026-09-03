import { db } from './db.ts';
import { parseExpenseMessage, parseReceiptWithGemini, detectCategory, askExpenseAssistant } from './categorizer.ts';
import { DEFAULT_CATEGORIES } from '../src/types.ts';
import type { ParsedExpenseInput, Expense } from '../src/types.ts';

interface TelegramUser {
  id: number | string;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number | string; first_name?: string; username?: string };
  date: number;
  text?: string;
  caption?: string;
  photo?: Array<{ file_id: string; file_size?: number; width: number; height: number }>;
  document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramRawResponse<T = any> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
  parameters?: {
    retry_after?: number;
    migrate_to_chat_id?: number;
  };
}

export class TelegramService {
  private token: string | null = null;
  private botUsername: string | null = null;
  private botFirstName: string | null = null;
  private isPolling: boolean = false;
  private isPollingLoopRunning: boolean = false;
  private pollSessionId: number = 0;
  private activeAbortController: AbortController | null = null;
  private lastUpdateId: number = 0;
  private pollTimeout: NodeJS.Timeout | null = null;
  private appUrl: string = '';
  private conflictDetected: boolean = false;
  private consecutiveConflicts: number = 0;
  private lastError: string | null = null;

  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || db.getBotToken() || null;
    this.appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    if (this.token) {
      this.initBot();
    }
  }

  public async setToken(newToken: string) {
    this.stopPolling();
    this.token = newToken.trim() || null;
    db.setBotToken(this.token);
    this.conflictDetected = false;
    this.consecutiveConflicts = 0;
    this.lastError = null;

    if (this.token) {
      await new Promise((r) => setTimeout(r, 600));
      await this.initBot();
    } else {
      this.botUsername = null;
      this.botFirstName = null;
    }
  }

  public async restart() {
    this.stopPolling();
    this.conflictDetected = false;
    this.consecutiveConflicts = 0;
    this.lastError = null;
    await new Promise((r) => setTimeout(r, 1200));
    if (this.token) {
      await this.initBot();
    }
  }

  public getStatus() {
    return {
      isConfigured: !!this.token,
      botUsername: this.botUsername || undefined,
      botName: this.botFirstName || undefined,
      botUrl: this.botUsername ? `https://t.me/${this.botUsername}` : undefined,
      activeUsersCount: db.getAllUsersCount(),
      totalExpensesCount: db.getAllExpensesCount(),
      conflictDetected: this.conflictDetected,
      lastError: this.lastError || undefined,
    };
  }

  private async rawApiCall<T = any>(
    method: string,
    body: Record<string, any> = {},
    signal?: AbortSignal
  ): Promise<TelegramRawResponse<T>> {
    if (!this.token) {
      return { ok: false, error_code: 400, description: 'Token not set' };
    }
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
      const data = await response.json();
      return data;
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return { ok: false, error_code: 0, description: 'Aborted' };
      }
      return { ok: false, error_code: 500, description: e.message || 'Network error' };
    }
  }

  private async apiCall(method: string, body: Record<string, any> = {}, signal?: AbortSignal) {
    const data = await this.rawApiCall(method, body, signal);
    if (!data.ok) {
      if (data.description !== 'Aborted') {
        if (data.error_code === 409 || data.description?.includes('Conflict')) {
          this.conflictDetected = true;
          this.lastError = data.description || 'Conflict with another bot instance';
        } else {
          console.warn(`Telegram API error [${method}]:`, data.description);
        }
      }
      return null;
    }
    return data.result;
  }

  private async initBot() {
    try {
      const me = await this.apiCall('getMe');
      if (me) {
        this.botUsername = me.username;
        this.botFirstName = me.first_name;
        console.log(`Telegram bot connected as @${me.username} (${me.first_name})`);

        // Ensure webhook is cleared so getUpdates polling does not conflict
        try {
          await this.rawApiCall('deleteWebhook', { drop_pending_updates: false });
        } catch {}

        // Set commands list for autocomplete in Telegram
        await this.apiCall('setMyCommands', {
          commands: [
            { command: 'menu', description: 'Главное меню и кнопки' },
            { command: 'days', description: 'Расход по дням' },
            { command: 'history', description: 'История операций' },
            { command: 'today', description: 'Расходы за сегодня' },
            { command: 'week', description: 'Отчет за эту неделю' },
            { command: 'month', description: 'Отчет за текущий месяц' },
            { command: 'panel', description: 'Открыть веб-панель' },
            { command: 'limits', description: 'Лимиты по категориям' },
            { command: 'export', description: 'Выгрузить расходы (CSV)' },
            { command: 'share', description: 'Совместный бюджет' },
            { command: 'help', description: 'Инструкция и команды' },
          ],
        });

        this.startPolling();
      } else {
        console.warn('Telegram bot token appears invalid or network is unreachable');
      }
    } catch (e) {
      console.error('Error during initBot:', e);
    }
  }

  private startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;
    const session = ++this.pollSessionId;
    this.pollUpdates(session);
  }

  public stopPolling() {
    this.isPolling = false;
    this.pollSessionId++; // Invalidate active polling session
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {}
      this.activeAbortController = null;
    }
    this.isPollingLoopRunning = false;
  }

  private async pollUpdates(sessionId: number) {
    if (!this.isPolling || !this.token || sessionId !== this.pollSessionId) {
      return;
    }

    if (this.isPollingLoopRunning) {
      return;
    }

    this.isPollingLoopRunning = true;
    let nextDelay = 500;

    try {
      this.activeAbortController = new AbortController();
      const response = await this.rawApiCall<TelegramUpdate[]>('getUpdates', {
        offset: this.lastUpdateId + 1,
        timeout: 10,
        allowed_updates: ['message', 'callback_query'],
      }, this.activeAbortController.signal);

      if (!this.isPolling || sessionId !== this.pollSessionId) {
        return;
      }

      if (response.ok && response.result) {
        if (this.conflictDetected) {
          console.log('[Telegram Bot] Connection established cleanly without conflicts.');
        }
        this.conflictDetected = false;
        this.consecutiveConflicts = 0;
        this.lastError = null;

        if (Array.isArray(response.result)) {
          for (const update of response.result) {
            this.lastUpdateId = update.update_id;
            if (update.message) {
              await this.handleIncomingMessage(update.message);
            } else if (update.callback_query) {
              await this.handleCallbackQuery(update.callback_query);
            }
          }
        }
        nextDelay = 400;
      } else {
        const desc = response.description || '';
        const isConflict = response.error_code === 409 || desc.toLowerCase().includes('conflict');

        if (isConflict) {
          this.consecutiveConflicts++;
          this.conflictDetected = true;
          this.lastError = 'Конфликт: бот запущен в другом месте (Conflict: terminated by other getUpdates request)';

          if (this.consecutiveConflicts === 1 || this.consecutiveConflicts % 5 === 0) {
            console.warn(`[Telegram Bot] Conflict detected (#${this.consecutiveConflicts}): another instance is polling getUpdates. Backing off before retry...`);
          }

          try {
            await this.rawApiCall('deleteWebhook', { drop_pending_updates: false });
          } catch {}

          // Exponential backoff: 5s, 10s, 15s, up to 30s
          nextDelay = Math.min(5000 * this.consecutiveConflicts, 30000);
        } else if (response.error_code === 429) {
          const retrySec = response.parameters?.retry_after || 10;
          console.warn(`[Telegram Bot] Rate limited by Telegram API. Waiting ${retrySec}s.`);
          nextDelay = retrySec * 1000;
        } else if (response.error_code === 401 || response.error_code === 404) {
          console.warn('[Telegram Bot] Invalid or revoked bot token. Stopping polling.');
          this.lastError = 'Неверный или отозванный токен бота (Unauthorized)';
          this.stopPolling();
          return;
        } else if (desc === 'Aborted') {
          return;
        } else {
          nextDelay = 3000;
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error('[Telegram Bot] Unexpected polling error:', e);
      }
      nextDelay = 5000;
    } finally {
      this.isPollingLoopRunning = false;
      this.activeAbortController = null;
    }

    if (this.isPolling && sessionId === this.pollSessionId) {
      this.pollTimeout = setTimeout(() => {
        this.pollUpdates(sessionId);
      }, nextDelay);
    }
  }

  private getWebPanelUrl(telegramId: string): string {
    const token = db.createSession(telegramId);
    return `${this.appUrl}/panel?token=${token}`;
  }

  public getMainReplyKeyboard(telegramId: string) {
    const panelUrl = this.getWebPanelUrl(telegramId);
    return {
      keyboard: [
        [
          { text: '📅 Расход по дням' },
          { text: '📜 История операций' },
        ],
        [
          { text: '📈 Статистика' },
          { text: '📊 Веб-панель', web_app: { url: panelUrl } },
        ],
        [
          { text: '➕ Добавить расход' },
          { text: '⚙️ Настройки и лимиты' },
        ],
      ],
      resize_keyboard: true,
      is_persistent: true,
    };
  }

  public async handleIncomingMessage(msg: TelegramMessage): Promise<string> {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from?.id || chatId);
    const firstName = msg.from?.first_name || msg.chat.first_name || 'Пользователь';
    const username = msg.from?.username || msg.chat.username;

    // Ensure user profile in DB
    db.getUser(telegramId, firstName, username);

    // 1. Check for photo or image document message (Receipt Recognition)
    if (msg.photo && msg.photo.length > 0) {
      const photoResult = await this.handlePhotoReceipt(chatId, telegramId, msg.photo, msg.caption);
      return photoResult;
    }

    if (
      msg.document &&
      (msg.document.mime_type?.startsWith('image/') ||
        msg.document.file_name?.match(/\.(jpg|jpeg|png|webp|heic)$/i))
    ) {
      const docResult = await this.handlePhotoReceipt(
        chatId,
        telegramId,
        [{ file_id: msg.document.file_id }],
        msg.caption
      );
      return docResult;
    }

    const text = (msg.text || msg.caption || '').trim();
    if (!text) return '';

    const lower = text.toLowerCase();

    // 2. Commands & Bottom Keyboard handlers
    if (text.startsWith('/start') || text.startsWith('/menu') || lower === 'меню' || lower === 'menu') {
      return this.sendWelcomeMessage(chatId, telegramId, firstName);
    }

    if (
      text.startsWith('/days') ||
      lower.includes('расход по дням') ||
      lower.includes('по дням') ||
      lower.includes('аз рӯи рӯз') ||
      lower === '📅 расход по дням'
    ) {
      return this.sendDailyBreakdown(chatId, telegramId);
    }

    if (
      text.startsWith('/history') ||
      lower.includes('история операций') ||
      lower.includes('история') ||
      lower.includes('таърихи амалиёт') ||
      lower.includes('таърих') ||
      lower === '📜 история операций'
    ) {
      return this.sendOperationsHistory(chatId, telegramId);
    }

    if (
      text.startsWith('/stats') ||
      lower.includes('статистика') ||
      lower.includes('омор') ||
      lower.includes('отчет') ||
      lower === '📈 статистика'
    ) {
      return this.sendMonthSummary(chatId, telegramId);
    }

    if (
      text.startsWith('/panel') ||
      text.startsWith('/web') ||
      lower.includes('веб-панель') ||
      lower.includes('панель') ||
      lower.includes('панел') ||
      lower === '📊 веб-панель'
    ) {
      return this.sendPanelLink(chatId, telegramId);
    }

    if (
      lower.includes('сабти хароҷот') ||
      lower.includes('добавить расход') ||
      lower.includes('как записать') ||
      lower === '➕ сабти хароҷот' ||
      lower === '➕ добавить расход'
    ) {
      return this.sendExpenseGuide(chatId, telegramId);
    }

    if (
      text.startsWith('/last') ||
      lower === 'последняя' ||
      lower === 'последняя трата' ||
      lower === 'охирин'
    ) {
      return this.sendLastExpense(chatId, telegramId);
    }

    if (
      text.startsWith('/delete') ||
      text.startsWith('/del') ||
      lower === 'удалить' ||
      lower === 'отмена' ||
      lower === 'удалить последнюю' ||
      lower === 'бекор'
    ) {
      return this.handleDeleteLastExpense(chatId, telegramId);
    }

    if (text.startsWith('/edit') || text.startsWith('/fix') || lower.startsWith('исправить')) {
      return this.handleEditLastExpense(chatId, telegramId, text);
    }

    if (
      text.startsWith('/limits') ||
      lower.includes('настройки и лимиты') ||
      lower.includes('настройки') ||
      lower.includes('лимиты') ||
      lower.includes('танзимот') ||
      lower === '⚙️ настройки и лимиты'
    ) {
      return this.sendLimitsSummary(chatId, telegramId);
    }

    if (text.startsWith('/today') || lower === 'сегодня' || lower === 'имрӯз') {
      return this.sendTodaySummary(chatId, telegramId);
    }

    if (text.startsWith('/week') || lower === 'неделя' || lower === 'ҳафта') {
      return this.sendWeekSummary(chatId, telegramId);
    }

    if (text.startsWith('/month') || lower === 'месяц' || lower === 'моҳ') {
      return this.sendMonthSummary(chatId, telegramId);
    }

    if (text.startsWith('/limit')) {
      return this.handleSetLimitCommand(chatId, telegramId, text);
    }

    if (text.startsWith('/share') || lower === 'совместный' || lower === 'шеринг' || lower === 'шарик') {
      return this.handleShareCommand(chatId, telegramId, text);
    }

    if (text.startsWith('/export') || lower === 'экспорт' || lower === 'выгрузка') {
      return this.handleExportCommand(chatId, telegramId);
    }

    if (text.startsWith('/help') || lower === 'помощь' || lower === 'кӯмак' || lower === 'ёрӣ') {
      return this.sendHelpMessage(chatId);
    }

    // 3. Regular expense message or general inquiry
    return this.handleExpenseInput(chatId, telegramId, text);
  }

  private async handleExpenseInput(
    chatId: number | string,
    telegramId: string,
    text: string
  ): Promise<string> {
    const user = db.getUser(telegramId);
    const parsed = parseExpenseMessage(text, user.currency || 'RUB');

    // If no numeric amount detected, the user might be asking a question or greeting
    if (parsed.amount <= 0) {
      const stats = db.getStats(telegramId);
      const statsSummary = `Расходы сегодня: ${stats.todayTotal} ${stats.currency}, расходы за месяц: ${stats.monthTotal} ${stats.currency}`;
      const reply = await askExpenseAssistant(text, { userName: user.firstName, statsSummary });

      if (this.token) {
        await this.apiCall('sendMessage', {
          chat_id: chatId,
          text: reply,
          parse_mode: 'Markdown',
        });
      }
      return reply;
    }

    // Add expense to DB
    const expense = db.addExpense({
      userId: telegramId,
      amount: parsed.amount,
      currency: parsed.currency,
      category: parsed.category,
      description: parsed.description,
      rawMessage: text,
    });

    // Check category limit
    const limitCheck = db.checkCategoryLimit(telegramId, parsed.category);
    let limitWarning = '';
    if (limitCheck) {
      if (limitCheck.isExceeded) {
        limitWarning = `\n\n⚠️ *Внимание:* превышен лимит по категории «${parsed.category}» (${limitCheck.percentage}% от ${limitCheck.limit} ${parsed.currency})!`;
      } else if (limitCheck.percentage >= 80) {
        limitWarning = `\n\n⚠️ Израсходовано ${limitCheck.percentage}% месячного лимита по категории «${parsed.category}».`;
      }
    }

    const stats = db.getStats(telegramId);
    const categoryIcon = this.getCategoryEmoji(parsed.category);

    const reply = `✅ Записано: *${parsed.amount.toLocaleString('ru-RU')} ${parsed.currency}*\n` +
      `${categoryIcon} Категория: *${parsed.category}*\n` +
      `📝 Описание: ${parsed.description}\n` +
      `📅 Расходы за сегодня: *${stats.todayTotal.toLocaleString('ru-RU')} ${parsed.currency}*` +
      limitWarning;

    if (this.token) {
      const panelUrl = this.getWebPanelUrl(telegramId);
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text: reply,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✏️ Сменить категорию', callback_data: `pick_cat_${expense.id}` },
              { text: '🗑️ Удалить', callback_data: `del_${expense.id}` },
            ],
            [
              { text: '📊 Открыть веб-панель', web_app: { url: panelUrl } },
            ],
          ],
        },
      });
    }

    return reply;
  }

  private async handlePhotoReceipt(
    chatId: number | string,
    telegramId: string,
    photos: Array<{ file_id: string }>,
    caption?: string
  ): Promise<string> {
    if (!this.token) {
      return 'Фото чеков можно обрабатывать при активном боте.';
    }

    await this.apiCall('sendMessage', {
      chat_id: chatId,
      text: '🧾 Распознаю чек с помощью ИИ...',
    });

    try {
      const fileId = photos[photos.length - 1].file_id;
      const fileInfo = await this.apiCall('getFile', { file_id: fileId });

      if (!fileInfo || !fileInfo.file_path) {
        throw new Error('Could not get photo file path');
      }

      const fileUrl = `https://api.telegram.org/file/bot${this.token}/${fileInfo.file_path}`;
      const res = await fetch(fileUrl);
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      const parsedReceipt = await parseReceiptWithGemini(base64, 'image/jpeg');

      if (!parsedReceipt || !parsedReceipt.success || parsedReceipt.amount <= 0) {
        const title = parsedReceipt?.title || parsedReceipt?.merchant || 'Dushanbe City';
        const errorMsg = `📸 *Расми чек қабул шуд (${title})!*\n\n` +
          `Аммо маблағи дақиқро муайян карда натавонистем.\n` +
          `Лутфан маблағи онро бо паём нависед, масалан:\n` +
          `\`50 ${title}\` ё \`100 перевод\`, ва он фавран ба рӯйхати хароҷотҳо илова мешавад!`;
        await this.apiCall('sendMessage', {
          chat_id: chatId,
          text: errorMsg,
          parse_mode: 'Markdown',
        });
        return errorMsg;
      }

      const merchantTitle = parsedReceipt.title || parsedReceipt.merchant || 'Чек';
      const expense = db.addExpense({
        userId: telegramId,
        amount: parsedReceipt.amount,
        currency: parsedReceipt.currency,
        category: parsedReceipt.category,
        description: parsedReceipt.description || parsedReceipt.title || merchantTitle,
        merchant: merchantTitle,
        receiptItems: parsedReceipt.items,
        date: parsedReceipt.date,
      });

      const reply = `🧾 *Чек бомуваффақият сабт шуд!*\n\n` +
        `💰 Маблағ: *${parsedReceipt.amount.toLocaleString('ru-RU')} ${parsedReceipt.currency}*\n` +
        `🏪 Дӯкон / Гиранда: *${merchantTitle}*\n` +
        `📁 Категория: *${parsedReceipt.category}*\n` +
        `📝 Тафсилот: ${parsedReceipt.description}\n` +
        `📅 Сана: ${parsedReceipt.date}` +
        (parsedReceipt.items && parsedReceipt.items.length > 0
          ? `\n🛍 Маҳсулот дар чек: ${parsedReceipt.items.length} дона`
          : '');

      const panelUrl = this.getWebPanelUrl(telegramId);
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text: reply,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🗑️ Удалить', callback_data: `del_${expense.id}` },
              { text: '📊 Открыть веб-панель', web_app: { url: panelUrl } },
            ],
          ],
        },
      });

      return reply;
    } catch (e) {
      console.error('Photo receipt processing error:', e);
      const msg = 'Произошла ошибка при распознавании чека. Пожалуйста, сфотографируйте чек четче или напишите расход текстом.';
      await this.apiCall('sendMessage', { chat_id: chatId, text: msg });
      return msg;
    }
  }

  public async handleCallbackQuery(query: TelegramCallbackQuery) {
    const data = query.data || '';
    const telegramId = String(query.from.id);
    const chatId = query.message?.chat.id || query.from.id;
    const messageId = query.message?.message_id;

    if (data === 'summary_today') {
      await this.apiCall('answerCallbackQuery', { callback_query_id: query.id });
      await this.sendTodaySummary(chatId, telegramId);
      return;
    }

    if (data === 'summary_week') {
      await this.apiCall('answerCallbackQuery', { callback_query_id: query.id });
      await this.sendWeekSummary(chatId, telegramId);
      return;
    }

    if (data === 'summary_month') {
      await this.apiCall('answerCallbackQuery', { callback_query_id: query.id });
      await this.sendMonthSummary(chatId, telegramId);
      return;
    }

    if (data.startsWith('del_')) {
      const expenseId = data.replace('del_', '');
      const expense = db.getExpenseById(expenseId);
      const success = db.deleteExpense(expenseId, telegramId);

      await this.apiCall('answerCallbackQuery', {
        callback_query_id: query.id,
        text: success ? 'Трата удалена' : 'Не удалось удалить',
      });

      if (success && messageId) {
        const desc = expense ? `${expense.amount} ${expense.currency} (${expense.description})` : '';
        await this.apiCall('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: `🗑️ Трата *${desc}* удалена.`,
          parse_mode: 'Markdown',
        });
      }
      return;
    }

    if (data.startsWith('pick_cat_')) {
      const expenseId = data.replace('pick_cat_', '');
      const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];

      for (let i = 0; i < DEFAULT_CATEGORIES.length; i += 2) {
        const row: Array<{ text: string; callback_data: string }> = [];
        const cat1 = DEFAULT_CATEGORIES[i];
        row.push({
          text: `${this.getCategoryEmoji(cat1)} ${cat1}`,
          callback_data: `set_cat_${expenseId}_${cat1}`,
        });
        if (i + 1 < DEFAULT_CATEGORIES.length) {
          const cat2 = DEFAULT_CATEGORIES[i + 1];
          row.push({
            text: `${this.getCategoryEmoji(cat2)} ${cat2}`,
            callback_data: `set_cat_${expenseId}_${cat2}`,
          });
        }
        keyboard.push(row);
      }

      await this.apiCall('answerCallbackQuery', { callback_query_id: query.id });
      if (messageId) {
        await this.apiCall('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: 'Выберите новую категорию:',
          reply_markup: { inline_keyboard: keyboard },
        });
      }
      return;
    }

    if (data.startsWith('set_cat_')) {
      const parts = data.replace('set_cat_', '').split('_');
      const expenseId = parts[0];
      const category = parts.slice(1).join('_');

      const updated = db.updateExpense(expenseId, telegramId, { category });

      await this.apiCall('answerCallbackQuery', {
        callback_query_id: query.id,
        text: `Категория изменена на «${category}»`,
      });

      if (updated && messageId) {
        await this.apiCall('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: `✅ Категория обновлена:\n*${updated.amount} ${updated.currency}* — ${this.getCategoryEmoji(category)} *${category}*`,
          parse_mode: 'Markdown',
        });
      }
      return;
    }

    await this.apiCall('answerCallbackQuery', { callback_query_id: query.id });
  }

  public async sendWelcomeMessage(
    chatId: number | string,
    telegramId: string,
    firstName: string
  ): Promise<string> {
    const user = db.getUser(telegramId);
    const currency = user.currency || 'TJS';
    const panelUrl = this.getWebPanelUrl(telegramId);

    const message = `👋 Привет, *${firstName}*! Я твой персональный трекер расходов в Telegram.\n\n` +
      `Никаких сложных форм и регистраций: просто отправь мне трату одним сообщением:\n` +
      `• \`кофе 350\`\n` +
      `• \`такси 900 работа\`\n` +
      `• \`продукты 1850 супермаркет\`\n` +
      `• \`50$ ужин\` (мультивалютность: TJS, RUB, USD, EUR)\n` +
      `• \`50 нону шир\` / \`150 алиф\`\n\n` +
      `📸 **Или пришли фото чека** (Alif mobi, DC Next, супермаркеты, АЗС) — сумма, магазин и категория распознаются автоматически с помощью ИИ!\n\n` +
      `📊 **Веб-панель:** вход без пароля по кнопке ниже.\n` +
      `⚡ **Команды:** /today, /week, /month, /last, /delete, /edit, /limits, /share, /export, /help.`;

    if (this.token) {
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: this.getMainReplyKeyboard(telegramId),
      });
    }

    return message;
  }

  public async sendLastExpense(
    chatId: number | string,
    telegramId: string
  ): Promise<string> {
    const expenses = db.getExpenses(telegramId);
    if (expenses.length === 0) {
      const msg = 'У вас пока нет сохраненных трат. Напишите, например: `кофе 350` или `такси 900 работа`.';
      if (this.token) {
        await this.apiCall('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
      }
      return msg;
    }

    const last = expenses[0];
    const categoryIcon = this.getCategoryEmoji(last.category);
    const panelUrl = this.getWebPanelUrl(telegramId);

    const msg = `📌 *Последняя трата:*\n\n` +
      `💰 Сумма: *${last.amount.toLocaleString('ru-RU')} ${last.currency}*\n` +
      `${categoryIcon} Категория: *${last.category}*\n` +
      `📝 Описание: ${last.description}\n` +
      `📅 Дата: ${last.date}\n\n` +
      `Вы можете удалить эту трату, изменить категорию или открыть веб-панель:`;

    if (this.token) {
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✏️ Сменить категорию', callback_data: `pick_cat_${last.id}` },
              { text: '🗑️ Удалить', callback_data: `del_${last.id}` },
            ],
            [
              { text: '📊 Открыть веб-панель', web_app: { url: panelUrl } },
            ],
          ],
        },
      });
    }
    return msg;
  }

  public async handleDeleteLastExpense(
    chatId: number | string,
    telegramId: string
  ): Promise<string> {
    const expenses = db.getExpenses(telegramId);
    if (expenses.length === 0) {
      const msg = 'У вас нет трат для удаления.';
      if (this.token) {
        await this.apiCall('sendMessage', { chat_id: chatId, text: msg });
      }
      return msg;
    }

    const last = expenses[0];
    const deleted = db.deleteExpense(last.id, telegramId);

    const msg = deleted
      ? `🗑️ Трата *${last.amount} ${last.currency}* («${last.description}») успешно удалена.`
      : 'Не удалось удалить трату.';

    if (this.token) {
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown',
        reply_markup: this.getMainReplyKeyboard(telegramId),
      });
    }
    return msg;
  }

  public async handleEditLastExpense(
    chatId: number | string,
    telegramId: string,
    text: string
  ): Promise<string> {
    const expenses = db.getExpenses(telegramId);
    if (expenses.length === 0) {
      const msg = 'У вас нет трат для редактирования.';
      if (this.token) {
        await this.apiCall('sendMessage', { chat_id: chatId, text: msg });
      }
      return msg;
    }

    const last = expenses[0];
    const cleanText = text
      .replace(/^\/(?:edit|fix)\s*/i, '')
      .replace(/^исправить\s*/i, '')
      .trim();

    if (!cleanText) {
      const msg = `Чтобы исправить последнюю трату, укажите новую сумму или описание, например:\n\`/edit 900\` или \`/edit 350 латте\``;
      if (this.token) {
        await this.apiCall('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
      }
      return msg;
    }

    const parsed = parseExpenseMessage(cleanText, last.currency);
    const updates: Partial<Expense> = {};
    if (parsed.amount > 0) updates.amount = parsed.amount;
    if (parsed.currency) updates.currency = parsed.currency;
    if (parsed.description && parsed.description !== 'Расход') updates.description = parsed.description;
    if (parsed.category && parsed.category !== 'Другое') updates.category = parsed.category;

    const updated = db.updateExpense(last.id, telegramId, updates);
    if (!updated) {
      const msg = 'Не удалось обновить трату.';
      if (this.token) {
        await this.apiCall('sendMessage', { chat_id: chatId, text: msg });
      }
      return msg;
    }

    const panelUrl = this.getWebPanelUrl(telegramId);
    const msg = `✏️ *Трата успешно обновлена!*\n\n` +
      `💰 Новая сумма: *${updated.amount.toLocaleString('ru-RU')} ${updated.currency}*\n` +
      `${this.getCategoryEmoji(updated.category)} Категория: *${updated.category}*\n` +
      `📝 Описание: ${updated.description}\n` +
      `📅 Дата: ${updated.date}`;

    if (this.token) {
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✏️ Сменить категорию', callback_data: `pick_cat_${updated.id}` },
              { text: '🗑️ Удалить', callback_data: `del_${updated.id}` },
            ],
            [
              { text: '📊 Открыть веб-панель', web_app: { url: panelUrl } },
            ],
          ],
        },
      });
    }
    return msg;
  }

  public async sendDailyBreakdown(
    chatId: number | string,
    telegramId: string
  ): Promise<string> {
    const expenses = db.getExpenses(telegramId);
    const user = db.getUser(telegramId);
    const currency = user.currency || 'TJS';

    if (expenses.length === 0) {
      const text = `📅 *Расход по дням (Хароҷот аз рӯи рӯзҳо):*\n\nШумо то ҳол ягон хароҷот сабт накардаед.\nБарои сабт нависед: \`50 нону шир\` ё акси чекро фиристед!`;
      if (this.token) {
        await this.apiCall('sendMessage', {
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          reply_markup: this.getMainReplyKeyboard(telegramId),
        });
      }
      return text;
    }

    // Group expenses by date (up to 7 days)
    const byDate: Record<string, { total: number; items: typeof expenses }> = {};
    for (const exp of expenses) {
      if (!byDate[exp.date]) {
        byDate[exp.date] = { total: 0, items: [] };
      }
      byDate[exp.date].total += exp.amount;
      byDate[exp.date].items.push(exp);
    }

    const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).slice(0, 7);
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let text = `📅 *Расход по дням (7 рӯзи охир):*\n\n`;

    for (const d of sortedDates) {
      let label = d;
      if (d === todayStr) label = `Имрӯз (${d})`;
      else if (d === yesterdayStr) label = `Дирӯз (${d})`;

      const group = byDate[d];
      text += `🗓 *${label}* — *${group.total.toLocaleString('ru-RU')} ${currency}*\n`;
      group.items.slice(0, 4).forEach((it) => {
        text += `  • ${this.getCategoryEmoji(it.category)} ${it.amount.toLocaleString('ru-RU')} ${it.currency || currency} — ${it.description}\n`;
      });
      if (group.items.length > 4) {
        text += `  _...ва боз ${group.items.length - 4} хароҷоти дигар_\n`;
      }
      text += `\n`;
    }

    if (this.token) {
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: this.getMainReplyKeyboard(telegramId),
      });
    }

    return text;
  }

  public async sendOperationsHistory(
    chatId: number | string,
    telegramId: string
  ): Promise<string> {
    const expenses = db.getExpenses(telegramId);
    const user = db.getUser(telegramId);
    const currency = user.currency || 'TJS';

    if (expenses.length === 0) {
      const text = `📜 *История операций:*\n\nТаърихи хароҷотҳо холӣ аст.\nБарои сабти аввалин нависед, масалан: \`90 перевод\` ё \`30 такси\`!`;
      if (this.token) {
        await this.apiCall('sendMessage', {
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          reply_markup: this.getMainReplyKeyboard(telegramId),
        });
      }
      return text;
    }

    const recent = expenses.slice(0, 10);
    let text = `📜 *История операций (10 амалиёти охирин):*\n\n`;

    recent.forEach((exp, idx) => {
      text += `${idx + 1}. *${exp.amount.toLocaleString('ru-RU')} ${exp.currency || currency}* — ${this.getCategoryEmoji(exp.category)} *${exp.category}*\n`;
      text += `   📝 ${exp.description}\n`;
      text += `   📅 ${exp.date}\n\n`;
    });

    if (this.token) {
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: this.getMainReplyKeyboard(telegramId),
      });
    }

    return text;
  }

  public async sendExpenseGuide(
    chatId: number | string,
    telegramId: string
  ): Promise<string> {
    const text = `➕ *Чӣ тавр хароҷотро сабт кунем?*\n\n` +
      `Шумо метавонед ба бот хеле содда нависед:\n\n` +
      `✍️ *Намунаҳои матнӣ:*\n` +
      `• \`50 нону шир\`\n` +
      `• \`25 такси ба кор\`\n` +
      `• \`120 алиф пардохт\`\n` +
      `• \`300 бензин\`\n` +
      `• \`40 қаҳва\`\n\n` +
      `📸 *Бо акси чек:*\n` +
      `Расми чеки Alif mobi, DC Next, Бонки Эсхата ё чеки дӯконро рост ба чат фиристед — зеҳни сунъӣ (AI) маблағ ва номро худ муайян мекунад!`;

    if (this.token) {
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: this.getMainReplyKeyboard(telegramId),
      });
    }

    return text;
  }

  public async sendTodaySummary(
    chatId: number | string,
    telegramId: string
  ): Promise<string> {
    const stats = db.getStats(telegramId);
    const expenses = db.getExpenses(telegramId);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayExpenses = expenses.filter((e) => e.date === todayStr);

    let text = `📅 *Расходы за сегодня:* *${stats.todayTotal.toLocaleString('ru-RU')} ${stats.currency}*\n\n`;

    if (todayExpenses.length === 0) {
      text += `Сегодня пока нет трат. Запишите первую, например: \`кофе 250\` или \`обед 450\`!`;
    } else {
      text += `*Список трат за сегодня:*\n`;
      todayExpenses.forEach((e) => {
        text += `• ${e.amount.toLocaleString('ru-RU')} ${e.currency} — ${e.description} (${this.getCategoryEmoji(e.category)} ${e.category})\n`;
      });
    }

    if (this.token) {
      const panelUrl = this.getWebPanelUrl(telegramId);
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '📊 Открыть веб-панель', web_app: { url: panelUrl } }]],
        },
      });
    }

    return text;
  }

  public async sendWeekSummary(
    chatId: number | string,
    telegramId: string
  ): Promise<string> {
    const stats = db.getStats(telegramId);
    let diffText = '';

    if (stats.lastWeekTotal > 0) {
      const diff = stats.weekTotal - stats.lastWeekTotal;
      const pct = Math.round((Math.abs(diff) / stats.lastWeekTotal) * 100);
      diffText = diff > 0 ? ` (+${pct}% к прошлой неделе)` : ` (-${pct}% к прошлой неделе)`;
    }

    let text = `📆 *Расходы за эту неделю:* *${stats.weekTotal.toLocaleString('ru-RU')} ${stats.currency}*${diffText}\n\n*Топ категорий за месяц:*\n`;

    stats.byCategory.slice(0, 5).forEach((c) => {
      text += `${this.getCategoryEmoji(c.category)} ${c.category}: *${c.amount.toLocaleString('ru-RU')} ${stats.currency}* (${c.percentage}%)\n`;
    });

    if (this.token) {
      const panelUrl = this.getWebPanelUrl(telegramId);
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '📊 Открыть веб-панель', web_app: { url: panelUrl } }]],
        },
      });
    }

    return text;
  }

  public async sendMonthSummary(
    chatId: number | string,
    telegramId: string
  ): Promise<string> {
    const stats = db.getStats(telegramId);
    let text = `🗓 *Расходы за текущий месяц:* *${stats.monthTotal.toLocaleString('ru-RU')} ${stats.currency}*\n` +
      `Всего операций: ${stats.expenseCount} шт.\n\n` +
      `*Расходы по категориям:*\n`;

    stats.byCategory.forEach((c) => {
      const bar = '■'.repeat(Math.min(10, Math.max(1, Math.round(c.percentage / 10)))) +
        '□'.repeat(10 - Math.min(10, Math.max(1, Math.round(c.percentage / 10))));

      let limitInfo = '';
      if (c.limit) {
        limitInfo = ` [Лимит: ${c.limit} ${stats.currency} ${c.isOverLimit ? '⚠️ Превышен' : '✅'}]`;
      }

      text += `${this.getCategoryEmoji(c.category)} *${c.category}*: ${c.amount.toLocaleString('ru-RU')} ${stats.currency} (${c.percentage}%)\n${bar}${limitInfo}\n\n`;
    });

    if (this.token) {
      const panelUrl = this.getWebPanelUrl(telegramId);
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '📊 Подробные графики в веб-панели', web_app: { url: panelUrl } }]],
        },
      });
    }

    return text;
  }

  public async sendPanelLink(
    chatId: number | string,
    telegramId: string
  ): Promise<string> {
    const panelUrl = this.getWebPanelUrl(telegramId);
    const text = `📊 *Веб-панель личных расходов*\n\n` +
      `Вход осуществляется без логина и пароля — Telegram и есть ваш аккаунт (ID: \`${telegramId}\`).\n\n` +
      `📱 *Внутри Telegram:*\n` +
      `Нажмите кнопку «🚀 Открыть в Telegram» ниже.\n\n` +
      `🌐 *Для обычного браузера (ПК / телефон):*\n` +
      `Ваша персональная ссылка авторизации:\n${panelUrl}\n\n` +
      `_Ссылка действует 30 дней и отображает только ваши расходы._`;

    if (this.token) {
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Открыть в Telegram (Web App)', web_app: { url: panelUrl } }],
            [{ text: '🔗 Открыть в браузере', url: panelUrl }],
          ],
        },
      });
    }

    return text;
  }

  public async sendLimitsSummary(
    chatId: number | string,
    telegramId: string
  ): Promise<string> {
    const user = db.getUser(telegramId);
    const limits = user.categoryLimits;
    let text = `⚙️ *Месячные лимиты по категориям:*\n\n`;

    const entries = Object.entries(limits);
    if (entries.length === 0) {
      text += `Вы пока не установили ни одного лимита.\n\n`;
    } else {
      entries.forEach(([cat, lim]) => {
        text += `• ${this.getCategoryEmoji(cat)} ${cat}: *${lim.toLocaleString('ru-RU')} ${user.currency}*\n`;
      });
      text += `\n`;
    }

    text += `Чтобы задать или изменить лимит, отправьте:\n\`/limit Категория Сумма\`\nПример: \`/limit Кафе 5000\` или \`/limit Продукты 25000\``;

    if (this.token) {
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: this.getMainReplyKeyboard(telegramId),
      });
    }
    return text;
  }

  public async handleSetLimitCommand(
    chatId: number | string,
    telegramId: string,
    text: string
  ): Promise<string> {
    const clean = text.replace('/limit', '').trim();
    const match = clean.match(/^(.+?)\s+(\d+)$/);

    if (!match) {
      const msg = `Формат команды: \`/limit Категория Сумма\`\nПример: \`/limit Кафе 5000\` или \`/limit Продукты 25000\``;
      if (this.token) await this.apiCall('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
      return msg;
    }

    const rawCategory = match[1].trim();
    const amount = parseInt(match[2], 10);
    const category = detectCategory(rawCategory);

    const user = db.getUser(telegramId);
    user.categoryLimits[category] = amount;
    db.updateUser(telegramId, { categoryLimits: user.categoryLimits });

    const msg = `✅ Месячный лимит по категории «${this.getCategoryEmoji(category)} *${category}*» установлен: *${amount.toLocaleString('ru-RU')} ${user.currency}*`;
    if (this.token) await this.apiCall('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
    return msg;
  }

  public async handleShareCommand(
    chatId: number | string,
    telegramId: string,
    text: string
  ): Promise<string> {
    const user = db.getUser(telegramId);
    const parts = text.split(/\s+/);

    if (parts.length > 1) {
      // Connect to partner
      const targetCode = parts[1].trim().toUpperCase();
      const result = db.linkPartner(telegramId, targetCode);
      const partnerName = result.partner?.firstName || result.partner?.username || result.partner?.telegramId || '';

      const partnerMsg = result.success
        ? `✅ Бюджет успешно объединен с пользователем ${partnerName}!`
        : `❌ Ошибка: Код не найден или принадлежит вам.`;

      if (this.token) {
        await this.apiCall('sendMessage', { chat_id: chatId, text: partnerMsg });
      }
      return partnerMsg;
    }

    let msg = `👥 *Совместный бюджет на двоих*\n\n` +
      `Ваш код для подключения: \`${user.shareCode}\`\n\n` +
      `Отправьте этот код партнеру, чтобы он выполнил команду:\n` +
      `\`/share ${user.shareCode}\`\n\n` +
      `После подключения вы оба будете видеть расходы друг друга и общие графики!`;

    if (user.partnerTelegramId) {
      const partner = db.getUser(user.partnerTelegramId);
      msg += `\n\n✅ Сейчас вы подключены к: *${partner.firstName || partner.username || partner.telegramId}*`;
    }

    if (this.token) {
      await this.apiCall('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
    }
    return msg;
  }

  public async handleExportCommand(
    chatId: number | string,
    telegramId: string
  ): Promise<string> {
    const expenses = db.getExpenses(telegramId);
    const panelUrl = this.getWebPanelUrl(telegramId);

    const msg = `📥 У вас записано *${expenses.length} трат*.\n\nВы можете скачать полный CSV-файл прямо сейчас или открыть веб-панель:\n${panelUrl}`;

    if (this.token) {
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📥 Скачать CSV', url: `${this.appUrl}/api/export-csv?token=${db.createSession(telegramId)}` }],
            [{ text: '📊 Открыть веб-панель', web_app: { url: panelUrl } }],
          ],
        },
      });
    }
    return msg;
  }

  public async sendHelpMessage(chatId: number | string): Promise<string> {
    const msg = `💡 *Инструкция по использованию бота:*

1️⃣ *Быстрая запись расхода:* просто отправьте сумму и описание в чат:
• \`кофе 250\`
• \`такси 450 работа\`
• \`продукты 1500\`
• \`50$ ужин\`

2️⃣ *Фото чека:* пришлите фото чека в чат, сумма и позиции распознаются автоматически с помощью ИИ.

3️⃣ *Команды бота:*
• /today — расходы за сегодня
• /week — отчет за неделю
• /month — отчет за месяц
• /last — показать последнюю трату
• /delete — удалить последнюю трату
• /edit <сумма/текст> — исправить последнюю трату
• /panel — ссылка на веб-панель (вход без пароля)
• /limits — лимиты по категориям
• /share — совместный бюджет
• /export — выгрузить траты в CSV
• /help — эта инструкция

💬 Вы также можете задать любой вопрос боту по вашим расходам и финансам!`;

    if (this.token) {
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown',
        reply_markup: this.getMainReplyKeyboard(String(chatId)),
      });
    }
    return msg;
  }

  private getCategoryEmoji(cat: string): string {
    const map: Record<string, string> = {
      'Кафе и рестораны': '☕',
      'Продукты': '🛒',
      'Транспорт и такси': '🚕',
      'Жилье и ЖКХ': '🏠',
      'Покупки и одежда': '🛍️',
      'Здоровье и аптека': '💊',
      'Подписки и сервисы': '📱',
      'Развлечения и отдых': '🎬',
      'Спорт и фитнес': '🏋️',
      'Образование': '📚',
      'Семья и дети': '👶',
      'Другое': '📦',
    };
    return map[cat] || '💳';
  }
}

export const telegramService = new TelegramService();
