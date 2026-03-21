// api/forum-login.js
// Validates credentials and returns a 30-day session token.

import { Redis } from '@upstash/redis';
import crypto from 'crypto';

function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const kv = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const user = await kv.get(`user:${email.toLowerCase().trim()}`);
    if (!user) return res.status(401).json({ error: 'No account found with that email.' });

    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash)
      return res.status(401).json({ error: 'Incorrect password.' });

    const token = crypto.randomBytes(32).toString('hex');
    await kv.set(`session:${token}`, {
      userId: user.id,
      email: user.email,
      name: user.name,
    }, { ex: 60 * 60 * 24 * 30 }); // 30 days

    return res.status(200).json({ token, name: user.name, email: user.email });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}
