export interface TelegramTransportError {
  name?: string;
  cause?: { code?: string; name?: string };
  code?: string;
}

export function describeTelegramTransportError(error: unknown): string {
  const value = (error && typeof error === 'object' ? error : {}) as TelegramTransportError;
  const cause = value.cause && typeof value.cause === 'object' ? value.cause : {};
  const code = cause.code || value.code;

  if (value.name === 'AbortError') return 'Telegram API request was aborted';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return `Telegram API DNS lookup failed (${code})`;
  }
  if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') {
    return `Telegram API connection timed out (${code})`;
  }
  if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'EHOSTUNREACH' || code === 'ENETUNREACH') {
    return `Telegram API connection failed (${code})`;
  }
  if (code === 'CERT_HAS_EXPIRED' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
    return `Telegram API TLS certificate check failed (${code})`;
  }
  return 'Telegram API network request failed';
}

export function shouldRetryTelegramInit(errorCode?: number): boolean {
  if (errorCode === 401 || errorCode === 400 || errorCode === 404) return false;
  return errorCode === undefined || errorCode === 0 || errorCode === 408 || errorCode === 429 || errorCode >= 500;
}

export function getTelegramRetryDelay(attempt: number): number {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  return Math.min(5_000 * (2 ** Math.min(safeAttempt, 4)), 60_000);
}
