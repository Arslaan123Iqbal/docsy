# AI workflow note

## Tools used

- **Claude Code** (Anthropic's CLI agent, Claude Fable 5) inside VS Code — primary tool for scaffolding, implementation, and test writing.
- No other AI tools; no copilot-style autocomplete.

## Where AI materially sped things up

- **Scaffolding and boilerplate** — Next.js app setup, Prisma schema, route handler skeletons, Tailwind UI. This is where the bulk of the time saving came from; probably 2–3× on the CRUD/API layer.
- **API-version churn** — TipTap 3 changed several v2 idioms (`Placeholder` moved into `@tiptap/extensions`, toolbar state needs `useEditorState` because editors no longer re-render per transaction, SSR needs `immediatelyRender: false`, server-side HTML→JSON needs the `@tiptap/html/server` entry point). The agent verified each against the installed packages with small runnable probes instead of trusting its training data.
- **Verification tooling** — a Playwright browser script that exercises the full user journey (login → create → format via toolbar → autosave → share → second user sees read-only → reload persists) and captures screenshots. I would not have budgeted time to hand-write this in a 6-hour exercise; having it caught real issues cheaply.

## AI output I changed or rejected

- **Prisma 7 was rejected.** The initial install pulled Prisma 7, whose new config model (`prisma.config.ts`, driver adapters, no `url` in the schema) failed immediately. Rather than absorb an unfamiliar migration mid-timebox, I pinned Prisma 6 — the well-understood pattern. Deliberate boring-technology call.
- **Client-side data fetching was rewritten.** The first dashboard/share-dialog implementation fetched data in `useEffect`; the React Compiler lint rule (`set-state-in-effect`) flagged it. Instead of suppressing the rule, the dashboard became a server component that passes initial data down, and the share dialog now receives its data fetched on button-click. Better architecture than the first draft, prompted by tooling rather than taste.
- **Hydration warning triaged, not patched.** A hydration mismatch appeared only in the Playwright environment: headless Chromium's autofill injects `caret-color: transparent` into the login input. Root-caused it to the test environment rather than "fixing" app code that wasn't broken — the important part of using AI here was demanding the *actual* diff from React's error rather than accepting a guess.
- Small rejections throughout: an over-broad Playwright selector that matched two Share buttons (test bug, not app bug — fixed the selector, not the app), seed-script idempotency, 404-over-403 for unauthorized document access.

## How correctness, UX and reliability were verified

- **Unit level**: 25 vitest tests over the pure logic — full permission matrix, session-token tampering/expiry, import conversion including a real `.docx` fixture and an HTML-injection case.
- **API level**: a curl matrix against the running server covering every route's happy path *and* every rejection path (bad password, unauthenticated, viewer-tries-to-edit 403, non-owner rename 403, unknown share target 404, unsupported file type, oversized file, missing file).
- **Browser level**: the Playwright journey above, run headless with console/page-error capture, plus screenshot review of every screen.
- **Static level**: `next build` (strict TypeScript) and ESLint (including React Compiler rules) both clean.

The judgment calls — scope cuts, storage format, auth design, 404-vs-403, what to test — were made by me and are argued in `ARCHITECTURE.md`; the AI was leverage for execution and verification, not for deciding what to build.
