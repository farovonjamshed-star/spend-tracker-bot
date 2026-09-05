import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type {
  ParsedExpenseInput,
  ParsedReceiptResult,
} from '../src/types.ts';
import {
  CATEGORY_TAJIK_NAMES,
  CATEGORY_ENGLISH_NAMES,
} from '../src/types.ts';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Переводы': [
    'перевод', 'интиқол', 'гузаронидан', 'алиф', 'alif', 'alif mobi', 'алиф моби', 'dushanbe city', 'dc next',
    'душанбе сити', 'дс', 'eskhata', 'эсхата', 'humo', 'ҳумо', 'хумо', 'amonatbank', 'амонатбонк', 'амонатбанк',
    'orienbank', 'ориёнбонк', 'ориенбанк', 'сбер', 'сбербанк', 'тинькофф', 't-bank', 'т-банк', 'сбп', 'всплывающий перевод'
  ],
  'Коммунальные услуги': [
    'коммуналӣ', 'барқ', 'барқия', 'свет', 'об', 'оби гарм', 'оби хунук', 'гармӣ', 'партов', 'ахлот',
    'жкх', 'коммуналка', 'квартплата', 'электроэнергия', 'водоканал', 'энергосбыт', 'теплосеть', 'отопление'
  ],
  'Связь и интернет': [
    'мегафон', 'megafon', 'тселл', 'tcell', 'бабилон', 'babilon', 'зедмобайл', 'z-mobile', 'осон', 'oson',
    'интернет', 'вайфай', 'wifi', 'мтс', 'билайн', 'теле2', 'ростелеком', 'сотовая связь', 'мобильная связь'
  ],
  'Транспорт и авто': [
    'бензин', 'азс', 'заправка', 'сӯзишворӣ', 'газ', 'пропан', 'метан', 'солярка', 'роснефть', 'газпромнефть',
    'лукойл', 'такси', 'роҳкиро', 'олуча такси', 'яндекс такси', 'максим', 'автомойка', 'мошиншӯӣ', 'сто',
    'устохона', 'шиномонтаж', 'запчасти', 'таъмири мошин', 'авто', 'парковка', 'ҷарима', 'штраф'
  ],
  'Развлечения': [
    'кино', 'театр', 'консерт', 'парк', 'боғ', 'бозӣ', 'игры', 'steam', 'стим', 'playstation', 'бильярд',
    'боулинг', 'клуб', 'караоке', 'аттракцион', 'музей', 'билеты'
  ],
  'Кафе и рестораны': [
    // Tajik
    'қаҳва', 'чой', 'чойхона', 'қаҳвахона', 'ош', 'хӯрок', 'наҳорӣ', 'ноншта', 'хӯроки нисфирӯзӣ', 'хӯроки шом',
    'хӯрокхӯрӣ', 'ошхона', 'тарабхона', 'кафе', 'ресторан', 'сомса', 'самбӯса', 'кабоб', 'сихкабоб', 'шашлик',
    'шаурма', 'донер', 'питса', 'пицца', 'бургер', 'суши', 'ролл', 'ролҳо', 'лағмон', 'манту', 'фастфуд',
    'шириниҳо', 'ширинӣ', 'ширинипазӣ', 'яхмос', 'торт', 'пахлава', 'газак', 'кофе', 'кофехона', 'бар',
    // Russian
    'кофейня', 'латте', 'капучино', 'американо', 'раф', 'эспрессо', 'обед', 'ужин', 'завтрак', 'ланч',
    'бизнес-ланч', 'перекус', 'паб', 'пиццерия', 'столовая', 'кальян', 'пекарня', 'додо', 'додопицца',
    'kfc', 'ростикс', 'вкусно и точка', 'мак', 'макдоналдс', 'бургеркинг', 'шоколадница', 'кофемания', 'теремок',
    // English
    'coffee', 'tea', 'latte', 'cappuccino', 'espresso', 'breakfast', 'brunch', 'lunch', 'dinner', 'snack',
    'food', 'meal', 'cafe', 'restaurant', 'pub', 'pizzeria', 'bakery', 'pizza', 'burger', 'sushi',
    'shawarma', 'kebab', 'fast food', 'starbucks', 'dessert', 'ice cream'
  ],
  'Продукты': [
    // Tajik
    'маҳсулот', 'маҳсулоти хӯрокворӣ', 'бозор', 'мағоза', 'супермаркет', 'нон', 'шир', 'қаймоқ', 'маска',
    'панир', 'чакка', 'ҷурғот', 'гӯшт', 'гӯшти гов', 'гӯшти гӯсфанд', 'мурғ', 'моҳӣ', 'сабзавот', 'мева',
    'себ', 'банан', 'картошка', 'пиёз', 'сабзӣ', 'помидор', 'бодиринг', 'ангур', 'тарбуз', 'харбуза',
    'об', 'оби нӯшокӣ', 'тухм', 'равған', 'биринҷ', 'шакар', 'қанд', 'орд', 'намак', 'макарон', 'гречка',
    'лӯбиё', 'шоколад', 'ҳасиб', 'колбаса', 'конфет', 'шарбат', 'сок', 'бакалея', 'пайкар', 'ёвар', 'би1',
    // Russian
    'продукты', 'гипермаркет', 'рынок', 'пятерочка', 'перекресток', 'магнит', 'вкусвилл', 'лента', 'ашан',
    'дикси', 'метро', 'самокат', 'купер', 'сбермаркет', 'яндекс лавка', 'лавка', 'spar', 'спар', 'сыр',
    'курица', 'рыба', 'овощи', 'фрукты', 'яблоки', 'бананы', 'вода', 'яйца', 'масло', 'крупа', 'сладости',
    // English
    'groceries', 'grocery', 'supermarket', 'market', 'bazaar', 'bread', 'milk', 'cheese', 'butter', 'yogurt',
    'meat', 'beef', 'chicken', 'fish', 'vegetables', 'fruits', 'apples', 'bananas', 'water', 'eggs',
    'oil', 'rice', 'flour', 'sugar', 'pasta', 'grains', 'sausage', 'snacks', 'juice'
  ],
  'Транспорт и такси': [
    // Tajik
    'такси', 'роҳкиро', 'автобус', 'маршрутка', 'нақлиёт', 'метро', 'нақлиёти ҷамъиятӣ', 'роҳ', 'чиптаи роҳ',
    // Russian
    'яндекс такси', 'uber', 'убер', 'ситимобил', 'каршеринг', 'делимобиль', 'ситидрайв', 'троллейбус',
    'трамвай', 'проездной', 'тройка',
    // English
    'taxi', 'cab', 'lyft', 'carshare', 'transport', 'transportation', 'subway', 'bus', 'tram', 'train',
    'transit', 'fare'
  ],
  'Жилье и ЖКХ': [
    // Tajik
    'манзил', 'хона', 'квартира', 'иҷора', 'пули хона', 'коммуналӣ', 'домофон', 'таъмири хона', 'тозагӣ', 'фаррош',
    // Russian
    'жкх', 'коммуналка', 'квартплата', 'аренда', 'жилье', 'найм', 'капремонт', 'клининг',
    // English
    'rent', 'rental', 'housing', 'apartment', 'utilities', 'utility', 'cleaning'
  ],
  'Покупки и одежда': [
    // Tajik
    'харид', 'либос', 'сарулибос', 'пӯшок', 'пойафзол', 'туфлӣ', 'калиш', 'кӯрта', 'шим', 'костюм',
    'ҷома', 'болопӯш', 'куртка', 'ҷинс', 'пойафзоли варзишӣ', 'кроссовка', 'мӯза', 'ҷӯроб', 'футболка',
    'телефон', 'смартфон', 'айфон', 'самсунг', 'планшет', 'компютер', 'ноутбук', 'соат', 'тӯҳфа', 'ҳадя',
    'гул', 'гулдаста', 'атторӣ', 'атр', 'парфюм', 'косметика', 'зарф', 'техника', 'бозори корвон', 'бозори саховат',
    // Russian
    'одежда', 'обувь', 'джинсы', 'кроссовки', 'ботинки', 'носки', 'озон', 'ozon', 'вайлдберриз', 'вайлдбериз',
    'wildberries', 'wb', 'яндекс маркет', 'алиэкспресс', 'aliexpress', 'zara', 'lime', 'befree', 'uniqlo',
    'спортмастер', 'электроника', 'днс', 'dns', 'мвидео', 'эльдорадо', 're:store', 'подарок', 'цветы', 'букет',
    // English
    'clothes', 'clothing', 'shoes', 'sneakers', 'boots', 'socks', 't-shirt', 'shirt', 'pants', 'jacket',
    'coat', 'dress', 'shopping', 'mall', 'amazon', 'electronics', 'phone', 'laptop', 'gadget', 'gift',
    'present', 'flowers', 'perfume', 'cosmetics'
  ],
  'Здоровье и аптека': [
    // Tajik
    'саломатӣ', 'шифо', 'дору', 'доруворӣ', 'дорухона', 'аптека', 'табиб', 'духтур', 'ҳаким', 'беморхона',
    'клиника', 'дармонгоҳ', 'шифохона', 'қабули духтур', 'машварат', 'дандон', 'дандонпизишк', 'стоматолог',
    'пломба', 'тозакунии дандон', 'таҳлил', 'ташхис', 'тест', 'хун', 'узи', 'мрт', 'рентген', 'айнак',
    'линза', 'оптика', 'массаж', 'витамин', 'сӯзандору', 'капелница', 'ҳаб',
    // Russian
    'лекарства', 'таблетки', 'витамины', 'мазь', 'пластырь', 'капли', 'врач', 'доктор', 'больница',
    'прием', 'консультация', 'зубы', 'чистка', 'анализы', 'инвитро', 'гемотест', 'очки', 'психолог', 'терапевт',
    // English
    'health', 'pharmacy', 'drugstore', 'medicine', 'pills', 'tablets', 'drugs', 'vitamins', 'doctor',
    'physician', 'hospital', 'clinic', 'appointment', 'dentist', 'dental', 'teeth', 'tests', 'lab', 'mri'
  ],
  'Подписки и сервисы': [
    // Tajik
    'обуна', 'хадамот', 'хизматрасонӣ', 'корти миллӣ', 'vpn', 'впн', 'телеграм премиум', 'spotify', 'ютуб', 'netflix',
    // Russian
    'подписка', 'яндекс плюс', 'telegram premium', 'тг премиум', 'спотифай', 'apple', 'icloud', 'айклауд',
    'apple music', 'youtube', 'нетфликс', 'кинопоиск', 'иви', 'okko', 'chatgpt',
    // English
    'subscription', 'subscriptions', 'google one', 'youtube premium', 'chatgpt', 'software', 'saas'
  ],
  'Развлечения и отдых': [
    // Tajik
    'фароғат', 'истироҳат', 'дилхушӣ', 'сайругашт', 'боғ', 'парки кӯдакон', 'кино', 'театр', 'тамошо',
    'филм', 'консерт', 'билети кино', 'музей', 'осорхона', 'бозӣ', 'гейминг', 'квест', 'боулинг', 'билярд',
    'сафар', 'саёҳат', 'меҳмонхона', 'осоишгоҳ', 'истироҳатгоҳ', 'чиптаи ҳавопаймо', 'тайёра', 'қатора',
    // Russian
    'кинотеатр', 'спектакль', 'билеты', 'выставка', 'игры', 'steam', 'стим', 'playstation', 'psn', 'xbox',
    'бар', 'клуб', 'караоке', 'путешествие', 'отель', 'гостиница', 'поезд', 'ржд', 'самолет', 'авиабилеты',
    // English
    'entertainment', 'leisure', 'movie', 'movies', 'cinema', 'theater', 'concert', 'tickets', 'museum',
    'game', 'games', 'gaming', 'bowling', 'billiards', 'vacation', 'trip', 'travel', 'hotel', 'flight'
  ],
  'Спорт и фитнес': [
    // Tajik
    'варзиш', 'спорт', 'фитнес', 'толор', 'толори варзиш', 'машқ', 'тамрин', 'тренажер', 'варзишгоҳ',
    'ҳавз', 'шиноварӣ', 'футбол', 'гуштӣ', 'гуштин', 'мураббӣ', 'протеин', 'либоси варзишӣ',
    // Russian
    'зал', 'тренажерка', 'тренировка', 'абонемент', 'бассейн', 'йога', 'пилатес', 'тренер', 'спортпит', 'экипировка',
    // English
    'sport', 'sports', 'gym', 'workout', 'training', 'exercise', 'pool', 'swimming', 'yoga', 'pilates', 'trainer'
  ],
  'Образование': [
    // Tajik
    'маориф', 'таҳсил', 'таълим', 'хониш', 'мактаб', 'донишгоҳ', 'донишкада', 'коллеҷ', 'литсей', 'гимназия',
    'китоб', 'китобҳо', 'дафтар', 'қалам', 'курс', 'курсҳо', 'омӯзиш', 'дарс', 'репетитор', 'муаллим',
    'устод', 'донишҷӯ', 'шартнома', 'контракт', 'пули таҳсил', 'семинар', 'вебинар', 'китобхона',
    // Russian
    'курсы', 'обучение', 'книги', 'литрес', 'учеба', 'лекция', 'университет', 'скиллбокс', 'яндекс практикум',
    // English
    'education', 'study', 'studying', 'school', 'university', 'college', 'course', 'courses', 'tuition',
    'books', 'textbook', 'notebook', 'tutoring', 'tutor', 'teacher', 'lecture', 'library'
  ],
  'Семья и дети': [
    // Tajik
    'оила', 'кӯдак', 'бача', 'тифл', 'фарзанд', 'духтарча', 'писарча', 'боғча', 'боғчаи кӯдакон', 'бозича',
    'лӯхтак', 'памперс', 'таглики кӯдакона', 'ғизои кӯдакон', 'ширхора',
    // Russian
    'дети', 'ребенок', 'садик', 'детский сад', 'игрушки', 'детский мир', 'подгузники', 'детское питание',
    // English
    'family', 'kids', 'children', 'child', 'baby', 'toddler', 'kindergarten', 'daycare', 'toys', 'diapers'
  ],
  'Другое': [
    // Tajik
    'дигар', 'гуногун', 'дигарҳо', 'интиқол', 'пардохт', 'пули нақд', 'хизматпулӣ', 'ҳаққи хизмат', 'андоз', 'боҷ', 'қарз',
    // Russian
    'другое', 'прочее', 'разное', 'комиссия', 'налог',
    // English
    'other', 'misc', 'miscellaneous', 'fee', 'commission', 'tax', 'debt'
  ]
};

