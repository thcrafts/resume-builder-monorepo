# Frontend workflow

## Purpose

React + Vite SPA with **Tailwind CSS v4** UI for login/register, role-based routing, resume management, candidate profile settings, theme mode (`class="dark"` on `<html>`), and proxied API/socket access to the Nest backend.

## Actors

| Actor | Role |
|-------|------|
| End user / admin | Browser client |
| AuthProvider | JWT in `localStorage` |
| ProtectedLayout | Gate routes; load profile; role redirect |
| NonPrivateLayout | Login/register when unauthenticated |
| AiModelsProvider | Catalog from `GET /api/ai/models` |
| ThemeModeProvider | light/dark via `document.documentElement.classList` |
| Vite + `@tailwindcss/vite` | Styles + proxy `/api` + `/socket.io` → Nest :3001 |

## UI stack

- Tailwind v4 + CSS variables in `src/index.css`
- Primitives under `src/components/ui/` (Button, Input, Textarea, Card, Dialog, Table, etc.)
- Icons: `lucide-react`
- Helper: `cn()` in `src/lib/utils.ts`
- MUI / Emotion are **not** used

## Candidate profile (Settings)

Under `/settings` → **Candidate** section:

- Contacts (one primary with email)
- Professional title, education, certifications, baseline skills
- Companies with required **product** and **mission**
- Prompts tab includes `experiencePrompt`

CreateResume blocks AI generate until `validateCandidateProfile` passes (client + server).

## Generate progress

CreateResume and the resumes list listen for `generate:progress` and show step badges (`title` / `summary` / `skills` / `experience i/n`).

## Key files

| Path | Notes |
|------|--------|
| `apps/frontend/src/main.tsx` | Router + providers + `index.css` |
| `apps/frontend/src/index.css` | Tailwind + design tokens |
| `apps/frontend/src/components/ui/*` | UI primitives |
| `apps/frontend/src/pages/profile/` | Settings + Contacts/Companies editors |
| `apps/frontend/src/pages/resumes/CreateResume.tsx` | Generate + progress |
| `apps/frontend/vite.config.ts` | Tailwind plugin + aliases |

## Routes

| Path | Layout | Role | Page |
|------|--------|------|------|
| `/users` | Protected | admin | Users admin |
| `/resumes` | Protected | user | Resume list |
| `/resumes/new` | Protected | user | Create / generate |
| `/settings` | Protected | user | Profile |
| `/login`, `/register` | NonPrivate | public | Auth forms |

## Socket events consumed

`generate:progress`, `generate:done`, `generate:failed`
