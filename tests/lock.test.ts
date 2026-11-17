import { randomBytes } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { clientIp, cookieValue, isUnlocked, newLockValue, pinMatches, LOCK_COOKIE } from '../api/_lib/lock.js';

beforeAll(() => {
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.STAFF_PIN = '4821';
});

const withCookie = (value: string) => ({ headers: { cookie: `${LOCK_COOKIE}=${encodeURIComponent(value)}` } }) as unknown as VercelRequest;

describe('PIN check', () => {
  it('accepts the configured PIN only', () => {
    expect(pinMatches('4821')).toBe(true);
    expect(pinMatches('4822')).toBe(false);
    expect(pinMatches('48210')).toBe(false);
    expect(pinMatches(undefined)).toBe(false);
  });
});

describe('unlock cookie', () => {
  it('is accepted before it expires', () => {
    const now = Date.now();
    expect(isUnlocked(withCookie(newLockValue(now)), now + 60_000)).toBe(true);
  });
  it('is refused after 12 hours', () => {
    const now = Date.now();
    expect(isUnlocked(withCookie(newLockValue(now)), now + 12 * 3600_000 + 1)).toBe(false);
  });
  it('is refused when tampered with', () => {
    const now = Date.now();
    const v = newLockValue(now);
    const [exp, mac] = v.split('.');
    const later = String(Number(exp) + 99 * 3600_000);
    expect(isUnlocked(withCookie(`${later}.${mac}`), now)).toBe(false);
    expect(isUnlocked(withCookie(`${exp}.${mac.slice(0, -2)}xx`), now)).toBe(false);
  });
  it('is refused when missing', () => {
    expect(isUnlocked({ headers: {} } as unknown as VercelRequest)).toBe(false);
    expect(cookieValue({ headers: { cookie: 'other=1' } } as unknown as VercelRequest, LOCK_COOKIE)).toBeNull();
  });
});

describe('client address', () => {
  it('uses the first forwarded address', () => {
    expect(clientIp({ headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' } } as unknown as VercelRequest)).toBe('203.0.113.5');
  });
});