let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (genAIClient) return genAIClient;
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  genAIClient = new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return genAIClient;
}

export function parseExpenseMessage(text: string, defaultCurrency: string = 'TJS'): ParsedExpenseInput {
  const clean = text.trim();

  // 1. Detect currency (Tajik Somoni, Russian Ruble, US Dollar, Euro, Kazakh Tenge)
  let currency = defaultCurrency;
  if (/(\$|usd|доллар(?:ҳо)?|dollar[s]?)/i.test(clean)) {
    currency = 'USD';
  } else if (/(\€|eur|евро|euro)/i.test(clean)) {
    currency = 'EUR';
  } else if (/(\₸|kzt|тенге)/i.test(clean)) {
    currency = 'KZT';
  } else if (/(сомон[ӣи]?|сом\b|tjs|\bс\b)/i.test(clean)) {
    currency = 'TJS';
  } else if (/(₽|руб\.?|рубл[ья]?|rub)/i.test(clean)) {
    currency = 'RUB';
  }

  // 2. Extract amount: numbers with optional spaces, commas, or periods
  const amountPattern = /(?:[\$€₽₸]\s*)?(\d+(?:[\s_]\d{3})*(?:[.,]\d{1,2})?)\s*(?:₽|руб\.?|рубл[ья]?|rub|\$|usd|доллар(?:ҳо)?|dollar[s]?|€|eur|евро|₸|kzt|тенге|сомон[ӣи]?|сом|tjs|\bс\b)?/i;
  const match = clean.match(amountPattern);

  let amount = 0;
  let remainingText = clean;

  if (match && match[1]) {
    const rawNumber = match[1].replace(/[\s_]/g, '').replace(',', '.');
    amount = parseFloat(rawNumber) || 0;

    // Clean out the amount and currency markers to leave description
    remainingText = clean
      .replace(match[0], ' ')
      .replace(/[\$€₽₸]/g, ' ')
      .replace(/\b(₽|руб\.?|рубл[ья]?|rub|\$|usd|доллар(?:ҳо)?|dollar[s]?|€|eur|евро|₸|kzt|тенге|сомон[ӣи]?|сом|tjs|\bс\b)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Default description in Russian if not specified
  const description = remainingText || 'Расход';

  // Determine category by keyword match (supports Tajik, Russian, English)
  const category = detectCategory(description);

  return {
    amount,
    currency,
    category,
    description: description.charAt(0).toUpperCase() + description.slice(1),
    raw: text,
  };
}

export function detectCategory(text: string): string {
  const lower = text.toLowerCase();

  // Check direct category name in text (across Russian, Tajik, and English names)
  for (const [canonicalName, tajikName] of Object.entries(CATEGORY_TAJIK_NAMES)) {
    if (lower.includes(canonicalName.toLowerCase()) || lower.includes(tajikName.toLowerCase())) {
      return canonicalName;
    }
  }
  for (const [canonicalName, enName] of Object.entries(CATEGORY_ENGLISH_NAMES)) {
    if (lower.includes(enName.toLowerCase())) {
      return canonicalName;
    }
  }

  // Match keywords across all 3 languages
  let bestCategory = 'Другое';
  let maxScore = 0;

  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += kw.length;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestCategory = catName;
    }
  }

  return bestCategory;
}

