// api/documents.js
// Public endpoint. Returns a list of all PDFs stored in Vercel Blob
// under the documents/ prefix.

import { list } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Allow browsers to call this from the same domain
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { blobs } = await list({ prefix: 'documents/' });

    const documents = blobs.map((blob) => ({
      // Display name: strip the documents/ prefix, decode underscores
      name: blob.pathname
        .replace('documents/', '')
        .replace(/_/g, ' ')
        .replace(/\.pdf$/i, ''),
      filename: blob.pathname.replace('documents/', ''),
      url: blob.url,
      uploadedAt: blob.uploadedAt,
      size: blob.size,
    }));

    // Sort most recently uploaded first
    documents.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    return res.status(200).json({ documents });
  } catch (err) {
    console.error('List error:', err);
    return res.status(500).json({ error: 'Could not load documents', detail: err.message });
  }
}
