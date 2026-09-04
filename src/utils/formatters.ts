export function formatCurrency(amount: number, currency: string = 'RUB'): string {
  const symbols: Record<string, string> = {
    RUB: '₽',
    USD: '$',
    EUR: '€',
    KZT: '₸',
    TJS: 'сомони',
  };

  const symbol = symbols[currency] || currency;
  const formattedNumber = Math.round(amount).toLocaleString('ru-RU');

  if (currency === 'USD' || currency === 'EUR') {
    return `${symbol}${formattedNumber}`;
  }
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
