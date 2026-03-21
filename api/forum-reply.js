// api/forum-reply.js
// POST — adds a reply to an existing post. Requires auth.
// Body: { postId, body }

import { Redis } from '@upstash/redis';
import crypto from 'crypto';

async function getSession(kv, req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  return kv.get(`session:${token}`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const kv = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const session = await getSession(kv, req);
  if (!session) return res.status(401).json({ error: 'You must be logged in to reply.' });

  const { postId, body } = req.body || {};
  if (!postId || !body)
    return res.status(400).json({ error: 'Post ID and reply body are required.' });

  try {
    const post = await kv.get(`post:${postId}`);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const reply = {
      id: crypto.randomBytes(6).toString('hex'),
      body: body.trim().substring(0, 2000),
      author: session.name,
      authorEmail: session.email,
      createdAt: new Date().toISOString(),
    };

    const replies = post.replies || [];
    replies.push(reply);
    await kv.set(`post:${postId}`, { ...post, replies });

    return res.status(201).json({ reply, replyCount: replies.length });
  } catch (err) {
    console.error('Reply error:', err);
    return res.status(500).json({ error: 'Failed to post reply.' });
  }
}
