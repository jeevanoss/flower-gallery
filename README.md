# 🌸 Flower Gallery — Full Cloudflare Stack

## Files
```
flower-gallery/
├── public/
│   ├── flower.html        ← Main gallery (reads from D1)
│   └── upload.html        ← Mobile upload page (protected by CF Access)
├── functions/
│   └── api/
│       ├── flowers.js     ← GET flowers, POST favorite toggle
│       └── upload.js      ← POST image → R2 + D1 + Gemini AI tag
├── schema.sql             ← D1 database schema
└── wrangler.toml          ← Cloudflare config (fill in your IDs)
```

---

## Setup (one-time, ~20 min)

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

### 2. Create D1 database
```bash
wrangler d1 create flower-db
# Copy the database_id into wrangler.toml

wrangler d1 execute flower-db --file=schema.sql
```

### 3. Create R2 bucket
```bash
wrangler r2 bucket create flower-images
```

Then in Cloudflare R2 dashboard:
- Go to your bucket → Settings → Public Access → Enable
- Copy the public URL (looks like `https://pub-XXXX.r2.dev`)
- Paste it into `wrangler.toml` as `R2_PUBLIC_URL`

### 4. Get Gemini API key
- Go to https://aistudio.google.com/app/apikey
- Create a key, paste into `wrangler.toml` as `GEMINI_KEY`

### 5. Update wrangler.toml
Fill in all 3 placeholders:
- `YOUR-D1-ID-HERE`
- `YOUR-GEMINI-API-KEY-HERE`
- `https://pub-YOURHASH.r2.dev`

### 6. Deploy to Cloudflare Pages
```bash
# Option A: Connect GitHub repo at pages.cloudflare.com (recommended)
# Option B: Deploy directly
wrangler pages deploy public
```

Your gallery is live at `yourproject.pages.dev`

### 7. Custom domain (optional)
In Pages dashboard → Custom Domains → Add `permit.hp` or any subdomain

### 8. Protect upload page with Cloudflare Access
1. Go to https://one.dash.cloudflare.com
2. Access → Applications → Add an Application → Self-hosted
3. Application domain: `yourproject.pages.dev/upload.html`
4. Identity providers: Add Google
5. Policies: Allow → Emails → add your email

Only you (and anyone you add) can access `/upload.html`. Gallery is public.

---

## How it works

### Uploading a flower
1. Open `upload.html` on your phone
2. Take/choose a photo
3. Fill in location and date (name is optional)
4. Hit Upload → image goes to R2, metadata to D1
5. In background: Gemini identifies the flower and writes name + tags back to D1
6. Gallery auto-refreshes every 30s to show AI tags when ready

### Gallery features
- Reads all flowers from D1 via `/api/flowers`
- Categories auto-generated from AI tags
- Favorites stored in D1 per user (syncs across devices)
- Search by name, location, species
- Sort by latest / oldest / A→Z
- LightGallery lightbox with captions
- Skeleton loading state

---

## Cloudflare Free Tier Limits
| Service | Free Limit |
|---------|-----------|
| Pages   | Unlimited requests |
| D1      | 5GB storage, 5M reads/day |
| R2      | 10GB storage, zero egress fees |
| Workers | 100K requests/day |
| Access  | 50 users free |

More than enough for a personal flower collection forever.
