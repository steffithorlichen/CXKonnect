// api/upload.js
// Receives a PDF file in the request body and stores it in Vercel Blob.
// Protected by ADMIN_SECRET environment variable.

import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false, // We read the raw stream directly
  },
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate admin token
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken || adminToken !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get filename from header (sent by the admin page)
  const rawFilename = req.headers['x-filename'];
  if (!rawFilename) {
    return res.status(400).json({ error: 'Missing x-filename header' });
  }

  // Sanitize filename: strip path traversal, keep only safe characters
  const filename = rawFilename
    .replace(/[^a-zA-Z0-9._\- ]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();

  if (!filename.endsWith('.pdf')) {
    return res.status(400).json({ error: 'Only PDF files are accepted' });
  }

  try {
    // Store under a documents/ prefix in Vercel Blob
    const blob = await put(`documents/${filename}`, req, {
      access: 'public',
      contentType: 'application/pdf',
    });

    return res.status(200).json({
      success: true,
      url: blob.url,
      filename,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
}
