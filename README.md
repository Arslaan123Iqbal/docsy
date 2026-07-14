# Docsy — lightweight collaborative document editor

A small full-stack app inspired by Google Docs, built as a timeboxed product-engineering exercise. Users create, edit, import and share rich-text documents.

**Live demo:** _see SUBMISSION.md for the deployed URL and test accounts._

## Features

- **Documents** — create, rename (inline, owner-only), edit, delete; autosaved while typing
- **Rich text** — bold, italic, underline, strikethrough, H1–H3 headings, bulleted and numbered lists, undo/redo (TipTap/ProseMirror)
- **File import** — upload a `.txt`, `.md` or `.docx` file (max 2 MB) and it becomes a new editable document with formatting preserved
- **Sharing** — share a document with another user by email as **Can edit** or **Can view**; dashboards separate *Owned by you* from *Shared with you*; viewers get a read-only editor
- **Persistence** — documents, formatting and shares survive refresh (Postgres, content stored as ProseMirror JSON)
- **Auth** — email + password login with three seeded demo accounts, HMAC-signed session cookies

## Demo accounts

Password for all: `demo1234`

| User | Email |
|------|-------|
| Ada Lovelace | `ada@demo.docsy.app` |
| Grace Hopper | `grace@demo.docsy.app` |
| Alan Turing | `alan@demo.docsy.app` |

The login page has one-click buttons for each account. To demo sharing: sign in as Ada, open a document, press **Share**, enter `grace@demo.docsy.app`, then sign in as Grace (e.g. in a private window).

## Stack

- **Next.js 16** (App Router, TypeScript) — frontend + API route handlers in one deployable unit
- **TipTap 3** (ProseMirror) — rich-text editing
- **Prisma 6 + PostgreSQL** — persistence
- **Tailwind CSS 4** — styling
- **Vitest** — unit tests
- Deployed on **Vercel** with **Neon** serverless Postgres

## Local setup

Prerequisites: Node 20+, Docker (for local Postgres).

```bash
# 1. Install dependencies (also runs prisma generate)
npm install

# 2. Start Postgres (localhost:5433, credentials in docker-compose.yml)
docker compose up -d

# 3. Configure environment — defaults already match docker-compose
cp .env.example .env

# 4. Create tables and seed demo users + a sample document
npx prisma migrate deploy
npm run db:seed

# 5. Run
npm run dev
```

Open http://localhost:3000 and sign in with a demo account.

### Tests

```bash
npm test
```

25 unit tests cover the access-control matrix (owner/editor/viewer/no-access × view/edit/manage), session-token signing/tampering/expiry, and the file-import pipeline (extension detection, HTML escaping of plain text, Markdown conversion, a real `.docx` fixture, size limits).

## File upload constraints

Supported types: `.txt`, `.md`, `.docx` (stated in the UI). Max size: 2 MB. Anything else is rejected with a clear error. Uploaded files are converted to editor content server-side; plain text is HTML-escaped before conversion.

## Deploying (Vercel + Neon)

1. Create a free Postgres database at [neon.tech](https://neon.tech); copy the pooled connection string.
2. Import the repo at [vercel.com](https://vercel.com/new). The `vercel-build` script runs `prisma migrate deploy` automatically.
3. Set environment variables: `DATABASE_URL` (Neon URL) and `SESSION_SECRET` (`openssl rand -hex 32`).
4. Deploy, then seed demo users once from your machine:
   ```bash
   DATABASE_URL="<neon-url>" npm run db:seed
   ```

## Known limitations (deliberate scope cuts)

- **No real-time co-editing** — saves are last-write-wins; two people editing the same paragraph simultaneously will overwrite each other. See `ARCHITECTURE.md` for what real-time would take.
- **No self-serve registration** — users are seeded; sharing targets must be existing users.
- Renaming and deleting are owner-only by design; there is no transfer-of-ownership.
- No document version history, comments, or export.
# docsy
