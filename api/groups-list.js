// api/groups-list.js
// GET — returns all approved groups with member count.
// No auth required — anyone can see the group list.
//
// Redis structure:
//   groups:index          → string[] of group IDs (approved only)
//   group:{id}            → { id, city, emoji, bg, freq, leadName, leadEmail, createdAt }
//   group:{id}:members    → string[] of { name, role, joinedAt } (JSON strings)
//   groups:pending        → string[] of pending request objects (JSON strings, for admin review)

import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const kv = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const index = (await kv.get('groups:index')) || [];
    if (index.length === 0) return res.status(200).json({ groups: [] });

    const groups = await Promise.all(
      index.map(async id => {
        const g = await kv.get(`group:${id}`);
        const members = (await kv.get(`group:${id}:members`)) || [];
        return g ? { ...g, memberCount: members.length } : null;
      })
    );

    return res.status(200).json({ groups: groups.filter(Boolean) });
  } catch (err) {
    console.error('groups-list error:', err);
    return res.status(500).json({ error: 'Failed to load groups.' });
  }
}
