# Deployment Guide — Today's Special v0.2

This code is deployment-ready but has **not been deployed yet** — none of the steps below have been run against a live account. I can't create accounts or log into web dashboards on your behalf (no browser access), so this is written as steps for you to execute, in order. Where a step needs a value only you can generate (account credentials, connection strings, API keys), it's called out explicitly. Never paste real secret values back into chat — just confirm when a step is done.

## Phase 0 — Push to GitHub

This repo has no remote yet.

```bash
cd "D:\today-spl-project-version0.2"
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin master
```

(Create the empty repo on github.com first, or run `gh repo create <repo-name> --public --source=. --remote=origin --push` if you have the GitHub CLI authenticated.)

## Phase 1 — MongoDB Atlas

1. Create a free M0 cluster at mongodb.com/atlas.
2. Database Access → add a user with a strong password.
3. Network Access → allow access from anywhere (`0.0.0.0/0`) — acceptable for a demo project; tighten later if this becomes a real client project.
4. Copy the SRV connection string (`mongodb+srv://<user>:<password>@.../todays-special`) — this is your `MONGODB_URI`.

## Phase 2 — Cloudinary (media storage)

1. Sign up free at cloudinary.com.
2. Dashboard → "Account Details" gives you three values: Cloud Name, API Key, API Secret. These map directly to `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Nothing else to configure — the backend code already branches to Cloudinary automatically once all three are set (see `backend/services/storageService.js`).

## Phase 3 — Backend on Render

1. New → Web Service → connect the GitHub repo from Phase 0.
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Health Check Path: `/health`
6. Environment variables (Render dashboard → Environment):

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | from Phase 1 |
   | `JWT_SECRET` | a long random string — generate with `openssl rand -hex 32` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `MEDIA_BASE_URL` | your Render service URL, e.g. `https://todays-special-backend.onrender.com` |
   | `FRONTEND_URL` | comma-separated dashboard + TV player URLs from Phase 4/5 (you'll fill this in after they exist — Render lets you edit env vars post-deploy and it restarts automatically) |
   | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | from Phase 2 |

7. Deploy. Once live, verify: `curl https://<your-backend>.onrender.com/health` should return `{"status":"ok",...}`.
8. Run the admin seed once, either locally against the Atlas URI (`MONGODB_URI=<atlas-uri> npm run seed:admin` from `backend/`) or via Render's shell — this is the only account you'll log into the dashboard with, so use a real password, not something you'd mind a client seeing if you ever screen-share a login.

A `render.yaml` is included at the repo root if you prefer Render's Blueprint (Infrastructure-as-Code) deploy flow instead of clicking through the dashboard — it declares the same build/start/health-check config above; you'd still enter the secret values through Render's UI since they're marked `sync: false`.

## Phase 4 — Manager Dashboard on Vercel

1. New Project → import the same GitHub repo.
2. Root Directory: `manager-dashboard`
3. Framework Preset: Vite (auto-detected)
4. Environment variable: `VITE_API_BASE_URL` = your Render backend URL from Phase 3.
5. Deploy. `vercel.json` (already in this folder) handles client-side route refreshes.
6. Once you have this URL, go back to Render and add it to the backend's `FRONTEND_URL` env var.

## Phase 5 — TV Player on Vercel

1. New Project → same repo, Root Directory: `tv-player`.
2. Environment variable: `VITE_API_BASE_URL` = same Render backend URL.
3. Deploy.
4. Add this URL too to the backend's `FRONTEND_URL` (comma-separated with the dashboard URL).

## Phase 6 — Production smoke test

**Manager dashboard**: open the deployed URL → log in with the seeded admin account → create a special → upload an image → upload a video (check whether it comes back `conversionStatus: "converted"` — if it says `skipped_ffmpeg_unavailable`, FFmpeg failed to load on Render; see Troubleshooting) → edit it → delete it.

**Backend**: `GET /health` returns ok; unauthenticated `GET /current-playlist` returns your active specials with Cloudinary URLs (not localhost ones) in `mediaUrl`.

**TV Player**: open the deployed URL → specials load and display → video plays and loops → refresh the page → it recovers cleanly → temporarily block the backend URL in devtools to confirm cached playback continues.

## Known limitations to disclose honestly

- No scheduling (time/date-based specials) — not implemented.
- No true fullscreen via the Fullscreen API — the player fills the viewport with CSS only.
- Render's free tier spins down on inactivity; the first request after idle can take ~30-60s to wake the backend. Fine for a portfolio demo, worth mentioning if you're live-demoing it to a client.

## Troubleshooting

**FFmpeg says unavailable in production**: `@ffmpeg-installer/ffmpeg` ships a static binary per-platform as an npm dependency specifically so this isn't an issue on Render's standard Linux runtime — if it still reports unavailable, check the Render deploy logs for an install error on that package, and confirm you're not on an unusual Render runtime/architecture.

**Uploads succeed but images don't load**: check the three `CLOUDINARY_*` env vars are all set on Render (partially set = falls back to local disk, which then gets wiped on the next deploy).

**CORS errors on login**: `FRONTEND_URL` on Render must exactly match the Vercel URLs (including `https://`, no trailing slash), comma-separated.
