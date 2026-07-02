# Resume Builder

Monorepo for the AI resume tailor application.

## Structure

```
resume-builder/
├── apps/
│   ├── backend/    # NestJS API (MongoDB, OpenRouter)
│   └── frontend/   # React + Vite UI
├── package.json    # Workspace root
└── README.md
```

## Prerequisites

- Node.js 18+
- MongoDB
- OpenRouter API key (required)

## Setup

1. Install dependencies from the repo root:

```bash
npm install
```

2. Configure the backend environment in `apps/backend/.env`:

```env
DATABASE_URL=mongodb://localhost:27017/resumes
ENCRYPTION_KEY=your_32_byte_hex_encryption_key
PORT=3000
```

Each user adds their own OpenRouter API key in **Profile** settings. Keys are encrypted at rest in the database.

3. (Optional) Configure the frontend in `apps/frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

Leave `VITE_API_BASE_URL` empty during local dev to use the Vite proxy to `http://localhost:3000`. Set `VITE_SOCKET_URL` when the socket server is on a different host (e.g. a LAN IP).

## Development

Run both apps:

```bash
npm run dev
```

Or run individually:

```bash
npm run dev:backend
npm run dev:frontend
```

Frontend only with host (same as before):

```bash
npm run dev -w resume-builder-frontend
# or from apps/frontend:
# npm run dev
```

- Backend API: http://localhost:3000/api
- Frontend: http://localhost:5173 (network-accessible via `--host`)

## Build

```bash
npm run build
```

## AI models

Model options are loaded dynamically from the [OpenRouter models API](https://openrouter.ai/docs/api-reference/models/list-models). The backend caches the catalog for one hour and exposes it at `GET /api/ai/models`.

- **Provider** (`aiModel`) — OpenRouter provider slug (e.g. `anthropic`, `openai`, `google`)
- **Version** (`aiVersion`) — full OpenRouter model ID (e.g. `anthropic/claude-sonnet-4.6`)

The frontend uses this catalog for model selectors in Profile settings, Generate Resume, and resume list badges. Provider icons come from [`@lobehub/icons`](https://github.com/lobehub/lobe-icons).

### Changing default models

Edit defaults in `apps/backend/src/ai/openrouter-models.service.ts` (`pickDefaults`). The same values are returned in the catalog `defaults` field and used by the frontend when a user has no saved preference.

Legacy resumes that stored `claude` / short version IDs are normalized automatically via `apps/backend/src/ai/ai-models.ts` and `apps/frontend/src/constants/aiModels.ts`.

No manual enum or hardcoded model list updates are required when OpenRouter adds new models — they appear in the UI after the cache refreshes.

## Workspaces

| Package | Path | Description |
|---------|------|-------------|
| `resume-builder-backend` | `apps/backend` | NestJS API |
| `resume-builder-frontend` | `apps/frontend` | React frontend |

Run a script in one workspace:

```bash
npm run start:dev -w resume-builder-backend
npm run dev -w resume-builder-frontend
```
