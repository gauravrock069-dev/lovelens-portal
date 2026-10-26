# Love Lens Wedding: Client Gallery Portal

Next.js 15 (App Router, React 19) + Tailwind v4 + Supabase + Cloudflare R2.

## Setup

1. **Supabase**: create a project, open the SQL editor and run `supabase/migrations/001_init.sql`.
2. **R2**: create a bucket, then
   - enable public access (custom domain recommended) and copy the URL into `NEXT_PUBLIC_R2_PUBLIC_URL`
   - create an API token with *Object Read & Write* on that bucket
   - add this CORS rule (Bucket → Settings → CORS policy), otherwise browser uploads fail:
     ```json
     [{ "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
        "AllowedMethods": ["PUT"], "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3600 }]
     ```
3. `cp .env.example .env.local` and fill in every value.
4. `npm install && npm run dev`, then open `/admin`.

## Flow

- `/admin`: sign in, **New event** (client, title, date, PIN, categories), **Upload photos**, **Copy client link**.
- `/gallery/[slug]`: client enters the PIN, filters by category, hearts photos, taps **Send selection to WhatsApp**.

## How uploads work

For each photo the browser makes a 900px thumbnail, a 2400px preview and a blur placeholder,
asks `/api/upload/presigned-url` for three presigned PUT URLs, uploads straight to R2 (the
original is never proxied through the server), then calls `/api/admin/photos` to save metadata.
The grid loads thumbnails, the lightbox loads previews, and the full-resolution original stays
in R2 for album design.

## Security model

- RLS denies all direct access from anon/authenticated roles. The browser never talks to Supabase.
  All reads/writes go through server routes using `SUPABASE_SERVICE_ROLE_KEY` (server only).
- PINs are checked on the server. Success sets a signed, httpOnly, per-gallery cookie (30 days).
- PIN attempts are rate limited (8 failures per IP and 40 per gallery per 15 minutes).
- Admin uses a password from `ADMIN_PASSWORD` and a signed httpOnly cookie (7 days).
- Photo URLs on R2 contain random UUIDs, but they are public URLs: anyone who has a photo URL can open it.

## Deploying

Vercel is the simplest option (set the same env vars). Cloudflare Pages needs the OpenNext
adapter and the `nodejs_compat` flag because auth uses `node:crypto`.