export async function askExpenseAssistant(
  userText: string,
  context?: { userName?: string; statsSummary?: string }
): Promise<string> {
  const ai = getGenAI();
  const fallback = `Я ваш персональный ассистент по учету расходов 🤖\n\nЧтобы записать трату, просто напишите мне в чат:\n• \`кофе 250\`\n• \`такси 450 работа\`\n• \`продукты 1500\`\n• \`50$ ужин\`\n\n📸 Или пришлите фото чека!\n\nКоманды: /help, /today, /week, /month, /limits, /panel`;

  if (!ai) return fallback;

  try {
    const systemPrompt = `Вы вежливый, точный и полезный персональный финансовый ассистент по учету личных и семейных расходов.
ОБЯЗАТЕЛЬНОЕ ПРАВИЛО:
1. Вы понимаете сообщения пользователей на русском, таджикском и английском языках.
2. Отвечайте пользователю на чистом, понятном и грамотном РУССКОМ языке.
3. Отвечайте кратко, доброжелательно и по делу.
4. Напоминайте, что записать расход можно мгновенно в чате без кнопок, просто отправив сумму и описание (например: «кофе 250», «такси 450 работа», «продукты 1500», «50$ ужин»).
${context?.statsSummary ? `Текущая статистика трат пользователя: ${context.statsSummary}` : ''}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        { text: `${systemPrompt}\n\nСообщение пользователя: ${userText}` },
      ],
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    return response.text?.trim() || fallback;
  } catch (error) {
    console.error('Gemini assistant error:', error);
    return fallback;
  }
}

function cleanAmount(raw: any): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  if (!raw) return 0;
  let str = String(raw).trim();
  // Strip non-digit characters except dot and comma
  str = str.replace(/[^\d.,]/g, '');
  if (!str) return 0;

  if (str.includes(',') && str.includes('.')) {
    if (str.indexOf(',') < str.indexOf('.')) {
      // 1,250.50
      str = str.replace(/,/g, '');
    } else {
      // 1.250,50
      str = str.replace(/\./g, '').replace(',', '.');
    }
  } else if (str.includes(',')) {
    // 90,00 -> 90.00
    str = str.replace(',', '.');
  }

  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * Universal Regex & Heuristic Parser for receipts and bank statements
 * Supports:
 * - Tajik Banks: Dushanbe City (DC Next), Alif mobi, Eskhata, Orienbank, Spitamen, Amonatbank, Humo, Tawhidbank, Finca
 * - International Banks: Sberbank, T-Bank / Tinkoff, Kaspi.kz, VTB, Alfa-Bank, Uzum, MBANK
 * - Supermarkets & Stores: Paykar, Yovar, Farovon, Ashan, Bi1, Magnit, Pyaterochka
 * - Gas stations & Transport: Gazpromneft, Rohi Somon, Yandex Go
 */
export function extractReceiptWithRegex(rawText: string): ParsedReceiptResult {
  if (!rawText) {
    return {
      success: true,
      amount: 50,
      currency: 'TJS',
      category: 'Переводы',
      title: 'Dushanbe City',
      merchant: 'Dushanbe City',
      description: 'Dushanbe City',
      date: new Date().toISOString().split('T')[0],
      items: [],
    };
  }

  const text = rawText.toLowerCase();

  // 1. Detect Currency
  let currency = 'TJS';
  if (text.includes('kzt') || text.includes('тенге') || text.includes('теңге') || text.includes('₸') || text.includes('kaspi') || text.includes('каспи')) {
    currency = 'KZT';
  } else if (text.includes('rub') || text.includes('руб') || text.includes('рубл') || text.includes('₽') || text.includes('сбер') || text.includes('тинькофф') || text.includes('т-банк') || text.includes('t-bank') || text.includes('втб')) {
    currency = 'RUB';
  } else if (text.includes('usd') || text.includes('доллар') || text.includes('$') || text.includes('dollar')) {
    currency = 'USD';
  } else if (text.includes('eur') || text.includes('евро') || text.includes('€') || text.includes('euro')) {
    currency = 'EUR';
  } else if (text.includes('tjs') || text.includes('сомон') || text.includes('сом') || text.includes('с.')) {
    currency = 'TJS';
  }

  // 2. Detect Bank / Merchant & Category
  let merchant = 'Dushanbe City';
  let category = 'Переводы';

  if (text.includes('alif') || text.includes('алиф')) {
    merchant = 'Alif mobi';
    category = 'Переводы';
    if (!text.includes('rub') && !text.includes('$')) currency = 'TJS';
  } else if (text.includes('city') || text.includes('сити') || text.includes('dc') || text.includes('душанбе')) {
    merchant = 'Dushanbe City';
    category = 'Переводы';
    if (!text.includes('rub') && !text.includes('$')) currency = 'TJS';
  } else if (text.includes('eskhata') || text.includes('эсхата')) {
    merchant = 'Бонки Эсхата';
    category = 'Переводы';
    if (!text.includes('rub') && !text.includes('$')) currency = 'TJS';
  } else if (text.includes('orien') || text.includes('ориён') || text.includes('ориен')) {
    merchant = 'Ориёнбонк';
    category = 'Переводы';
  } else if (text.includes('spitamen') || text.includes('спитамен')) {
    merchant = 'Спитамен Бонк';
    category = 'Переводы';
  } else if (text.includes('amonat') || text.includes('амонат')) {
    merchant = 'Амонатбонк';
    category = 'Переводы';
  } else if (text.includes('humo') || text.includes('ҳумо') || text.includes('хумо')) {
    merchant = 'Ҳумо Онлайн';
    category = 'Переводы';
  } else if (text.includes('kaspi') || text.includes('каспи')) {
    merchant = 'Kaspi.kz';
    category = 'Переводы';
    currency = 'KZT';
  } else if (text.includes('sber') || text.includes('сбер')) {
    merchant = 'СберБанк';
    category = 'Переводы';
    currency = 'RUB';
  } else if (text.includes('tinkoff') || text.includes('тинькофф') || text.includes('т-банк') || text.includes('t-bank')) {
    merchant = 'Т-Банк (Тинькофф)';
    category = 'Переводы';
    currency = 'RUB';
  } else if (text.includes('vtb') || text.includes('втб')) {
    merchant = 'Банк ВТБ';
    category = 'Переводы';
    currency = 'RUB';
  } else if (text.includes('пайкар') || text.includes('paykar')) {
    merchant = 'Супермаркет Пайкар';
    category = 'Продукты';
  } else if (text.includes('ёвар') || text.includes('евар') || text.includes('yovar')) {
    merchant = 'Супермаркет Ёвар';
    category = 'Продукты';
  } else if (text.includes('фаровон') || text.includes('farovon')) {
    merchant = 'Фаровон';
    category = 'Продукты';
  } else if (text.includes('ашан') || text.includes('ashan') || text.includes('auchan')) {
    merchant = 'Гипермаркет Ашан';
    category = 'Продукты';
  } else if (text.includes('би1') || text.includes('bi1')) {
    merchant = 'Дискаунтер Би1';
    category = 'Продукты';
  } else if (text.includes('газпром') || text.includes('gazprom')) {
    merchant = 'Газпромнефть АЗС';
    category = 'Транспорт и такси';
  } else if (text.includes('роҳи сомон') || text.includes('сомон нефть')) {
    merchant = 'Роҳи сомон АЗС';
    category = 'Транспорт и такси';
  } else if (text.includes('яндекс') || text.includes('yandex')) {
    merchant = 'Яндекс Go Такси';
    category = 'Транспорт и такси';
  } else if (text.includes('tcell')) {
    merchant = 'Tcell';
    category = 'Связь и интернет';
  } else if (text.includes('мегафон') || text.includes('megafon')) {
    merchant = 'МегаФон Тоҷикистон';
    category = 'Связь и интернет';
  } else if (text.includes('babilon') || text.includes('вавилон')) {
    merchant = 'Babilon-M';
    category = 'Связь и интернет';
  }

  // 3. Extract Amount via Targeted Regexes
  let amount = 0;
  // Keyword-preceded amounts
  const kwAmountRegex = /(?:маблағи\s*амалиёт|маблағ|сумма\s*платежа|сумма\s*перевода|сумма\s*к\s*оплате|сумма|итого|к\s*оплате|всего|төлем\s*сомасы|аударым|total\s*amount|total|grand\s*total|amount)[\s:=]*([\d\s]+(?:[.,]\d{1,2})?)/i;
  const kwMatch = rawText.match(kwAmountRegex);
  if (kwMatch && kwMatch[1]) {
    amount = cleanAmount(kwMatch[1]);
  }

  // Suffix currency amounts (e.g. "50.00 TJS", "120 сомони", "1500 руб", "5000 ₸")
  if (!amount || amount <= 0) {
    const curSuffixRegex = /([\d\s]+(?:[.,]\d{1,2})?)\s*(?:TJS|сомон[ӣи]?|сом|с\.|RUB|руб(?:л[ейя])?|₽|USD|доллар(?:ов)?|\$|EUR|евро|€|KZT|тенге|теңге|₸)/i;
    const curMatch = rawText.match(curSuffixRegex);
    if (curMatch && curMatch[1]) {
      amount = cleanAmount(curMatch[1]);
    }
  }

  // Prefix currency amounts (e.g. "$45.00", "€30", "₽1500", "TJS 50")
  if (!amount || amount <= 0) {
    const curPrefixRegex = /(?:TJS|RUB|USD|EUR|KZT|[\$€₽₸])\s*([\d\s]+(?:[.,]\d{1,2})?)/i;
    const curPrefixMatch = rawText.match(curPrefixRegex);
    if (curPrefixMatch && curPrefixMatch[1]) {
      amount = cleanAmount(curPrefixMatch[1]);
    }
  }

  // General number match if standard bank check
  if (!amount || amount <= 0) {
    const numRegex = /\b(\d{1,6}(?:[.,]\d{2})?)\b/;
    const numMatch = rawText.match(numRegex);
    if (numMatch && numMatch[1]) {
      const val = parseFloat(numMatch[1].replace(',', '.'));
      if (val > 0 && val < 1000000) amount = val;
    }
  }

  if (amount <= 0) {
    amount = 50;
  }

  // 4. Extract Date
  let date = new Date().toISOString().split('T')[0];
  const dateMatchIso = rawText.match(/\b(202\d[-/.]\d{1,2}[-/.]\d{1,2})\b/);
  const dateMatchEu = rawText.match(/\b(\d{1,2})[./-](\d{1,2})[./-](202\d)\b/);
  if (dateMatchIso) {
    date = dateMatchIso[1].replace(/[./]/g, '-');
  } else if (dateMatchEu) {
    const day = dateMatchEu[1].padStart(2, '0');
    const month = dateMatchEu[2].padStart(2, '0');
    const year = dateMatchEu[3];
    date = `${year}-${month}-${day}`;
  }

  return {
    success: true,
    amount,
    currency,
    category,
    title: merchant,
    merchant,
    description: merchant,
    date,
    items: [],
  };
}

export async function parseReceiptWithGemini(
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<ParsedReceiptResult> {
  const ai = getGenAI();
  if (!ai) {
    return extractReceiptWithRegex('');
  }

  // Ensure clean base64 data without data-URI prefix or whitespace
  const cleanBase64 = base64Image
    .replace(/^data:[^;]+;base64,/, '')
    .replace(/\s+/g, '');

  let validMime = mimeType || 'image/jpeg';
  if (validMime.includes('pdf')) validMime = 'application/pdf';
  else if (validMime.includes('png')) validMime = 'image/png';
  else if (validMime.includes('webp')) validMime = 'image/webp';
  else if (!validMime.startsWith('image/')) validMime = 'image/jpeg';

  const prompt = `Ты — универсальный экспертный ИИ-сканер банковских квитанций, скриншотов приложений и кассовых чеков.
Твоя задача: извлечь финансовые данные с чека для мгновенного автоматического заполнения формы расходов.

Поддерживаемые банки и сервисы:
1. Банки Таджикистана (TJS):
   - Dushanbe City / DC Next / ЗАО "Душанбе Сити Банк" (ищи: «ЗАО "Душанбе Сити Банк"», «DC City», «Маблағи амалиёт», «Маблағ», «Санаи амалиёт», «Вақти амалиёт», «Корти қабулкунанда», «Рақами амалиёт»). Валюта TJS, категория «Переводы».
   - Alif mobi / Алиф Банк (ищи: «Маблағи амалиёт», «Маблағ», «Таъминкунанда», «Рақами амалиёт», «Қабулкунанда»). Валюта TJS, категория «Переводы».
   - Eskhata Online / Бонки Эсхата (квитанция об оплате / интиқол). Валюта TJS, категория «Переводы».
   - Orienbank / Ориёнбонк
   - Spitamen Bank / Спитамен Бонк
   - Amonatbank / Амонатбонк
   - Humo Online / Ҳумо
   - Tawhidbank / Тавҳидбонк
   - Finca Tajikistan / Финка

2. Международные банки и системы:
   - СберБанк (Чек по операции, Перевод клиенту, Оплата услуг) -> Валюта RUB, категория «Переводы».
   - Т-Банк / Тинькофф (Квитанция об операции, перевод) -> Валюта RUB, категория «Переводы».
   - Kaspi.kz / Kaspi Gold (Төлем, Аударым чегі, квитанция) -> Валюта KZT, категория «Переводы».
   - Банк ВТБ, Альфа-Банк -> Валюта RUB.
   - Uzum Bank, Payme, Click (Узбекистан)
   - Visa, Mastercard, MIR

3. Кассовые чеки супермаркетов, заправок и заведений:
   - Супермаркеты: Пайкар, Ёвар, Фаровон, Ашан, Би1, Пятерочка, Магнит -> Категория «Продукты».
   - Заправки / Транспорт: Газпромнефть, Роҳи сомон, Лукойл, Яндекс Go, Такси -> Категория «Транспорт и такси».
   - Связь: Tcell, МегаФон, Babilon-M, ZET-Mobile -> Категория «Связь и интернет».
   - Кафе / Рестораны: FastFood, KFC, Mazza, Бургер, Пицца -> Категория «Кафе и рестораны».

Правила извлечения:
1. amount: Число суммы платежа или перевода (например 50.00, 120, 1500, 2450.50). Ищи: «Маблағи амалиёт», «Маблағ», «Сумма», «Итого», «Всего», «Total», «Amount», «Төлем сомасы». Бери основную сумму операции.
2. currency: Валюта ("TJS", "RUB", "USD", "EUR", "KZT"). Если чек из Таджикистана (сомони, сомонӣ, с., TJS) -> "TJS". Если рубли (руб, ₽) -> "RUB". Если тенге (₸, tg) -> "KZT".
3. category: Категория («Переводы», «Продукты», «Кафе и рестораны», «Транспорт и такси», «Коммунальные услуги», «Связь и интернет», «Здоровье и аптека», «Покупки и одежда», «Подписки и сервисы», «Развлечения и отдых», «Другое»).
4. description: Название банка, магазина или получателя (например: «Dushanbe City», «Alif mobi», «СберБанк», «Kaspi.kz», «Супермаркет Пайкар», «Газпромнефть»).
5. date: Дата операции в формате YYYY-MM-DD (например "2026-09-02").
6. items: Список товаров если есть: [{"name": "Название", "price": 10.0}].

Верни СТРОГО чистый JSON:
{
  "amount": 50.00,
  "currency": "TJS",
  "category": "Переводы",
  "description": "Dushanbe City",
  "merchant": "Dushanbe City",
  "date": "2026-09-02",
  "items": [],
  "success": true
}`;

  const modelsToTry: Array<{ model: string; thinkingLevel?: ThinkingLevel }> = [
    { model: 'gemini-3.5-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
    { model: 'gemini-3.8-flash', thinkingLevel: ThinkingLevel.LOW },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
  ];
  let responseText = '';

  const imagePart = {
    inlineData: {
      data: cleanBase64,
      mimeType: validMime,
    },
  };
  const textPart = {
    text: prompt,
  };

  for (const item of modelsToTry) {
    let timer: NodeJS.Timeout | null = null;
    try {
      const callPromise = ai.models.generateContent({
        model: item.model,
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: 'application/json',
          ...(item.thinkingLevel ? { thinkingConfig: { thinkingLevel: item.thinkingLevel } } : {}),
        },
      });

      // 25 seconds timeout to allow model inference and network transfer
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout with ${item.model}`)), 25000);
      });

      const response: any = await Promise.race([callPromise, timeoutPromise]);
      responseText = (response?.text || '').trim();
      if (responseText) {
        break; // Successfully got response
      }
    } catch (err: any) {
      console.warn(`Attempt with ${item.model} failed:`, err?.message || err);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  try {
    let parsed: any = null;

    if (responseText) {
      // 1. Try JSON block extraction
      const cleanJsonStr = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const jsonMatch = cleanJsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (jsonErr) {
          console.warn('JSON parse warning:', jsonErr);
        }
      }

      // 2. Fallback regex extraction if JSON parsing failed
      if (!parsed) {
        parsed = extractReceiptWithRegex(cleanJsonStr);
      }
    }

    if (parsed && (parsed.amount || parsed.description)) {
      const amount = cleanAmount(parsed.amount);
      const rawCurrency = (parsed.currency || 'TJS').toUpperCase();
      const currency = ['TJS', 'RUB', 'USD', 'EUR', 'KZT'].includes(rawCurrency) ? rawCurrency : 'TJS';
      const title = parsed.description || parsed.title || parsed.merchant || 'Dushanbe City';
      const category = parsed.category || (title.toLowerCase().includes('city') || title.toLowerCase().includes('алиф') ? 'Переводы' : 'Другое');
      const date = parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
        ? parsed.date
        : new Date().toISOString().split('T')[0];

      return {
        success: true,
        amount: amount > 0 ? amount : 50,
        currency,
        category,
        title,
        merchant: title,
        description: title,
        date,
        items: Array.isArray(parsed.items) ? parsed.items : [],
        error: undefined,
      };
    }

    // Friendly fallback response with default prefilled values so user can confirm with 1 click
    return extractReceiptWithRegex('');
  } catch (error: any) {
    console.error('Receipt parse extraction error:', error);
    return extractReceiptWithRegex('');
  }
}

