import test from 'node:test';
import assert from 'node:assert/strict';
import { describeTelegramTransportError, getTelegramRetryDelay, shouldRetryTelegramInit } from '../server/telegram-errors.ts';

test('classifies DNS, timeout, connection and TLS errors without leaking raw error details', () => {
  assert.match(describeTelegramTransportError({ cause: { code: 'ENOTFOUND' } }), /DNS/);
  assert.match(describeTelegramTransportError({ cause: { code: 'ETIMEDOUT' } }), /timed out/);
  assert.match(describeTelegramTransportError({ name: 'TimeoutError' }), /timed out/);
  assert.match(describeTelegramTransportError({ cause: { code: 'ECONNRESET' } }), /connection failed/);
  assert.match(describeTelegramTransportError({ cause: { code: 'CERT_HAS_EXPIRED' } }), /TLS/);
  assert.equal(describeTelegramTransportError(new Error('secret token should not be logged')), 'Telegram API network request failed');
});

test('does not retry invalid credentials or malformed requests', () => {
  assert.equal(shouldRetryTelegramInit(401), false);
  assert.equal(shouldRetryTelegramInit(400), false);
  assert.equal(shouldRetryTelegramInit(404), false);
});

test('retries transient network, rate limit and server failures', () => {
  assert.equal(shouldRetryTelegramInit(undefined), true);
  assert.equal(shouldRetryTelegramInit(502), true);
  assert.equal(shouldRetryTelegramInit(503), true);
  assert.equal(shouldRetryTelegramInit(429), true);
});

test('retry delay grows but is capped at one minute', () => {
  assert.equal(getTelegramRetryDelay(0), 5000);
  assert.equal(getTelegramRetryDelay(1), 10000);
  assert.equal(getTelegramRetryDelay(99), 60000);
});
