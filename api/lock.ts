import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/supabase.js';
import { clearLockCookie, clientIp, isUnlocked, newLockValue, pinMatches, setLockCookie } from './_lib/lock.js';

// GET    /api/lock         -> { unlocked }
// POST   /api/lock { pin } -> unlocks (sets cookie) or 401
// DELETE /api/lock         -> locks again

const ATTEMPTS = { windowSeconds: 900, max: 10 }; // per network address

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return res.json({ unlocked: isUnlocked(req) });

    if (req.method === 'DELETE') {
      res.setHeader('Set-Cookie', clearLockCookie());
      return res.json({ unlocked: false });
    }

    if (req.method === 'POST') {
      // Browsers send the custom header from our app only; it blocks cross-site forms.
      if (req.headers['x-requested-with'] !== 'app') return res.status(403).json({ error: 'Request not allowed' });

      const sb = serviceClient();
      const { data, error } = await sb.rpc('rate_limit_hit', {
        p_key: `pin:${clientIp(req)}`,
        p_window_seconds: ATTEMPTS.windowSeconds,
        p_max: ATTEMPTS.max,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.allowed) {
        res.setHeader('Retry-After', String(row?.retry_after_seconds ?? ATTEMPTS.windowSeconds));
        return res.status(429).json({ error: 'Too many attempts. Try again later.' });
      }

      const pin = typeof req.body === 'string' ? JSON.parse(req.body).pin : req.body?.pin;
      if (!pinMatches(pin)) return res.status(401).json({ error: 'Wrong PIN' });

      res.setHeader('Set-Cookie', setLockCookie(newLockValue()));
      return res.json({ unlocked: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(`[lock] ${req.method} failed: ${(err as Error).message}`);
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
}
