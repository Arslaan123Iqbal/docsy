# Submission — Docsy

Candidate: Arslan Iqbal (arslaniqbalmgt@gmail.com)

## What's included

| Item | Where |
|------|-------|
| Source code | this folder (`docsy/`) |
| Local setup & run instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| Walkthrough video URL | `VIDEO_URL.txt` |
| Screenshots | `screenshots/` |
| Live deployment | **TODO: paste Vercel URL here** |

## Live demo & test accounts

- **URL:** _TODO: paste after deploy_
- Password for all demo accounts: `demo1234`
  - `ada@demo.docsy.app` (owns the seeded "Welcome to Docsy" doc)
  - `grace@demo.docsy.app` (has the seeded doc shared with her)
  - `alan@demo.docsy.app` (empty account, useful as a sharing target)
- The login page has one-click sign-in buttons for all three.

**Suggested review path (2 minutes):** sign in as Ada → open "Welcome to Docsy" → format some text (bold/heading/list) → watch the Saved indicator → Share → add `alan@demo.docsy.app` as *Can view* → sign in as Alan in a private window → the doc appears under *Shared with you*, opens read-only. Then try *Import file* with any `.md` or `.docx`.

## Status

### Working end to end
- Create / rename / edit / delete documents, with autosave and reload persistence
- Rich text: bold, italic, underline, strikethrough, H1–H3, bulleted + numbered lists, undo/redo
- File import: `.txt`, `.md`, `.docx` (max 2 MB) → new editable document, formatting preserved
- Sharing with per-user role (Can edit / Can view), owned-vs-shared separation, server-enforced permissions
- Login/logout with seeded users; 25 passing unit tests (`npm test`)

### Not included (deliberate cuts, detailed in ARCHITECTURE.md)
- Real-time co-editing (saves are last-write-wins)
- Self-serve registration; version history; comments; export

### Next 2–4 hours, in order
1. Optimistic-locking conflict guard on saves (409 + banner)
2. Document version history (revision row per save)
3. Yjs/Hocuspocus real-time editing groundwork
