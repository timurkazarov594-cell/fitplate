# Workspace

## Overview

pnpm workspace monorepo for the AI Recipe Scanner web app. Users upload a photo
of a dish and an AI vision model returns a complete recipe with ingredients,
step-by-step instructions, and per-serving nutrition facts.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19, Vite, Tailwind v4, shadcn/ui, framer-motion, wouter
- **API framework**: Express 5
- **AI provider**: OpenAI Vision (`gpt-5.4`) via Replit AI Integrations proxy
  (no user API key required — credentials are auto-provisioned as
  `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle) for the API server, Vite for the frontend

## Artifacts

- `artifacts/recipe-scanner` — React + Vite frontend (served at `/`)
- `artifacts/api-server` — Express API (served at `/api`)

## Key endpoints

- `POST /api/recipes/analyze` — accepts `{ imageBase64, mimeType }`, calls the
  OpenAI vision model, and returns a structured `AnalyzedRecipe` (dish name,
  cuisine, ingredients with quantities, ordered steps, cooking time,
  difficulty, serving size, calories, protein, fats, carbs).

Saved recipes are persisted in the browser's `localStorage` (no database is
used in the first build).

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
