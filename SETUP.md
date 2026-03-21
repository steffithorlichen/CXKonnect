# CXKonnect Document System — Setup Guide

## What this adds to your site

| File | Purpose |
|------|---------|
| `api/upload.js` | Serverless function — receives PDFs, stores in Vercel Blob |
| `api/documents.js` | Serverless function — lists all stored PDFs |
| `api/delete.js` | Serverless function — deletes a PDF (admin only) |
| `documents.html` | Public reader page — lists & embeds PDFs in-browser |
| `admin.html` | Password-protected upload & management page |
| `package.json` | Adds `@vercel/blob` dependency |

---

## Step 1 — Add files to your site

Copy ALL files into your existing Vercel project, preserving the folder structure:

```
your-site/
├── api/
│   ├── upload.js
│   ├── documents.js
│   └── delete.js
├── documents.html     ← add to your existing pages
├── admin.html
└── package.json       ← merge with existing if you already have one
```

If you already have a `package.json`, just add this to your dependencies:
```json
"@vercel/blob": "^0.23.0"
```

---

## Step 2 — Set environment variables in Vercel

Go to your Vercel project → **Settings → Environment Variables** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `ADMIN_SECRET` | Choose a strong password | This is your admin page login |
| `BLOB_READ_WRITE_TOKEN` | From Vercel Blob dashboard | Already exists if Blob is enabled |

To find your `BLOB_READ_WRITE_TOKEN`:
1. Go to vercel.com → your project → **Storage** tab
2. Click on your Blob store → **Getting started** or **`.env.local`** tab
3. Copy the token value

---

## Step 3 — Deploy

Push the files to your connected Git repo (GitHub, GitLab, etc.) — Vercel will redeploy automatically.

Or drag-and-drop via the Vercel dashboard if you're uploading files manually.

---

## Step 4 — Test

1. Visit **cxkonnect.com/admin.html** 
2. Enter your `ADMIN_SECRET` password
3. Upload a test PDF
4. Visit **cxkonnect.com/documents.html** — your PDF should appear and open in-browser

---

## Step 5 — Link to documents.html from your main nav

Find the navigation in your existing HTML and add:
```html
<a href="/documents.html">Documents</a>
```

---

## How it works day-to-day

**To add a document:**
1. Go to `/admin.html`
2. Enter your password
3. Drag a PDF onto the upload zone or click to browse
4. It appears on the public `/documents.html` page immediately

**To remove a document:**
1. Go to `/admin.html`
2. Find the document in the list
3. Click Delete — it is removed from Vercel Blob and disappears from the public page

---

## Security notes

- The admin password is validated server-side — it is never stored or exposed in the browser
- The admin session persists until you click "Sign out" or close the browser tab
- PDFs are stored in Vercel Blob with public read access — anyone with the direct URL can view them
- If you later want login-gated document access, that requires adding Vercel Auth or a similar layer

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API functions return 500 | Check that `BLOB_READ_WRITE_TOKEN` is set in Vercel env vars |
| Login always fails | Check that `ADMIN_SECRET` is set correctly in Vercel env vars |
| PDFs don't display in browser | Vercel Blob URLs are HTTPS — this works in all modern browsers |
| "Only PDF files accepted" on correct file | Confirm the file isn't named `.PDF` (uppercase) — the check is case-insensitive but test to confirm |
