/**
 * Currency Conversion and Exchange Rates
 * Base currency: TJS (Tajik Somoni)
 *
 * Official & Market Exchange rates:
 * - 1 USD ≈ 10.7 TJS  (1 TJS ≈ $0.093458)
 * - 1000 RUB ≈ 107 TJS -> 1 RUB ≈ 0.107 TJS  (1 TJS ≈ 9.3458 RUB)
 * - 1 EUR ≈ 11.6 TJS  (1 TJS ≈ €0.086207)
 * - 1000 KZT ≈ 23.8 TJS -> 1 KZT ≈ 0.0238 TJS (1 TJS ≈ 42.02 KZT)
 *
 * Example:
 * 3900 TJS -> in USD: 3900 / 10.7 = ~$364.48
 * 3900 TJS -> in RUB: 3900 / 0.107 = ~36 448 ₽
 * 3900 TJS -> in EUR: 3900 / 11.6 = ~€336.21
 */

export const DEFAULT_CURRENCY_RATES_TO_TJS: Record<string, number> = {
  TJS: 1.0,
  USD: 10.7,
  RUB: 0.107,
  EUR: 11.6,
  KZT: 0.0238,
};

/**
 * Converts an amount from one currency to another using exchange rates relative to TJS base.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string = 'TJS',
  toCurrency: string = 'TJS',
  rates: Record<string, number> = DEFAULT_CURRENCY_RATES_TO_TJS
): number {
  if (amount === undefined || amount === null || isNaN(amount)) return 0;
  if (amount === 0) return 0;

  const from = (fromCurrency || 'TJS').toUpperCase();
  const to = (toCurrency || 'TJS').toUpperCase();

  if (from === to) return amount;

  const rateFrom = rates[from] ?? DEFAULT_CURRENCY_RATES_TO_TJS[from] ?? 1.0;
  const rateTo = rates[to] ?? DEFAULT_CURRENCY_RATES_TO_TJS[to] ?? 1.0;

  // 1. Convert to base TJS
  const amountInTjs = amount * rateFrom;

  // 2. Convert to target currency
  const converted = amountInTjs / rateTo;

  return converted;
}

/**
 * Normalizes any category string into one of canonical DEFAULT_CATEGORIES
 */
export function normalizeCategory(cat?: string): string {
  if (!cat) return 'Переводы';
  const c = cat.toLowerCase().trim();

  if (
    c.includes('перевод') ||
    c.includes('интиқол') ||
    c.includes('интикол') ||
    c.includes('transfer') ||
    c.includes('city') ||
    c.includes('сити') ||
    c.includes('алиф') ||
    c.includes('alif') ||
    c.includes('эсхата') ||
    c.includes('ориён') ||
    c.includes('ориен') ||
    c.includes('ҳумо') ||
    c.includes('хумо') ||
    c.includes('амонат') ||
    c.includes('банк')
  ) {
    return 'Переводы';
  }

  if (
    c.includes('продукт') ||
    c.includes('супермаркет') ||
    c.includes('хӯрок') ||
    c.includes('хурок') ||
    c.includes('пайкар') ||
    c.includes('ёвар') ||
    c.includes('евар') ||
    c.includes('ашан') ||
    c.includes('би1') ||
    c.includes('фаровон') ||
    c.includes('еда') ||
    c.includes('маркет') ||
    c.includes('магазин') ||
    c.includes('бозор') ||
    c.includes('нон')
  ) {
    return 'Продукты';
  }

  if (
    c.includes('кафе') ||
    c.includes('ресторан') ||
    c.includes('қаҳва') ||
    c.includes('кахва') ||
    c.includes('кофе') ||
    c.includes('ошхона') ||
    c.includes('столовая') ||
    c.includes('фастфуд') ||
    c.includes('fastfood') ||
    c.includes('бургер') ||
    c.includes('пицца') ||
    c.includes('самбуса') ||
    c.includes('шаурма')
  ) {
    return 'Кафе и рестораны';
  }

  if (
    c.includes('такси') ||
    c.includes('транспорт') ||
    c.includes('нақлиёт') ||
    c.includes('наклиёт') ||
    c.includes('бензин') ||
    c.includes('газ') ||
    c.includes('газпром') ||
    c.includes('заправка') ||
    c.includes('авто') ||
    c.includes('роҳи сомон') ||
    c.includes('яндекс')
  ) {
    return 'Транспорт и такси';
  }

  if (
    c.includes('коммунал') ||
    c.includes('жкх') ||
    c.includes('барқ') ||
    c.includes('барк') ||
    c.includes('об') ||
    c.includes('свет') ||
    c.includes('отопление') ||
    c.includes('барқи тоҷик')
  ) {
    return 'Коммунальные услуги';
  }

  if (
    c.includes('связь') ||
    c.includes('интернет') ||
    c.includes('алоқа') ||
    c.includes('алока') ||
    c.includes('tcell') ||
    c.includes('мегафон') ||
    c.includes('megafon') ||
    c.includes('babilon') ||
    c.includes('вавилон') ||
    c.includes('телефон') ||
    c.includes('баланс') ||
    c.includes('zet')
  ) {
    return 'Связь и интернет';
  }

  if (
    c.includes('аптек') ||
    c.includes('здоров') ||
    c.includes('саломат') ||
    c.includes('дору') ||
    c.includes('клиник') ||
    c.includes('врач') ||
    c.includes('доктор') ||
    c.includes('беморхона') ||
    c.includes('таҳлил')
  ) {
    return 'Здоровье и аптека';
  }

  if (
    c.includes('одежд') ||
    c.includes('покупк') ||
    c.includes('харид') ||
    c.includes('либос') ||
    c.includes('пойафзол') ||
    c.includes('корвон') ||
    c.includes('саховат') ||
    c.includes('обувь')
  ) {
    return 'Покупки и одежда';
  }

  if (
    c.includes('подписк') ||
    c.includes('обуна') ||
    c.includes('сервис') ||
    c.includes('vpn') ||
    c.includes('впн') ||
    c.includes('premium') ||
    c.includes('spotify') ||
    c.includes('youtube')
  ) {
    return 'Подписки и сервисы';
  }

  if (
    c.includes('развлеч') ||
    c.includes('фароғат') ||
    c.includes('кино') ||
    c.includes('парк') ||
    c.includes('театр') ||
    c.includes('истироҳат')
  ) {
    return 'Развлечения и отдых';
  }

  if (
    c.includes('спорт') ||
    c.includes('фитнес') ||
    c.includes('варзиш') ||
    c.includes('зал') ||
    c.includes('тренировк') ||
    c.includes('ҳавз')
  ) {
    return 'Спорт и фитнес';
  }

  if (
    c.includes('образован') ||
    c.includes('маориф') ||
    c.includes('таҳсил') ||
    c.includes('курс') ||
    c.includes('донишгоҳ') ||
    c.includes('мактаб')
  ) {
    return 'Образование';
  }

  if (
    c.includes('дет') ||
    c.includes('семь') ||
    c.includes('оила') ||
    c.includes('кӯдак')
  ) {
    return 'Семья и дети';
  }

  return 'Другое';
}
