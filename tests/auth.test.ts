import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyTelegramWebAppData } from '../server/auth.ts';

const BOT_TOKEN = 'test-telegram-bot-token';

function createInitData(authDate: number, user = { id: 123456, first_name: 'Test' }) {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'AAE-test-query',
    user: JSON.stringify(user),
  });
  const dataCheckString = Array.from(params.keys())
    .sort()
    .map((key) => `${key}=${params.get(key)}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

test('accepts valid, recent Telegram initData', () => {
  const now = Math.floor(Date.now() / 1000);
  const result = verifyTelegramWebAppData(createInitData(now), BOT_TOKEN);
  assert.equal(result.verified, true);
  assert.equal(result.user?.id, 123456);
});

test('rejects a modified payload with an invalid signature', () => {
  const now = Math.floor(Date.now() / 1000);
  const initData = createInitData(now).replace('first_name%22%3A%22Test', 'first_name%22%3A%22Fake');
  assert.equal(verifyTelegramWebAppData(initData, BOT_TOKEN).verified, false);
});

test('rejects stale initData', () => {
  const now = Math.floor(Date.now() / 1000);
  const stale = createInitData(now - 25 * 60 * 60);
  assert.equal(verifyTelegramWebAppData(stale, BOT_TOKEN).verified, false);
});

test('rejects initData dated too far in the future', () => {
  const now = Math.floor(Date.now() / 1000);
  const future = createInitData(now + 10 * 60);
  assert.equal(verifyTelegramWebAppData(future, BOT_TOKEN).verified, false);
});

test('rejects payloads without a valid Telegram user ID', () => {
  const now = Math.floor(Date.now() / 1000);
  const invalidUser = createInitData(now, { id: 0, first_name: 'Invalid' });
  assert.equal(verifyTelegramWebAppData(invalidUser, BOT_TOKEN).verified, false);
});
