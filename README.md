# Apadore Bookmarks

A private, invite-only inspiration archive for the Apadore team. Editorial-grid UI inspired by [Leibal](https://leibal.com).

## Stack

- **Next.js 15** App Router + TypeScript + Tailwind CSS
- **Supabase** (Postgres, Auth, Storage, RLS)
- **Cloudflare Workers** for hosting (via `@opennextjs/cloudflare`)
- Helvetica Neue (system) typography
- Navy `#0A0A5C` on cream `#F6F5EE` palette

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Visit `http://localhost:3000`.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
INVITE_CODE=...
```

The Supabase keys live in **Project Settings → API**. `INVITE_CODE` is whatever shared secret you want the team to use during signup.

## Database setup

Run the SQL files in `supabase/migrations/` in order, in the Supabase SQL editor:

1. `0001_init.sql` — schema, RLS policies, storage bucket
2. `0002_add_video.sql` — `video_url` column on `pins`

## Deploy (Cloudflare Workers)

```bash
npm run preview   # local Workers preview against the OpenNext build
npm run deploy    # deploys to Cloudflare via wrangler
```

Or hook the GitHub repo up via the Cloudflare dashboard → **Workers & Pages → Create → Connect to Git** for automatic deploys on push to `main`.

Env vars also need to be configured in Cloudflare:
- Workers & Pages → your project → **Settings → Variables and Secrets**
- Add: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INVITE_CODE`

## Features

- **Auth** — Email/password sign-in, invite-code-gated sign-up, account page with delete
- **Add a pin** — paste a URL to auto-fetch OG image/title, or upload your own image
- **Browse** — full-bleed editorial grid; cards adapt to image aspect (wide, tall, square)
- **Open original** — small `↗` button at the top-right of every card jumps straight to the source site
- **Pin detail** — minimal page with media (poster + hover video), description, tags, source link
- **Edit / delete** — pin owners can edit and delete from `/pin/[id]/edit`

## Project structure

```
app/                   # routes
  page.tsx             # main grid
  login/               # auth
  new/                 # add a pin
  pin/[id]/            # detail page
  pin/[id]/edit/       # edit + delete
  account/             # settings + account deletion
components/            # PinGrid, PinCard, TopNav
lib/                   # types, supabase clients, OG fetch, sizing helpers
supabase/migrations/   # schema + RLS
```
