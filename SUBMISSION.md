# Submission — Docsy: a lightweight collaborative document editor

**Candidate:** Arslan Iqbal — arslaniqbalmgt@gmail.com
**Role:** AI-Native Full Stack Product Engineer, Ajaia LLC

---

## Links

| What | Where |
|------|-------|
| **Source code** | https://github.com/Arslaan123Iqbal/docsy |
| **Live deployment** | _TODO: paste Vercel URL_ |
| **Walkthrough video (3–5 min)** | _TODO: paste unlisted Loom/YouTube link (also in `VIDEO_URL.txt`)_ |
| Local setup instructions | `README.md` (also summarised below) |
| Architecture note | `ARCHITECTURE.md` (also summarised below) |
| AI workflow note | `AI_WORKFLOW.md` (also summarised below) |
| Screenshots | `screenshots/` (6 PNGs covering every screen) |

Everything a reviewer needs is in this one file; the separate Markdown documents
exist as the individually requested deliverables and go into more depth.

---

## TL;DR for a reviewer in a hurry

Docsy is a Google-Docs-inspired editor built inside the 4–6 hour timebox. Every
core capability in the brief works end to end on the live deployment:

- **Create / rename / edit / save / reopen** rich-text documents, with debounced
  autosave and a visible Saved / Saving / Error indicator.
- **Rich text**: bold, italic, underline, strikethrough, H1–H3 headings,
  bulleted and numbered lists, undo/redo — TipTap (ProseMirror) under the hood.
- **File upload**: import `.txt`, `.md`, or `.docx` (max 2 MB — limits stated in
  the UI) and it becomes a new fully editable document with formatting preserved.
- **Sharing**: share by email with **Can edit** or **Can view** roles; dashboards
  separate *Owned by you* from *Shared with you*; viewers get a read-only
  editor; permissions are enforced server-side on every request.
- **Persistence**: Postgres via Prisma; documents, formatting and shares
  survive refresh and re-login.
- **Quality**: 25 passing unit tests, zod validation on every mutating route,
  uniform error handling, strict TypeScript, clean ESLint (React Compiler rules).

### The 2-minute review path

1. Open the live URL. Password for all demo accounts: **`demo1234`**.
2. One-click **Sign in as Ada Lovelace** on the login page.
3. Open the seeded **"Welcome to Docsy"** document. Type; watch the *Saving →
   Saved* indicator. Apply bold / heading / list from the toolbar.
4. Press **Share** → add `alan@demo.docsy.app` as **Can view**.
5. Open a private/incognito window → sign in as **Alan Turing** → the document
   appears under *Shared with you* marked **View only** → open it: the editor
   is read-only, with no toolbar.
6. Back as Ada: **Import file** → pick any `.md` or `.docx` → it opens as a new
   editable document.
7. Refresh anything — everything persists.

---

## Demo accounts

Password for all three: **`demo1234`** (one-click buttons on the login page)

| User | Email | Seeded state |
|------|-------|--------------|
| Ada Lovelace | `ada@demo.docsy.app` | Owns "Welcome to Docsy" |
| Grace Hopper | `grace@demo.docsy.app` | Has that document shared with her (editor) |
| Alan Turing | `alan@demo.docsy.app` | Empty — useful as a sharing target |

---

## What was built, task by task

### 1. Document creation and editing — complete

- Create from the dashboard (**+ New document**) → lands directly in the editor.
- Inline rename in the editor header (owner only — enforced in the API, and the
  input is disabled with an explanatory tooltip for non-owners).
- Rich-text editing via TipTap 3 with a custom toolbar: **bold, italic,
  underline, strikethrough, H1, H2, H3, bulleted list, numbered list, undo,
  redo**. Keyboard shortcuts (⌘B/⌘I/⌘U, ⌘Z) work via ProseMirror defaults.
  Toolbar buttons reflect the current selection state (active/pressed styling)
  using TipTap v3's `useEditorState` selector API.
- Autosave: 800 ms debounce after the last keystroke, full-document PATCH,
  save-state indicator (Loading / Saving / Saved / Save failed / Read-only).
