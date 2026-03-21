// api/auth.js
// Validates the admin token against ADMIN_SECRET env var.
// Returns 200 if correct, 401 if wrong. No Blob dependency.

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminToken = req.headers['x-admin-token'];

  if (!adminToken || adminToken !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.status(200).json({ ok: true });
}
