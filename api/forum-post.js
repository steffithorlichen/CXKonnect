// api/forum-post.js
// GET /api/forum-post?id=POSTID
// Returns the full post including all replies.

import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing post id.' });

  try {
    const kv = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const post = await kv.get(`post:${id}`);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    return res.status(200).json({ post });
  } catch (err) {
    console.error('Post GET error:', err);
    return res.status(500).json({ error: 'Failed to load post.' });
  }
}
