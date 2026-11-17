// Server settings from environment variables. Fails loudly when a required value is
// missing or too weak, so a misconfigured deploy never runs unprotected.

export function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

// Signs the unlock cookie. Must be at least 32 characters.
export function lockSecret(): string {
  const s = required('JWT_SECRET');
  if (s.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return s;
}
