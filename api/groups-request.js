// api/groups-request.js
// POST — submits a chapter start request for admin review.
// Stored in Redis under groups:pending for Steffi to approve.
// Body: { city, chapterName, yourRole, frequency, vision, name, email }

import { Redis } from '@upstash/redis';
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { city, chapterName, yourRole, frequency, vision, name, email } = req.body || {};
  if (!city || !name || !email) {
    return res.status(400).json({ error: 'City, name and email are required.' });
  }

  try {
    const kv = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const id = crypto.randomBytes(6).toString('hex');
    const request = {
      id,
      city: city.trim(),
      chapterName: chapterName?.trim() || `CX Konnect ${city.trim()}`,
      yourRole: yourRole?.trim() || '',
      frequency: frequency || 'Monthly',
      vision: vision?.trim() || '',
      name: name.trim(),
      email: email.trim().toLowerCase(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    // Save individual request
    await kv.set(`group:request:${id}`, request);

    // Add to pending list
    const pending = (await kv.get('groups:pending')) || [];
    pending.unshift(id);
    await kv.set('groups:pending', pending);

    return res.status(201).json({ success: true, message: 'Your chapter request has been received. Steffi will review it and be in touch within 48 hours.' });
  } catch (err) {
    console.error('groups-request error:', err);
    return res.status(500).json({ error: 'Failed to submit request.' });
  }
}
