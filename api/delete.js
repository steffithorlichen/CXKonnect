// api/delete.js
// Admin-only endpoint. Deletes a PDF from Vercel Blob by its URL.

import { del } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate admin token
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken || adminToken !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // URL of the blob to delete comes from query param
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  // Safety check: only allow deletion of our own blobs
  if (!url.includes('.public.blob.vercel-storage.com')) {
    return res.status(400).json({ error: 'Invalid blob URL' });
  }

  try {
    await del(url);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ error: 'Delete failed', detail: err.message });
  }
}
