# Project Topi

Welfare management system for tracking aid provided to campus support staff ("Lalas").
Next.js 16 (App Router) · TypeScript · Tailwind CSS v3 · Supabase (Postgres) · `xlsx` · `lucide-react`.

## How access control works

There's no Supabase Auth / OAuth — just a single shared password (`ADMIN_PASSWORD`,
defaults to `ahmadshah`). Unlike a purely client-side check, this is enforced by
`middleware.ts` on the server: on a correct password, `/api/auth/login` sets an
httpOnly cookie containing a SHA-256 digest of the password, and middleware verifies
that digest on every request before anything reaches a page or API route. Changing
`ADMIN_PASSWORD` instantly invalidates every existing session.

The browser is never given a Supabase key. Every database call happens inside a
Next.js API route using the `service_role` key (server-only, via `lib/supabase/admin.ts`).
That's why Row Level Security is disabled in `supabase/schema.sql` — the app's own
security boundary is the password gate + server-only key, not RLS.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in your real Supabase values
npm run dev
```

Visit `http://localhost:3000`, unlock with your `ADMIN_PASSWORD`.

## Project structure

```
app/                     Next.js App Router
  api/                    All server routes (see below)
  login/page.tsx           Lock screen route
  page.tsx                 Main dashboard (SSR-fetches initial data)
  layout.tsx                Fonts, metadata, toast provider
  globals.css                Black/orange theme
components/               All UI, client components
lib/                       Business logic, shared by API routes
  supabase/admin.ts          Server-only Supabase client (service_role)
  session.ts                  Password / cookie session helper
  excel.ts                     Client-side spreadsheet parsing
  normalize.ts                  CNIC / phone normalization for duplicate matching
  history.ts                     Audit-log helpers
  types.ts                        Shared TypeScript types
middleware.ts             Password-gate enforcement for every route
supabase/schema.sql       Full DB schema — run once in Supabase SQL Editor
```

## API routes

| Route                        | Method | Purpose                                              |
| ----------------------------- | ------ | ----------------------------------------------------- |
| `/api/auth/login`             | POST   | Check password, set session cookie                    |
| `/api/auth/logout`            | POST   | Clear session cookie                                   |
| `/api/lalas`                  | GET    | Active (non-deleted) list                              |
| `/api/lalas/[id]`              | PATCH  | Edit a Lala, logs a history row per changed field       |
| `/api/lalas/[id]`              | DELETE | Soft-delete (moves to trash), logs history               |
| `/api/upload`                 | POST   | Parsed rows in → dedupes within file, checks DB, inserts clean rows, returns conflicts |
| `/api/upload/resolve`         | POST   | Applies Overwrite / Keep Original / Merge for one conflict |
| `/api/history?type=create\|update` | GET | Added Stuff / Track Records tabs                     |
| `/api/trash`                  | GET    | Deleted Stuff tab                                       |
| `/api/trash/[id]`              | POST   | Restore from trash                                       |
| `/api/trash/[id]`              | DELETE | Permanently delete                                        |
| `/api/keep-alive`             | GET    | Cheap read query — ping this daily to keep the free Supabase tier active |

## Known, deliberate limitations

- **Excel leading zeros**: if a source spreadsheet has phone/CNIC columns formatted
  as plain numbers (not Text), Excel itself strips leading zeros before this app
  ever sees the file. Format those columns as Text at the source if this matters.
- **Phone matching**: duplicate detection strips non-alphanumeric characters before
  comparing, so `0300-1234567` and `0300 1234567` match, but it doesn't do full
  international phone parsing (e.g. `+92 300 1234567` vs `0300 1234567` won't match).
- **`xlsx` advisory**: `npm audit` flags a known ReDoS/prototype-pollution advisory
  in the `xlsx` package with no patched release currently on the public npm registry.
  Risk is limited here since parsing happens client-side, in the browser of an
  already-authenticated admin — not on untrusted public input.
