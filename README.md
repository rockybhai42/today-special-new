# Today's Special — Restaurant Digital Signage System

A full-stack system for restaurants to manage "today's special" content from a manager dashboard and display it automatically on an in-store TV.

```
Manager Dashboard  ──┐
(React + Vite)        ├──►  Backend API  ──►  MongoDB (specials, users)
                       │     (Express)   ──►  Media storage (Cloudinary in
TV Player          ──┘                        production, local disk in dev)
(React + Vite,
 legacy-browser build)
```

## What's actually implemented

- **Manager Dashboard** — JWT-authenticated login, create/edit/delete specials, image and video upload, playlist reordering, activate/deactivate, live preview.
- **Backend API** — Express + MongoDB/Mongoose, JWT auth with bcrypt password hashing, role-protected routes, rate limiting, Helmet security headers, split CORS policy (restricted for auth/CRUD, open for the public playlist and media so TV devices on any origin can reach them).
- **Media pipeline** — uploads are MIME/size validated, videos are normalized via FFmpeg (H.264/AAC, 1920x1080, 30fps) to a TV-safe profile; if FFmpeg is unavailable the raw upload is served instead of failing the request.
- **TV Player** — polls for playlist updates every 60s, preloads the next item for seamless transitions, recovers automatically from stalled/broken video, caches the last known playlist in `localStorage` so playback continues if the API is briefly unreachable.
- **Automated tests** — Jest/Supertest on the backend (36 tests), Vitest on both frontends (9 + 29 tests).

**Not implemented** (do not claim these anywhere): scheduling by date/time, true fullscreen via the Fullscreen API (the player fills the viewport with CSS, it does not call `requestFullscreen()`), a customer-facing ordering flow.

## Local development

Requires Node 18+ and a local or remote MongoDB instance.

```bash
# Backend
cd backend
cp .env.example .env   # fill in MONGODB_URI and JWT_SECRET at minimum
npm install
npm run seed:admin     # optional, provisions the first manager login
npm run dev             # http://localhost:5000

# Manager Dashboard
cd manager-dashboard
cp .env.example .env
npm install
npm run dev              # http://localhost:5173

# TV Player
cd tv-player
cp .env.example .env
npm install
npm run dev              # http://localhost:5174 (or next free port)
```

Leave `CLOUDINARY_*` blank in your backend `.env` for local dev — uploads are then written to `backend/uploads/` as before. See [DEPLOYMENT.md](./DEPLOYMENT.md) for what changes in production.

## Tests

```bash
cd backend && npm test
cd manager-dashboard && npm test
cd tv-player && npm test
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full production setup (MongoDB Atlas, Render, Vercel, Cloudinary).
