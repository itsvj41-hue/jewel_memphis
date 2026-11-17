import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest } from '@vercel/node';
import { lockSecret, required } from './config.js';

// PIN lock for the counter. One shared PIN (STAFF_PIN). A correct PIN sets a signed,
// time-limited HttpOnly cookie. The browser never sees the PIN after it is typed.

export const LOCK_COOKIE = 'gj_unlock';
const HOURS = 12;

function sign(payload: string): string {
  return createHmac('sha256', lockSecret()).update(payload).digest('base64url');
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function pinMatches(given: unknown): boolean {
  if (typeof given !== 'string') return false;
  return same(given, required('STAFF_PIN'));
}

export function newLockValue(now = Date.now()): string {
  const exp = String(now + HOURS * 3600_000);
  return `${exp}.${sign(exp)}`;
}

export function isUnlocked(req: VercelRequest, now = Date.now()): boolean {
  const raw = cookieValue(req, LOCK_COOKIE);
  if (!raw) return false;
  const [exp, mac] = raw.split('.');
  if (!exp || !mac || !same(mac, sign(exp))) return false;
  return Number(exp) > now;
}

export function cookieValue(req: VercelRequest, name: string): string | null {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function setLockCookie(value: string): string {
  return `${LOCK_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${HOURS * 3600}`;
}

export function clearLockCookie(): string {
  return `${LOCK_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function clientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || 'unknown';
}
