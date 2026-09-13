# Kitchen KingAI — All Features Web Prototype

Android/iPhone are not required. This is a web-only Next.js + FastAPI + PostgreSQL project.

## Included
1. Real AI Chef via OpenRouter
2. PostgreSQL-ready schema
3. Profile/taste-memory UI (local prototype storage)
4. Smart Pantry
5. Ingredient image scanner endpoint
6. Smart Shopping List
7. Estimated Nutrition
8. Voice Chef using browser speech synthesis
9. Cooking Mode
10. Saved recipes/preferences
11. Security/production checklist

## IMPORTANT: API key
The ZIP intentionally does NOT contain your old or new API key. The old key was exposed in chat and should be revoked. Put your replacement key into `.env` as `OPENROUTER_API_KEY=...`.

OpenRouter supports an OpenAI-compatible API. The default model is `openai/gpt-oss-20b:free`; you can change `OPENROUTER_MODEL` to another available free model.

## Run
1. Install Node.js 20.9+ and Docker Desktop.
2. Copy `.env.example` to `.env`.
3. Put your NEW OpenRouter key in `.env`.
4. From this folder run:

   npm install
   docker compose up --build

5. In a second terminal run:

   npm run dev

6. Open http://localhost:3000

Backend health: http://localhost:8000/health

## Notes
- Do not use `npm audit fix --force`.
- Before public deployment, implement real authentication, server-side persistence for user data, HTTPS, rate limiting, secure secrets, database backups, and a production object-storage strategy for uploads.
- AI recipe and nutrition outputs are estimates and should be reviewed by the user.

## Dynamic AI Chef
The AI Chef is not limited to a hard-coded recipe catalog. It sends the user's natural-language request, pantry ingredients, serving count, time limit, and preferences to the configured OpenRouter model and asks for a structured recipe. The UI also lets the user choose servings and maximum cooking time.

Set `OPENROUTER_API_KEY` in `.env` and restart the backend with `docker compose up --build` after changing backend files.
