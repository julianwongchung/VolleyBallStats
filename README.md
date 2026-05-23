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
3. Create your first admin user in Supabase Auth using email/password.
4. Copy the new user's UUID from `auth.users`.
5. In the SQL Editor, run this once for the first admin:

```sql
insert into public.admin_users (user_id, email)
values ('AUTH_USER_UUID_HERE', 'admin@example.com');
```

6. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_or_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_for_server_api_routes_only
```

After the first admin can log in, open `/admin-users` in the app to create more admins with only an email and temporary password. The app also lets admins set a new password for another admin. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; never rename it with `NEXT_PUBLIC_` and never commit `.env.local`.

Supabase Auth SSR uses `@supabase/ssr` with browser, server, and proxy clients.

## Vercel Deployment

1. Push this project to GitHub.
2. Import it into Vercel as a Next.js project.
3. Add these environment variables in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

4. Deploy with the default Vercel Next.js settings.

## Mobile Full-Screen App Mode

Mobile Safari and Chrome do not let a normal browser tab hide the URL bar permanently. To use VolleyStats like a full-screen app, install it to the phone home screen:

- iPhone Safari: open the site, tap Share, then choose **Add to Home Screen**.
- Android Chrome: open the site, tap the menu, then choose **Install app** or **Add to Home screen**.

The project includes a web app manifest, mobile web app metadata, icons, and service worker registration so installed launches use standalone app mode.

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
