import crypto from 'crypto';

/**
 * Validates Telegram Mini App initData using Telegram's documented HMAC-SHA256
 * scheme and rejects stale/future authentication payloads.
 */
export function verifyTelegramWebAppData(
  initData: string,
  botToken: string
): { verified: boolean; user?: any; authDate?: number } {
  if (!initData || !botToken) return { verified: false };

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    const authDateRaw = params.get('auth_date');

    if (!hash || !/^[a-f0-9]{64}$/i.test(hash) || !authDateRaw || !/^\d+$/.test(authDateRaw)) {
      return { verified: false };
    }

    const authDate = Number(authDateRaw);
    const now = Math.floor(Date.now() / 1000);
    const maxAgeSeconds = 24 * 60 * 60;
    if (!Number.isSafeInteger(authDate) || authDate > now + 300 || now - authDate > maxAgeSeconds) {
      return { verified: false };
    }

    params.delete('hash');
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys.map((key) => `${key}=${params.get(key)}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest();
    const suppliedHash = Buffer.from(hash, 'hex');
    const verified = suppliedHash.length === calculatedHash.length &&
      crypto.timingSafeEqual(calculatedHash, suppliedHash);

    if (!verified) return { verified: false };

    const userStr = params.get('user');
    const user = userStr ? JSON.parse(userStr) : undefined;
    if (!user || !Number.isSafeInteger(Number(user.id)) || Number(user.id) <= 0) {
      return { verified: false };
    }

    return { verified: true, user, authDate };
  } catch (err) {
    console.error('Telegram initData HMAC validation error:', err);
    return { verified: false };
  }
}
