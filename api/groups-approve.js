// api/groups-approve.js
// POST — admin only. Approves a pending chapter request and creates the live group.
// Requires x-admin-token header matching ADMIN_SECRET env var.
// Body: { requestId, emoji?, bg?, freq? }
//
// Also handles:
// GET  — lists all pending requests (admin only)
// DELETE ?requestId=XXX — rejects/removes a pending request

import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const CITY_EMOJIS = {
  'new york': '🏙️', 'los angeles': '🌴', 'chicago': '🏥', 'dallas': '🌆',
  'san francisco': '🌉', 'boston': '🦞', 'atlanta': '🍑', 'miami': '🌊',
  'seattle': '☕', 'denver': '🏔️', 'austin': '🤠', 'toronto': '🍁',
  'london': '🎡', 'sydney': '🦘', 'dubai': '🏗️', 'singapore': '🦁',
};
const COLORS = ['#EAF6F8','#F0FDF4','#FFF7ED','#EEF2FF','#FDF2F8','#F0FFF4'];

function getEmoji(city) {
  const lower = city.toLowerCase();
  for (const [key, emoji] of Object.entries(CITY_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '📍';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Validate admin token
  if (req.headers['x-admin-token'] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const kv = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // ── GET: list pending requests ────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const pendingIds = (await kv.get('groups:pending')) || [];
      const requests = await Promise.all(pendingIds.map(id => kv.get(`group:request:${id}`)));
      return res.status(200).json({ requests: requests.filter(Boolean) });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to load requests.' });
    }
  }

  // ── POST: approve a request ───────────────────────────────────────────────
  if (req.method === 'POST') {
    const { requestId } = req.body || {};
    if (!requestId) return res.status(400).json({ error: 'Missing requestId.' });

    try {
      const request = await kv.get(`group:request:${requestId}`);
      if (!request) return res.status(404).json({ error: 'Request not found.' });

      const groupId = crypto.randomBytes(6).toString('hex');
      const group = {
        id: groupId,
        city: request.city,
        chapterName: request.chapterName,
        emoji: getEmoji(request.city),
        bg: COLORS[Math.floor(Math.random() * COLORS.length)],
        freq: request.frequency,
        leadName: request.name,
        leadEmail: request.email,
        createdAt: new Date().toISOString(),
      };

      // Save group
      await kv.set(`group:${groupId}`, group);

      // Add lead as first member
      await kv.set(`group:${groupId}:members`, [{
        name: request.name,
        email: request.email,
        joinedAt: new Date().toISOString(),
        isLead: true,
      }]);

      // Add to approved index
      const index = (await kv.get('groups:index')) || [];
      index.push(groupId);
      await kv.set('groups:index', index);

      // Remove from pending
      const pending = (await kv.get('groups:pending')) || [];
      await kv.set('groups:pending', pending.filter(id => id !== requestId));
      await kv.del(`group:request:${requestId}`);

      // Mark request as approved
      await kv.set(`group:request:${requestId}:approved`, { groupId, approvedAt: new Date().toISOString() });

      return res.status(200).json({ success: true, group });
    } catch (err) {
      console.error('groups-approve error:', err);
      return res.status(500).json({ error: 'Failed to approve request.' });
    }
  }

  // ── DELETE: reject a request ──────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { requestId } = req.query;
    if (!requestId) return res.status(400).json({ error: 'Missing requestId.' });
    try {
      const pending = (await kv.get('groups:pending')) || [];
      await kv.set('groups:pending', pending.filter(id => id !== requestId));
      await kv.del(`group:request:${requestId}`);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to reject request.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
