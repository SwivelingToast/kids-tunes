import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/db.js';

export const pinRouter = Router();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

// Single-process, in-memory throttle - this app only ever runs as one
// instance on the LAN, so a persisted/distributed limiter would be
// overkill. Resets on every successful verify.
let failedAttempts = 0;
let lockedUntil = 0;

interface SettingsRow {
  pin_hash: string;
}

function getPinHash(): string {
  const row = db.prepare<[], SettingsRow>('SELECT pin_hash FROM settings WHERE id = 1').get();
  if (!row) throw new Error('settings row missing - initDb() must run before serving requests');
  return row.pin_hash;
}

pinRouter.post('/verify', (req, res) => {
  const now = Date.now();
  if (now < lockedUntil) {
    const retryAfterSeconds = Math.ceil((lockedUntil - now) / 1000);
    return res.status(429).json({ ok: false, error: 'Too many attempts. Try again shortly.', retryAfterSeconds });
  }

  const pin = req.body?.pin;
  if (typeof pin !== 'string') return res.status(400).json({ error: 'pin is required' });

  const match = bcrypt.compareSync(pin, getPinHash());
  if (match) {
    failedAttempts = 0;
    return res.json({ ok: true });
  }

  failedAttempts += 1;
  if (failedAttempts >= MAX_ATTEMPTS) {
    lockedUntil = now + LOCKOUT_MS;
    failedAttempts = 0;
  }
  res.json({ ok: false });
});

pinRouter.post('/change', (req, res) => {
  const { currentPin, newPin } = req.body ?? {};
  if (typeof currentPin !== 'string' || typeof newPin !== 'string') {
    return res.status(400).json({ error: 'currentPin and newPin are required' });
  }
  if (!bcrypt.compareSync(currentPin, getPinHash())) {
    return res.status(400).json({ error: 'Current PIN is incorrect.' });
  }
  if (!/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ error: 'New PIN must be exactly four digits.' });
  }

  const pinHash = bcrypt.hashSync(newPin, 10);
  db.prepare('UPDATE settings SET pin_hash = ?, updated_at = ? WHERE id = 1').run(pinHash, Date.now());
  res.json({ ok: true });
});
