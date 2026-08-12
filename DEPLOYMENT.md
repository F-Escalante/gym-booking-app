Deployment checklist — Supabase + Next.js (gym-booking-app)

1) RLS and admin setup (Supabase SQL editor)
- Create `admins` table and insert admin user_id (use your auth user id):

```sql
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id)
);

insert into public.admins (user_id) values ('<YOUR_USER_ID>') on conflict do nothing;
```

- Enable RLS and add policies for `classes` and `reservations` (example):

```sql
alter table public.classes enable row level security;

create policy "Allow select" on public.classes
  for select
  using (true);

create policy "Admins can modify classes" on public.classes
  for all
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

alter table public.reservations enable row level security;

create policy "Insert reservation for authenticated" on public.reservations
  for insert
  to authenticated
  with check (auth.uid() = new.user_id);

create policy "Delete own reservation" on public.reservations
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Update own reservation" on public.reservations
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = new.user_id);
```

2) Environment variables (Vercel / production)
- Public (client-side):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_APP_URL` (your production URL)

- Server-only (do NOT expose to client):
  - `SUPABASE_SERVICE_ROLE_KEY` (use only in server code / API routes)

  - `ADMIN_API_SECRET` (a server-only secret used to authenticate requests to internal admin API routes)

3) Implementing server-side admin actions (recommended)
- Create Next.js API routes under `app/api/...` (or `pages/api`) that perform admin mutations using `SUPABASE_SERVICE_ROLE_KEY` from server env vars.
- Never call service-role-backed endpoints directly from client; instead protect them with your own auth checks or require admin cookies.

4) Testing on production
- Deploy to Vercel with the env vars set.
- Test signup/login flows and admin flows while logged in as the admin user_id added to `public.admins`.
- Use the browser DevTools console to run `supabase.auth.getSession()` and confirm `session.user.id` matches the admin id.

5) Cleanup and security
- Remove `SUPABASE_SERVICE_ROLE_KEY` from local files before committing if accidentally added.
- Periodically review `public.admins` and rotate service role keys if necessary.

If you want, I can:
- Add a minimal server API endpoint in this repo that exposes safe admin actions (create/update/delete classes) using the service role.
- Or clean/remove `scripts/reproduce_supabase.js` after you finish testing.

### Admin API routes

- A protected admin API is available at `/api/admin/classes` with `POST` (create), `PUT` (update) and `DELETE?id=<id>` (delete).
- Protect requests by including the header `x-admin-secret: <ADMIN_API_SECRET>`.

Example curl creating a class:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_API_SECRET" \
  -d '{"title":"Clase demo","description":"desc","class_date":"2026-08-20T10:00:00Z","capacity":10}' \
  https://your-app-url/api/admin/classes
```
