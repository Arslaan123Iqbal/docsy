# Architecture note

## What I prioritized, and why

With a 4–6 hour timebox the goal was a **complete, verifiable product slice** — every listed core capability working end to end — rather than depth in any single one. The three areas I chose to do properly rather than minimally:

1. **Access control.** Sharing is the most judgment-revealing requirement. Role resolution is a pure function (`lib/access.ts`) used by every document route, with an explicit matrix: owners manage (rename/delete/share), editors write content, viewers read. It is enforced **server-side on every request**, not just hidden in the UI, and non-accessible documents return 404 (not 403) so document IDs don't leak existence.
2. **Editing experience.** TipTap over a hand-rolled `contentEditable`: battle-tested ProseMirror model, JSON serialization that survives round-trips, and a realistic upgrade path to collaborative editing (Yjs). Autosave debounces 800 ms after the last keystroke with a visible Saved/Saving/Error indicator; titles rename inline; viewers get the same renderer in read-only mode rather than a separate view.
3. **Import correctness.** Uploads convert to sanitized HTML server-side (plain text is HTML-escaped — user files can't inject markup), then to ProseMirror JSON via TipTap's schema, so imported documents are immediately editable with formatting intact, and stored content is always one canonical format.

## System shape

```
Browser (React 19, TipTap editor, Tailwind)
   │  fetch JSON / multipart
Next.js App Router
   ├── Server components: session check + first-paint data (dashboard)
   ├── Route handlers: /api/auth/*, /api/documents*, /api/import
   │     └── zod validation → access check → Prisma
   └── lib/: access.ts, token.ts, import.ts (pure, unit-tested)
             session.ts, db.ts, documents.ts (I/O)
PostgreSQL (User, Document, Share)
```

**Why one Next.js app** instead of separate frontend/backend: one deployable, one type system across the stack, server components remove a class of loading-state code, and route handlers are sufficient for a CRUD + upload API. A separate backend buys nothing at this scale.

**Data model.** `User`, `Document` (owner FK, `content Json`), `Share` (`@@unique(documentId, userId)`, role enum `VIEWER|EDITOR`). Share upsert means re-sharing with a different role updates rather than duplicates. Cascading deletes keep shares consistent when documents or users go away.

**Content storage.** ProseMirror JSON in a `jsonb` column — the editor's native format, no lossy HTML↔model conversion on every save, and queryable if features ever need it. The tradeoff (opaque to plain SQL readers) is acceptable for a document product.

**Auth.** Deliberately minimal but honest: bcrypt password hashes, HMAC-SHA256-signed session cookie (`userId.expiry.signature`, constant-time comparison, httpOnly/SameSite=Lax). No JWT library or auth framework — the exercise allows mocked auth; this is little code, testable, and shows the mechanics. First thing I'd replace with a proper auth provider in a real product.

**Saving model.** Debounced full-document PATCH, last-write-wins. Concurrent editing of the same document will overwrite — a known, stated limitation (see below).

## Engineering quality

- **Validation**: zod on every mutating route; uniform error envelope (`{ error }`) via a `withErrorHandling` wrapper that maps `HttpError`/`ZodError`/unexpected to 4xx/500.
- **Tests**: 25 vitest unit tests target the logic where bugs are costly: the full permission matrix, token tamper/expiry cases, import conversion including a real `.docx` fixture and the HTML-injection case.
- **E2E verification**: the full flow (login → create → format → autosave → share → viewer sees read-only → reload persists) was verified in a real browser via a Playwright script during development, plus a curl matrix over the API including every 401/403/404 path.

## What I deprioritized (and would do next with 2–4 more hours)

1. **Real-time collaboration** (~biggest cut). The path is well-defined: TipTap ships Yjs bindings (`@tiptap/extension-collaboration`); add a WebSocket provider (Hocuspocus) and store Yjs updates instead of JSON snapshots. Cut because it roughly doubles infrastructure (stateful WS server doesn't fit Vercel functions) for one bullet of the brief. The JSON-snapshot model was chosen knowing Yjs is the upgrade path.
2. **Version history** — cheap to add on this model (append a `DocumentRevision` row per save with pruning) and the natural safety net for last-write-wins.
3. **Presence indicators** ("Grace is viewing") — polling endpoint would fit the current stack; cut as cosmetic without real-time editing.
4. **Registration + share-by-invite** for unknown emails; today sharing requires an existing account.
5. **Optimistic-locking guard** — send `updatedAt` with each PATCH, 409 on mismatch, "document changed elsewhere" banner. First hour of any follow-up work, since it converts silent data loss into a visible conflict.
