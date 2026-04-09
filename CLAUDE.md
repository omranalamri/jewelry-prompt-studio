@AGENTS.md

# CLAUDE.md — Jewelry Prompt Engineering Studio

## Project Summary
A Next.js 16 app that uses Claude's vision API to analyze jewelry images and generate
AI generation prompts for Midjourney, DALL-E 3, Runway, and Kling/Sora.

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui + framer-motion
- Anthropic Claude API (claude-sonnet-4-5) — server-side only
- Neon Postgres via @neondatabase/serverless
- Vercel Blob for image storage
- Deployed on Vercel

## Key Architecture Decisions
- Anthropic API key is SERVER-SIDE ONLY — never in client components
- Images are processed server-side in API routes, not client-side
- Three API routes: /api/analyze, /api/concept, /api/vision
- System prompts live in lib/prompts/ — treat them as critical product logic
- Database: Neon Postgres (not Supabase), client in lib/db.ts
- Image storage: Vercel Blob (not S3), used in /api/upload

## Code Style
- TypeScript strict mode throughout
- Always define interfaces before implementing
- Use async/await, never .then() chains
- Tailwind for all styling — no inline styles except dynamic values
- shadcn/ui for base components — extend, don't replace

## Important Files
- lib/prompts/ — The AI system prompts. Do not modify without understanding the full
  prompt engineering context. Changes here directly affect output quality.
- types/prompts.ts — Source of truth for all data shapes
- lib/utils/parseResponse.ts — Claude JSON parsing must be robust to markdown fences
- lib/db.ts — Neon Postgres connection
- lib/migrate.ts — Database schema migration (run with `npx tsx lib/migrate.ts`)

## Environment Variables
- ANTHROPIC_API_KEY — Claude API key (server-side only)
- DATABASE_URL — Neon Postgres connection string
- BLOB_READ_WRITE_TOKEN — Vercel Blob token (auto-set when linked)
- Never commit .env.local

## Do Not
- Do not add global state management libraries (Redux, Zustand) without discussion
- Do not store image data in the database — only Vercel Blob URLs
- Do not expose the Anthropic API key to the client under any circumstances
- Do not bypass TypeScript with `any` — use `unknown` and narrow properly
