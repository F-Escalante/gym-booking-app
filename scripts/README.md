reproduce_supabase.js — usage and safety

Purpose
- Quick script to exercise Supabase read/insert/update/delete for local testing.

Security
- The script can use a Service Role key to bypass RLS; NEVER commit or expose the Service Role key.
- Add the key to your local `.env.local` as `SUPABASE_SERVICE_ROLE_KEY` when you need server-side testing.

Usage
- With ANON (default): the script runs with your `NEXT_PUBLIC_SUPABASE_ANON_KEY` and behaves like an unauthenticated client.

  ```bash
  node scripts/reproduce_supabase.js
  ```

- With Service Role (server-mode): set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and then run the same command; the script will detect and use the service role.

Notes
- The script is only a dev helper. Remove the `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` before pushing or deploying.
- If you need a permanent server-side admin route, implement a Next.js API route that uses the service role from server env vars (not client).
