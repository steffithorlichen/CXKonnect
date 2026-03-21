// api/forum-posts.js
// GET  — returns all posts (summary list, no replies)
// POST — creates a new post (requires valid session token in Authorization header)
//
// Redis structure:
//   posts:index   → string[] of post IDs, newest first
//   post:{id}     → full post object

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

  const kv = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // ── GET: list all posts ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const index = (await kv.get('posts:index')) || [];
      if (index.length === 0) return res.status(200).json({ posts: [] });

      const posts = await Promise.all(
        index.slice(0, 50).map(id => kv.get(`post:${id}`))
      );

      // Return summary (no replies body) sorted newest first
      const summaries = posts
        .filter(Boolean)
        .map(({ replies, ...p }) => ({ ...p, replyCount: (replies || []).length }));

      return res.status(200).json({ posts: summaries });
    } catch (err) {
      console.error('Posts GET error:', err);
      return res.status(500).json({ error: 'Failed to load posts.' });
    }
  }

  // ── POST: create a new post ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    const session = await getSession(kv, req);
    if (!session) return res.status(401).json({ error: 'You must be logged in to post.' });

    const { title, body, topic } = req.body || {};
    if (!title || !body)
      return res.status(400).json({ error: 'Title and body are required.' });

    try {
      const id = crypto.randomBytes(8).toString('hex');
      const post = {
        id,
        title: title.trim().substring(0, 160),
        body: body.trim().substring(0, 4000),
        topic: topic || 'General',
        author: session.name,
        authorEmail: session.email,
        createdAt: new Date().toISOString(),
        replies: [],
      };

      await kv.set(`post:${id}`, post);

      // Prepend to index
      const index = (await kv.get('posts:index')) || [];
      index.unshift(id);
      await kv.set('posts:index', index.slice(0, 500)); // cap at 500 posts

      return res.status(201).json({ post: { ...post, replyCount: 0 } });
    } catch (err) {
      console.error('Post create error:', err);
      return res.status(500).json({ error: 'Failed to create post.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
