# Lex Superior - Zimbabwe Civil Law AI Legal Advocate

## Overview

A full-stack legal AI web application for Zimbabwe's Superior Courts, specialising exclusively in civil law and civil litigation. Built as a pnpm monorepo with a React/Vite frontend and Express backend.

## App Identity

| Property | Value |
|----------|-------|
| App Name | Lex Superior |
| Tagline | "Your Expert Legal Advocate for the Superior Courts of Zimbabwe" |
| Scope | Civil law and civil litigation ONLY |
| Logo | Scales of justice — gold on deep navy |

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Animation**: Framer Motion
- **AI Pipeline**: Multi-provider fallback (SambaNova, Groq, Cerebras, OpenRouter, etc.)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/          # Express 5 API server (routes, AI pipeline)
│   │   └── src/
│   │       ├── lib/
│   │       │   └── aiPipeline.ts   # Multi-provider AI with fallback
│   │       └── routes/
│   │           ├── chat.ts         # /api/chat, /api/provider/status
│   │           ├── consultations.ts # /api/consultations
│   │           ├── library.ts      # /api/library/statutes|cases|notes|updates
│   │           ├── vault.ts        # /api/vault/files|bookmarks
│   │           └── documents.ts    # /api/documents/generate
│   └── lex-superior/        # React + Vite frontend
│       └── src/
│           ├── pages/
│           │   ├── Landing.tsx     # Animated hero, feature cards
│           │   ├── Chat.tsx        # 3-panel chat interface
│           │   ├── Documents.tsx   # Document Drafting Studio
│           │   ├── Library.tsx     # Legal Library (statutes, cases, notes)
│           │   ├── Vault.tsx       # File Vault
│           │   ├── Guides.tsx      # Procedural Guides
│           │   └── About.tsx       # About & disclaimer
│           └── components/
│               └── layout/
│                   └── AppLayout.tsx # Nav + disclaimer + layout
├── lib/
│   ├── api-spec/            # OpenAPI spec + Orval codegen config
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod schemas from OpenAPI
│   └── db/
│       └── src/schema/
│           ├── consultations.ts  # consultations, messages tables
│           ├── library.ts        # statutes, cases, notes, updates tables
│           └── vault.ts          # vault_files, bookmarks tables
```

## Pages

1. **Landing** (`/`) — Animated hero, 6 feature cards, 3-step how-it-works
2. **Chat** (`/chat`) — 3-panel resizable layout with AI pipeline progress
3. **Documents** (`/documents`) — Document Drafting Studio (all court document types)
4. **Library** (`/library`) — Statutes, Court Rules, Case Law, Principles, Forms, Checklists, Updates
5. **Vault** (`/vault`) — Personal file storage with folder tree
6. **Guides** (`/guides`) — 12 step-by-step procedural guides
7. **About** (`/about`) — Mission, disclaimer, feedback

## AI Pipeline

Multi-provider rotation with in-memory caching:
- Primary: SambaNova (DeepSeek R1 671B)
- Fallback 1: Groq Key 1 (deepseek-r1-distill-llama-70b)
- Fallback 2: Groq Key 2
- Fallback 3: Cerebras (llama3.1-70b)
- Fallback 4: OpenRouter (deepseek/deepseek-r1:free)

Quality review step flags suspicious citations as [VERIFY: type].

## Environment Variables Needed

```
SAMBANOVA_API_KEY=     # cloud.sambanova.ai — free
GROQ_API_KEY_1=        # console.groq.com — free
GROQ_API_KEY_2=        # backup groq account
CEREBRAS_API_KEY=      # inference.cerebras.ai — free
OPENROUTER_API_KEY=    # openrouter.ai — free models
```

## Database Schema

- `consultations` — chat sessions
- `messages` — chat messages with provider metadata
- `statutes` — legal statutes library (25 seeded)
- `cases` — case law database (15 seeded)
- `notes` — BLAW 302 civil procedure notes (15 units seeded)
- `legal_updates` — latest legal developments (6 seeded)
- `vault_files` — personal file storage metadata
- `bookmarks` — saved library items

## Development Commands

- `pnpm --filter @workspace/api-server run dev` — start API server
- `pnpm --filter @workspace/lex-superior run dev` — start frontend
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client
- `pnpm --filter @workspace/db run push` — push DB schema changes

## Colour Palette

```css
--navy:      #0A1628
--gold:      #C9A84C
--parchment: #F8F7F4
--text:      #1A1A2E
--warning:   #C1121F
--success:   #2D6A4F
```
