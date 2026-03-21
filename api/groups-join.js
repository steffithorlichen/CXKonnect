// api/groups-join.js
// POST — adds the logged-in user to a group's member list.
// Requires Authorization: Bearer {token} header.
// Body: { groupId }

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const kv = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const session = await getSession(kv, req);
    if (!session) return res.status(401).json({ error: 'You must be logged in to join a group.' });

    const { groupId } = req.body || {};
    if (!groupId) return res.status(400).json({ error: 'Missing groupId.' });

    const group = await kv.get(`group:${groupId}`);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    // Get existing members
    const members = (await kv.get(`group:${groupId}:members`)) || [];

    // Check if already a member
    const alreadyJoined = members.some(m => m.email === session.email);
    if (alreadyJoined) {
      return res.status(409).json({ error: 'You are already a member of this group.' });
    }

    // Add member
    members.push({
      name: session.name,
      email: session.email,
      joinedAt: new Date().toISOString(),
    });
    await kv.set(`group:${groupId}:members`, members);

    return res.status(200).json({ success: true, memberCount: members.length });
  } catch (err) {
    console.error('groups-join error:', err);
    return res.status(500).json({ error: 'Failed to join group.' });
  }
}
