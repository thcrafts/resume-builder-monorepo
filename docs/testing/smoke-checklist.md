# Smoke test checklist

Manual checks after local setup (`npm run dev`, MongoDB up, backend **:3001**, frontend **:5173**).

## Prerequisites

- [ ] `apps/backend/.env` has `DATABASE_URL`, `ENCRYPTION_KEY`, `PORT=3001`
- [ ] `npm install` completed at repo root
- [ ] Vite log shows proxy to Nest (`/api` and `/socket.io`)
- [ ] `GET http://localhost:3001/api` returns `{ "status": "ok" }`

## Auth

- [ ] Register new user → lands authenticated; token in `localStorage` (`access_token`)
- [ ] Logout / clear token → `/resumes` redirects to `/login`
- [ ] Login with wrong password → error, no token
- [ ] Login with correct credentials → JWT issued; profile loads
- [ ] Duplicate register email → conflict / error message
- [ ] Register password &lt; 6 chars → validation error

## Session expiry / guards

- [ ] Invalid Bearer token → API `401`; UI clears session
- [ ] Admin-only `/users` as normal user → redirect to `/resumes`
- [ ] User routes as admin → redirect to `/users`

## Profile / users

- [ ] Open `/settings` → load profile
- [ ] Save name + template → persists after refresh
- [ ] Save resume prompt (`instructions`) → persists
- [ ] Set OpenRouter API key → `hasOpenrouterApiKey` true; key not returned in profile GET
- [ ] Reveal API key with wrong password → error
- [ ] Reveal API key with correct password → key shown
- [ ] OpenRouter usage endpoint works with key configured
- [ ] Clear API key → generation blocked with missing-key message
- [ ] (Admin) List / create / edit / delete user on `/users`

## AI models

- [ ] `GET /api/ai/models` (authenticated) returns providers + defaults
- [ ] Profile / create-resume model selectors populate from catalog

## Resume generate (SSE + socket)

- [ ] Without API key → generate shows error (SSE `type:error` or toast)
- [ ] Without default prompt and industry `default` → failure / clear message
- [ ] With key + prompt: submit generate → receive `resumeId`, redirect/list shows `in_progress`
- [ ] On success → socket `generate:done`; status `completed`; JSON present
- [ ] On OpenRouter failure → socket `generate:failed`; status `failed` + message
- [ ] Download PDF → valid PDF named from user
- [ ] Download JSON → valid JSON file

## From JSON

- [ ] `/resumes/new?fromJson=1` (or `/fromjson` redirect) accepts valid JSON
- [ ] Returns PDF download; resume appears with `generationSource` manual / completed
- [ ] Invalid JSON string → validation error

## Retry / filters / delete

- [ ] Retry button only succeeds on failed AI resumes
- [ ] Retry on completed or manual → rejected
- [ ] Filter by company / role / date range narrows list
- [ ] Delete one resume → removed
- [ ] Bulk delete → selected ids removed

## Q&A

- [ ] Answer questions on completed resume with job description → answers appended
- [ ] Empty / unusable questions text → error

## Cover letter & templates

- [ ] Generate cover letter → PDF download; text stored on resume
- [ ] Second generate uses stored text (no unnecessary AI if already present)
- [ ] Download cover letter for resume that has one
- [ ] Template preview PDF for `template1`…`template7`
- [ ] Change profile template → new downloads use new layout

## Frontend chrome

- [ ] Theme light/dark toggle persists (`theme-mode`)
- [ ] Toasts appear on success/error
- [ ] Hard refresh on `/resumes` stays logged in with valid token

## Proxy / ports

- [ ] Frontend calls succeed **without** `VITE_API_BASE_URL` (proxy path)
- [ ] Socket updates work without `VITE_SOCKET_URL` (same-origin proxy)
- [ ] Backend listens on **3001**, not 3000
