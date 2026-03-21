// api/groups-members.js
// GET /api/groups-members?groupId=XXX
// Returns the member list for a group. Auth required — logged-in members only.

import { Redis } from '@upstash/redis';

async function getSession(kv, req) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) return null;
  return kv.get(`session:${token}`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { groupId } = req.query;
  if (!groupId) return res.status(400).json({ error: 'Missing groupId.' });

  try {
    const kv = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const session = await getSession(kv, req);
    if (!session) return res.status(401).json({ error: 'Sign in to see group members.' });

    const group = await kv.get(`group:${groupId}`);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const members = (await kv.get(`group:${groupId}:members`)) || [];

    // Return name + first initial of email domain only — no full emails exposed
    const safe = members.map(m => ({
      name: m.name,
      joinedAt: m.joinedAt,
      isYou: m.email === session.email,
    }));

    return res.status(200).json({ members: safe, groupCity: group.city });
  } catch (err) {
    console.error('groups-members error:', err);
    return res.status(500).json({ error: 'Failed to load members.' });
  }
}
