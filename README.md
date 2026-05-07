# VolleyStats

Mobile-first volleyball statistics recorder built with Next.js, Supabase, and Vercel.

## Features

- Guest read-only mode for Home, Teams, Players, and Statistics.
- Admin login with Supabase Auth.
- Admin-only Match page, CRUD forms, archive actions, delete confirmations, and stat entry.
- Many-to-many player/team assignments.
- Supabase Storage uploads for team logos and optional player photos.
- Local seeded fallback when Supabase environment variables are not configured.

## Local Setup

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

If `.env.local` is missing, the app uses local seeded demo data. Visit `/login` and use **Use demo admin** to try admin workflows.

## Supabase Setup

1. Create a Supabase project on the Free Plan.
2. Open the SQL Editor and run `supabase/schema.sql`.
3. Create an admin user in Supabase Auth using email/password.
4. Copy the new user's UUID from `auth.users`.
5. In the SQL Editor, run:

```sql
insert into public.admin_users (user_id, email)
values ('AUTH_USER_UUID_HERE', 'admin@example.com');
```

6. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_or_anon_key
```

Supabase Auth SSR uses `@supabase/ssr` with browser, server, and proxy clients.

## Vercel Deployment

1. Push this project to GitHub.
2. Import it into Vercel as a Next.js project.
3. Add these environment variables in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

4. Deploy with the default Vercel Next.js settings.

## Database Tables

- `teams`
- `players`
- `player_teams`
- `matches`
- `match_stats`
- `admin_users`

All public app tables have RLS enabled. Guests can select volleyball data, while only admins listed in `admin_users` can write.

## Storage Buckets

- `team-logos`
- `player-photos`

Both buckets are public-read so guests can see uploaded images. Upload, update, and delete operations are admin-only through storage policies.
