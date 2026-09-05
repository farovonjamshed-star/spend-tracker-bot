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

export async function parseReceiptWithGemini(
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<ParsedReceiptResult> {
  const ai = getGenAI();
  if (!ai) {
    return {
      success: false,
      amount: 0,
      currency: 'TJS',
      category: 'Другое',
      title: '',
      error: 'GEMINI_API_KEY на сервере не настроен',
    };
  }

  // Ensure clean base64 data without data-URI prefix or whitespace
  const cleanBase64 = base64Image
    .replace(/^data:[^;]+;base64,/, '')
    .replace(/\s+/g, '');

  let validMime = mimeType || 'image/jpeg';
  if (validMime.includes('png')) validMime = 'image/png';
  else if (validMime.includes('webp')) validMime = 'image/webp';
  else if (!validMime.startsWith('image/')) validMime = 'image/jpeg';

  const prompt = `Ты — профессиональный сканер банковских квитанций, чеков и скриншотов мобильных приложений Таджикистана и СНГ.
Особенно точно распознавай чеки банков и приложений:
- Dushanbe City / DC Next / ЗАО "Душанбе Сити Банк" (ищи: «ЗАО "Душанбе Сити Банк"», «DC City», «Маблағи амалиёт», «Маблағ», «Санаи амалиёт», «Вақти амалиёт», «Корти қабулкунанда», «Рақами амалиёт», «Хизматрасонӣ»). Если это чек Душанбе Сити, description ставь «Dushanbe City», category «Переводы», валюта «TJS».
- Alif mobi / Алиф Банк (ищи: «Маблағи амалиёт», «Маблағ», «Таъминкунанда», «Рақами амалиёт», «Қабулкунанда»).
- Eskhata Online / Бонки Эсхата
- Amonatbank / Амонатбонк
- Humo Online / Ҳумо
- Orienbank / Ориёнбонк
- СберБанк, Т-Банк, ВТБ
- Бумажные чеки магазинов: Пайкар, Ёвар, Фаровон, Ашан, Би1, заправок Газпромнефть.

Инструкции по извлечению:
1. amount: Основная сумма платежа или перевода. Ищи: «Маблағи амалиёт», «Маблағ», «Сумма», «Итого», «Всего», «Total». Если указана сумма и комиссия, бери основную сумму операции. Число без букв (например: 50.00, 100, 250, 1500).
2. currency: Валюта операции. Для чеков Таджикистана (сомони, сомонӣ, TJS, с.) всегда ставь "TJS". Для рублей "RUB", долларов "USD".
3. category: Подходящая категория («Переводы», «Супермаркет», «Продукты», «Такси», «Транспорт», «Коммунальные услуги», «Связь и интернет», «Кафе и рестораны», «Здоровье», «Другое»). Для банковских переводов людям или пополнений карт ставь «Переводы».
4. description: Название получателя, банка или магазина (например: «Dushanbe City», «Алиф Банк», «Пайкар», «Tcell», «МегаФон»).
5. date: Дата операции в формате YYYY-MM-DD. Например из «02.09.2026» сделай «2026-09-02».
6. items: Список позиций если есть: [{"name": "Товар", "price": 10.0}].

Верни СТРОГО чистый JSON:
{
  "amount": 50.00,
  "currency": "TJS",
  "category": "Переводы",
  "description": "Dushanbe City",
  "date": "2026-09-02",
  "items": [],
  "success": true
}`;

  const modelsToTry: Array<{ model: string; thinkingLevel?: ThinkingLevel }> = [
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

      // 35 seconds timeout to allow model inference and network transfer
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout with ${item.model}`)), 35000);
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
        const amountMatch = cleanJsonStr.match(/"amount"\s*:\s*"?([\d.,]+)"?/i) ||
          cleanJsonStr.match(/amount\s*[:=]\s*"?([\d.,]+)"?/i) ||
          cleanJsonStr.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:TJS|сомон|сом|с\.|руб|₽|\$)/i);

        const currencyMatch = cleanJsonStr.match(/"currency"\s*:\s*"([^"]+)"/i) ||
          cleanJsonStr.match(/(TJS|RUB|USD|EUR|KZT)/i);

        const categoryMatch = cleanJsonStr.match(/"category"\s*:\s*"([^"]+)"/i);
        const descMatch = cleanJsonStr.match(/"description"\s*:\s*"([^"]+)"/i) ||
          cleanJsonStr.match(/"title"\s*:\s*"([^"]+)"/i);
        const dateMatch = cleanJsonStr.match(/"date"\s*:\s*"(\d{4}-\d{2}-\d{2})"/i) ||
          cleanJsonStr.match(/(\d{2})[./](\d{2})[./](\d{4})/);

        if (amountMatch) {
          parsed = {
            amount: amountMatch[1],
            currency: currencyMatch ? currencyMatch[1] : 'TJS',
            category: categoryMatch ? categoryMatch[1] : 'Переводы',
            description: descMatch ? descMatch[1] : 'Dushanbe City',
            date: dateMatch ? (dateMatch[1].length === 10 ? dateMatch[1] : `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`) : undefined,
            success: true,
          };
        }
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
        success: amount > 0,
        amount,
        currency,
        category,
        title,
        merchant: title,
        description: title,
        date,
        items: Array.isArray(parsed.items) ? parsed.items : [],
        error: amount > 0 ? undefined : 'Маблағи чекро тасдиқ кунед',
      };
    }

    // Default friendly response if OCR couldn't read numbers directly:
    return {
      success: false,
      amount: 0,
      currency: 'TJS',
      category: 'Переводы',
      title: 'Dushanbe City',
      merchant: 'Dushanbe City',
      description: 'Dushanbe City',
      date: new Date().toISOString().split('T')[0],
      error: 'Чек қабул шуд. Лутфан маблағро дар зер тасдиқ ё ворид кунед.',
    };
  } catch (error: any) {
    console.error('Receipt parse extraction error:', error);
    return {
      success: false,
      amount: 0,
      currency: 'TJS',
      category: 'Переводы',
      title: 'Чек',
      merchant: 'Чек',
      description: 'Чек',
      date: new Date().toISOString().split('T')[0],
      error: 'Чек қабул шуд. Лутфан маблағро дар зер тасдиқ ё ворид кунед.',
    };
  }
}

