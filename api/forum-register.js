// api/forum-register.js
// Creates a new user account. Stores hashed password in Vercel KV.
// Required env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

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

  const { name, email, password } = req.body || {};

  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required.' });

  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const emailKey = `user:${email.toLowerCase().trim()}`;

  try {
    const kv = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const existing = await kv.get(emailKey);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const userId = crypto.randomBytes(8).toString('hex');

    await kv.set(emailKey, {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    });

    // Create session immediately after register
    const token = crypto.randomBytes(32).toString('hex');
    await kv.set(`session:${token}`, {
      userId,
      email: email.toLowerCase().trim(),
      name: name.trim(),
    }, { ex: 60 * 60 * 24 * 30 }); // 30 days

    return res.status(201).json({ token, name: name.trim(), email: email.toLowerCase().trim() });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}
