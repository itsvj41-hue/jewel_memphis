// Counter PIN lock. The server sets an HttpOnly cookie on a correct PIN; the browser
// never stores the PIN.

export class LockError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) {
    super(message);
  }
}

const HEADERS = { 'content-type': 'application/json', 'x-requested-with': 'app' };

export async function isUnlocked(): Promise<boolean> {
  try {
    const res = await fetch('/api/lock', { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) return false;
    return Boolean((await res.json() as { unlocked?: boolean }).unlocked);
  } catch {
    return false;
  }
}

export async function unlock(pin: string): Promise<void> {
  const res = await fetch('/api/lock', { method: 'POST', headers: HEADERS, credentials: 'same-origin', body: JSON.stringify({ pin }) });
  if (res.ok) return;
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  throw new LockError(res.status, body.error ?? 'Could not unlock.', Number(res.headers.get('retry-after')) || undefined);
}

export async function lockCounter(): Promise<void> {
  await fetch('/api/lock', { method: 'DELETE', credentials: 'same-origin' });
}
