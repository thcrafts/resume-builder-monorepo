# API reference

Base URL: `http://localhost:3001/api` (global prefix `api`).  
Auth header for protected routes: `Authorization: Bearer <access_token>`.

> **Removed:** `POST /api/resumes` (generic create) — use `POST /api/resumes/generate` or `POST /api/resumes/from-json`.

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api` | Public | `{ status: 'ok' }` |

## Auth (2)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| `POST` | `/api/auth/register` | Public | `{ email, name, password }` | `{ user, access_token }` |
| `POST` | `/api/auth/login` | Public | `{ email, password }` | `{ user, access_token }` |

## Users (9)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/users/profile` | JWT | Current user (public shape) |
| `PUT` | `/api/users/profile` | JWT | Update profile / settings / key |
| `POST` | `/api/users/profile/reveal-api-keys` | JWT | Body `{ currentPassword }` → decrypted key |
| `GET` | `/api/users/profile/openrouter-usage` | JWT | OpenRouter usage for stored key |
| `GET` | `/api/users` | JWT + Admin | List users |
| `GET` | `/api/users/:id` | JWT + Admin | Get user |
| `POST` | `/api/users` | JWT + Admin | Create user |
| `PUT` | `/api/users/:id` | JWT + Admin | Update user |
| `DELETE` | `/api/users/:id` | JWT + Admin | Delete user |

## Resumes (13)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/resumes` | JWT | List resumes; query: `companyName`, `roleType`, `startDate`, `endDate` |
| `GET` | `/api/resumes/templates/:template/preview` | JWT | Sample template PDF |
| `POST` | `/api/resumes/generate` | JWT | SSE: `{ type:'started', resumeId }` then background AI |
| `POST` | `/api/resumes/from-json` | JWT | Manual resume; returns PDF |
| `POST` | `/api/resumes/answer-questions` | JWT | Body `{ resumeId, questions }` |
| `GET` | `/api/resumes/:id` | JWT | Get resume |
| `GET` | `/api/resumes/:id/download` | JWT | Resume PDF |
| `GET` | `/api/resumes/:id/download-json` | JWT | Resume JSON file |
| `POST` | `/api/resumes/:id/retry` | JWT | Restart failed AI generation |
| `POST` | `/api/resumes/:id/generate-cover-letter` | JWT | Cover letter PDF |
| `GET` | `/api/resumes/:id/download-cover-letter` | JWT | Download cover letter PDF |
| `DELETE` | `/api/resumes/bulk/delete` | JWT | Body `{ ids: string[] }` |
| `DELETE` | `/api/resumes/:id` | JWT | Delete resume |

### Generate body

```json
{
  "companyName": "string",
  "roleType": "string",
  "jobDescription": "string",
  "industry": "string",
  "aiModel": "string",
  "aiVersion": "string"
}
```

SSE error shape: `data: {"type":"error","message":"..."}`.

### From-json body

```json
{
  "companyName": "string",
  "roleType": "string",
  "jobDescription": "string",
  "aiModel": "string",
  "aiVersion": "string",
  "jsonContent": "<JSON string>"
}
```

## AI (1)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/ai/models` | JWT | `{ providers, defaults }` model catalog |

## Route count

| Area | Count |
|------|------:|
| Health | 1 |
| Auth | 2 |
| Users | 9 |
| Resumes | 13 |
| AI | 1 |
| **REST total** | **26** |

## WebSocket (Socket.IO)

Connect to the Nest origin (via Vite proxy `/socket.io` in local dev). CORS follows `FRONTEND_URL` / credentials (same as HTTP).

| Direction | Event | Payload | When |
|-----------|-------|---------|------|
| Server → clients | `generate:done` | `{ id: string }` | AI resume completed |
| Server → clients | `generate:failed` | `{ id: string, message?: string }` | AI resume failed |

Emitted from `ResumesGateway` (`apps/backend/src/resumes/resumes.gateway.ts`). Frontend client: `apps/frontend/src/pages/resumes/socket.tsx`.
