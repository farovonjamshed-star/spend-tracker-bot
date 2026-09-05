export function formatCurrency(amount: number, currency: string = 'TJS'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  const upperCurr = (currency || 'TJS').toUpperCase();

  const symbols: Record<string, string> = {
    RUB: '₽',
    USD: '$',
    EUR: '€',
    KZT: '₸',
    TJS: 'сомони',
  };

  const symbol = symbols[upperCurr] || upperCurr;

  if (upperCurr === 'USD') {
    // ~$364.48 (2 decimal places)
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${symbol}${formatted}`;
  }

  if (upperCurr === 'EUR') {
    // ~€336.21 (2 decimal places)
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${symbol}${formatted}`;
  }

  if (upperCurr === 'RUB') {
    // ~36 448 ₽
    const rounded = Math.round(amount);
    return `${rounded.toLocaleString('ru-RU')} ${symbol}`;
  }

  if (upperCurr === 'KZT') {
    const rounded = Math.round(amount);
    return `${rounded.toLocaleString('ru-RU')} ${symbol}`;
  }

  // TJS: If integer, format without decimals; if fractional, show 2 decimals
  const isInteger = Math.abs(amount - Math.round(amount)) < 0.05;
  const formattedNumber = isInteger
    ? Math.round(amount).toLocaleString('ru-RU')
    : amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `${formattedNumber} ${symbol}`;
}

export function formatDate(dateString: string): string {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateString === todayStr) return 'Сегодня';
    if (dateString === yesterdayStr) return 'Вчера';

    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateString;
  }
}