- Documents reopen from the dashboard with all formatting intact (content is
  stored as ProseMirror JSON — the editor's canonical format).
- Delete (owner only) with a confirmation prompt.

### 2. File upload — complete

- **Import file** on the dashboard accepts `.txt`, `.md`, `.docx` (stated in
  the UI, max 2 MB) and turns the upload into a new editable document titled
  after the filename.
- Conversion happens server-side: plain text is HTML-escaped (uploaded files
  cannot inject markup) and split into paragraphs; Markdown is converted with
  `marked`; `.docx` is converted with `mammoth`. The resulting HTML is parsed
  into ProseMirror JSON through TipTap's own schema (`@tiptap/html/server`), so
  imported content is immediately editable and identical in storage format to
  hand-written content.
- Unsupported types, oversized files, and missing files are all rejected with
  specific, human-readable error messages surfaced in the UI.

### 3. Sharing — complete

- Every document has an **owner** (creator). Owners see a **Share** button in
  the editor which opens a dialog: add a person by email with a role of
  **Can edit** or **Can view**; see everyone with access; change a person's
  role (sharing again with the same email updates it — upsert); revoke access.
- The dashboard separates **Owned by you** from **Shared with you**; shared
  documents show the owner's name and a role badge (*Can edit* / *View only*).
- Roles are enforced **server-side on every request** — the permission matrix:

| Action | Owner | Editor | Viewer | No access |
|---------------------|:-----:|:------:|:------:|:---------:|
| See in list / open | ✅ | ✅ | ✅ | ❌ (404) |
| Edit content | ✅ | ✅ | ❌ (403) | ❌ (404) |
| Rename | ✅ | ❌ (403) | ❌ (403) | ❌ (404) |
| Delete | ✅ | ❌ (403) | ❌ (403) | ❌ (404) |
| Share / revoke | ✅ | ❌ (403) | ❌ (403) | ❌ (404) |

- Documents a user cannot see return **404, not 403**, so IDs don't leak the
  existence of other people's documents.
- Viewers get the same document renderer in read-only mode (no toolbar, no
  editable cursor) rather than a degraded separate view.

### 4. Persistence — complete

- PostgreSQL via Prisma. Three tables: `User`, `Document`, `Share`
  (unique `(documentId, userId)`, role enum, cascading deletes).
- Document content is a `jsonb` column holding ProseMirror JSON — no lossy
  HTML round-trips; formatting survives save/reopen/refresh exactly.
- Sessions survive refresh (30-day signed cookie), so the shared-access
  behaviour is demonstrable across windows and reloads.

### 5. Product & engineering quality — complete

- **Setup:** one-command local DB (`docker compose up -d`), `.env.example`,
  `npx prisma migrate deploy`, `npm run db:seed`, `npm run dev` — full steps in
  `README.md` and below.
- **Deployment:** live on Vercel + Neon Postgres (both free tiers — reviewers
  pay for nothing). `vercel-build` runs migrations automatically on deploy.
- **Validation & errors:** zod schemas on every mutating route; a
  `withErrorHandling` wrapper maps domain errors / validation errors /
  unexpected exceptions to clean JSON (`{ "error": "…" }`) with correct status
  codes; the UI surfaces every failure state it can reach (bad login, failed
  save with retry-on-next-edit, unsupported upload, unknown share target…).
- **Tests:** 25 vitest unit tests — inventory below.
- **Architecture note:** `ARCHITECTURE.md`, summarised below.

---

## Architecture

### System shape

```
Browser (React 19, TipTap 3 editor, Tailwind 4)
   │  fetch JSON / multipart
Next.js 16 App Router (TypeScript, strict)
   ├── Server components   — session check + first-paint data (dashboard)
   ├── API route handlers  — /api/auth/*, /api/documents*, /api/import
   │       zod validation → access check → Prisma
   └── lib/ — access.ts, token.ts, import.ts   (pure logic, unit-tested)
              session.ts, db.ts, documents.ts  (I/O)
PostgreSQL (Neon in production, Docker locally)
```

**Why one Next.js app** rather than separate frontend + backend: one
deployable, one type system across the stack, server components remove a class
of loading-state code, and route handlers are entirely sufficient for a
CRUD + upload API at this scale.

### Data model (Prisma)

```prisma
model User {
  id           String     @id @default(cuid())
  email        String     @unique
  name         String
  passwordHash String
  documents    Document[]
  shares       Share[]
}

model Document {
  id        String   @id @default(cuid())
  title     String   @default("Untitled document")
  content   Json?    // ProseMirror JSON — single canonical content format
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  updatedAt DateTime @updatedAt
  shares    Share[]
}

model Share {
  id         String    @id @default(cuid())
  documentId String
  userId     String
  role       ShareRole @default(EDITOR)  // VIEWER | EDITOR
  @@unique([documentId, userId])         // re-share upserts the role
}
```

### Key decisions and why

1. **Access control as a pure function.** `resolveRole(doc, userId) →
   OWNER | EDITOR | VIEWER | null` plus `canView` / `canEdit` / `canManage`
   predicates live in `lib/access.ts` with no I/O, are exhaustively unit
   tested, and every document route goes through them. One place to read the
   entire security model.
2. **TipTap over hand-rolled `contentEditable`.** Battle-tested ProseMirror
   document model, lossless JSON serialisation, and a realistic upgrade path
   to real-time collaboration (official Yjs bindings) — the storage format was
   chosen knowing that path.
3. **ProseMirror JSON in `jsonb`** as the single content format — imported
   files are converted *into* it server-side rather than stored as a second
   format. No divergence between "imported" and "native" documents.
4. **Minimal, honest auth.** bcrypt password hashes; session cookie is
   `userId.expiry.HMAC-SHA256` verified with constant-time comparison;
   httpOnly, SameSite=Lax, Secure in production. The brief allows mocked auth;
   this is little code, testable, and shows the mechanics. First thing to be
   replaced by a proper auth provider in a real product.
5. **404 over 403** for documents a user cannot access — don't confirm that a
   guessed ID exists.
6. **Last-write-wins saves** (debounced full-document PATCH) — the deliberate
   scope cut that keeps the whole product inside serverless infrastructure.
   Real-time co-editing is the stated upgrade path (see roadmap).

---

## API reference

All responses are JSON. Errors are `{ "error": "<message>" }` with an
appropriate status. All document routes require a session cookie (401 without).

| Method | Path | What it does | Failure cases |
|--------|------|--------------|---------------|
| POST | `/api/auth/login` | `{email, password}` → sets signed session cookie | 400 invalid body, 401 wrong credentials |
| POST | `/api/auth/logout` | clears the session cookie | — |
| GET | `/api/auth/me` | current user | 401 |
| GET | `/api/documents` | `{ owned: [...], shared: [...] }` for the caller | 401 |
| POST | `/api/documents` | create (optional `{title}`) → `{id, title}` (201) | 400, 401 |
| GET | `/api/documents/:id` | document + content + caller's `role` | 401, 404 no access |
| PATCH | `/api/documents/:id` | `{title?}` (owner only) and/or `{content?}` (owner/editor) | 400, 401, 403 role, 404 |
| DELETE | `/api/documents/:id` | delete (owner only) | 401, 403, 404 |
| GET | `/api/documents/:id/shares` | list shares (owner only) | 401, 403, 404 |
| POST | `/api/documents/:id/shares` | `{email, role}` — grant or update (owner only) | 400 self-share, 401, 403, 404 unknown email |
| DELETE | `/api/documents/:id/shares/:shareId` | revoke access (owner only) | 401, 403, 404 |
| POST | `/api/import` | multipart `file` → new document `{id, title}` (201) | 400 type/parse, 401, 413 too large |

---

## Testing and verification

### Automated (`npm test` — 25 tests, all passing)

- **`tests/access.test.ts`** — the full permission matrix: owner/editor/viewer
  resolution, no-access null, owner-wins-over-share edge case, and every
  `canView` / `canEdit` / `canManage` combination including `null`.
- **`tests/token.test.ts`** — session-token round-trip; rejection of tampered
  user ID, tampered expiry, wrong secret, expired token, malformed input.
- **`tests/import.test.ts`** — extension detection (case-insensitive, rejects
  `.docx.zip` traps); plain-text → paragraphs with **HTML-escaping verified
  against a `<script>` injection**; Windows line endings; Markdown headings /
  emphasis / lists; **a real `.docx` fixture** converted via mammoth; size
  limit; unsupported-type messaging.

### Manual / scripted during development

- **API level:** a curl matrix against the running server covering every happy
  path *and* every rejection path listed in the API table above.
- **Browser level:** a Playwright script driving the full journey — login →
  create → rename → format via toolbar (bold/italic/underline/heading/list) →
  autosave indicator → share as viewer → second user sees the doc read-only →
  reload persists — run against both the dev server and the production build.
  The production run finished with **zero console or page errors**.
- **Static:** `next build` with strict TypeScript and ESLint (including React
  Compiler rules) both clean.

---

## Local setup

Prerequisites: Node 20+, Docker.

```bash
git clone https://github.com/Arslaan123Iqbal/docsy && cd docsy
npm install                  # also runs prisma generate
docker compose up -d         # Postgres on localhost:5433
cp .env.example .env         # defaults already match docker-compose
npx prisma migrate deploy    # create tables
npm run db:seed              # demo users + welcome doc
npm run dev                  # http://localhost:3000
```

`npm test` runs the unit suite. No paid services anywhere.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string (docker-compose default in `.env.example`; Neon URL in production) |
| `SESSION_SECRET` | HMAC key for session cookies — generate with `openssl rand -hex 32` in production |

### Deployment (how the live instance was set up)

1. Free Postgres at neon.tech; pooled connection string.
2. Repo imported at vercel.com; `vercel-build` script runs
   `prisma generate && prisma migrate deploy && next build`, so schema
   migrations apply automatically on every deploy.
3. `DATABASE_URL` + `SESSION_SECRET` set as Vercel environment variables.
4. Demo users seeded once with `DATABASE_URL=<neon-url> npm run db:seed`.

---

## Project structure

```
app/
  api/auth/{login,logout,me}/route.ts     auth endpoints
  api/documents/route.ts                  list + create
  api/documents/[id]/route.ts             get / patch / delete with role checks
  api/documents/[id]/shares/...           grant, list, revoke sharing
  api/import/route.ts                     file upload → new document
  page.tsx                                dashboard (server component)
  doc/[id]/page.tsx                       editor page
  login/page.tsx                          login with one-click demo accounts
components/
  Dashboard.tsx  Editor.tsx  ShareDialog.tsx  Header.tsx
lib/
  access.ts      pure role resolution + permission predicates (tested)
  token.ts       pure HMAC session tokens (tested)
  import.ts      file → HTML conversion, limits, escaping (tested)
  session.ts     cookie handling        api.ts   error envelope + guards
  db.ts          Prisma singleton       documents.ts  shared list query
prisma/
  schema.prisma  migrations/  seed.ts
tests/
  access.test.ts  token.test.ts  import.test.ts  fixtures/sample.docx
screenshots/     6 PNGs of every screen
```

---

## AI workflow (summary — full version in AI_WORKFLOW.md)

**Tool:** Claude Code (Anthropic's CLI agent) in VS Code. No other AI tools.

**Where AI materially helped:** scaffolding and the CRUD/API layer (the bulk
of the time saving); navigating TipTap 3's breaking changes from v2 (verified
against the installed packages with small runnable probes rather than trusting
training data); and building the Playwright verification script I wouldn't
have budgeted time to write by hand.

**AI output changed or rejected:**
- **Prisma 7 rejected mid-install** — its new config model failed immediately;
  pinned Prisma 6, the boring well-understood pattern, rather than absorb an
  unfamiliar migration inside the timebox.
- **Client-side fetching rewritten** — the first dashboard implementation
  fetched in `useEffect`; the React Compiler lint flagged it, and instead of
  suppressing the rule the dashboard became a server component passing initial
  data down. Better architecture, prompted by tooling.
- **A hydration warning triaged, not "fixed"** — root cause was headless
  Chromium's autofill injecting a style during tests, not app code. Demanded
  the actual React diff instead of accepting a guessed patch.

**Verification discipline:** every AI-written layer was verified independently
— unit tests for the pure logic, a curl matrix for the API, a real browser run
for the UX, and static checks. Judgment calls (scope cuts, storage format,
auth design, what to test) were mine and are argued in `ARCHITECTURE.md`.

---

## Status: working / not included / next

### Working end to end (verified on the production build)
Everything in the feature sections above — no partial features are being
presented as complete.

### Not included — deliberate scope cuts
- **Real-time co-editing.** Saves are last-write-wins; two people typing in the
  same document simultaneously will overwrite each other. Cut because a
  stateful WebSocket server roughly doubles the infrastructure for one line of
  the brief; the storage format (ProseMirror JSON) was chosen with the Yjs
  upgrade path in mind.
- **Self-serve registration** — users are seeded; sharing targets must exist.
- **Version history, comments, export, transfer-of-ownership** — out of scope.

### With another 2–4 hours, in priority order
1. **Optimistic-locking guard** — send `updatedAt` with each PATCH, return 409
   on mismatch, show a "document changed elsewhere" banner. Converts silent
   last-write-wins data loss into a visible conflict. (~1 hour)
2. **Version history** — a `DocumentRevision` row per save with pruning;
   cheap on this model and the natural safety net for concurrent edits. (~1–2 h)
3. **Real-time groundwork** — TipTap Collaboration extension + hosted Yjs
   provider; presence indicators fall out of it. (~2 h to a first demo)

---

## Screenshots

| File | Shows |
|------|-------|
| `screenshots/01-login.png` | Login with one-click demo accounts |
| `screenshots/02-dashboard.png` | Dashboard: owned docs, import + create actions |
| `screenshots/03-editor.png` | Editor: toolbar, formatted content, Saved indicator |
| `screenshots/04-share-dialog.png` | Share dialog with role selection |
| `screenshots/05-grace-dashboard.png` | Second user: "Shared with you" section |
| `screenshots/06-grace-readonly.png` | Viewer role: read-only editor, no toolbar |
