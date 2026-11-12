# Ebonyi News Forum

A full-stack starter platform for documenting Ebonyi State history, news, people, culture and community life.

## Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Python + FastAPI + SQLAlchemy
- Database: PostgreSQL
- Node.js: frontend development/build runtime

## Features in this starter
- Responsive editorial homepage
- News feed with category, LGA and community filters
- History/archive section
- 13 Ebonyi LGAs preloaded in the frontend and database seed script
- REST API for articles, categories and locations
- PostgreSQL via Docker Compose
- Search-ready article API and sample seed content
- Clear separation between frontend and backend

## Run with Docker (database + API)
1. Install Docker Desktop and Node.js 20+ and Python 3.11+.
2. Copy `.env.example` to `.env`.
3. Start PostgreSQL: `docker compose up -d db`
4. Backend:
   ```bash
   cd backend
   python -m venv .venv
   # Windows: .venv\Scripts\activate
   # macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   python seed.py
   uvicorn app.main:app --reload --port 8000
   ```
5. Frontend in another terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
6. Open http://localhost:5180. API docs: http://localhost:8000/docs.

## Environment
The backend reads `DATABASE_URL`. The default in `.env.example` is configured for the Docker Compose database.
If running the API outside Docker, use `postgresql+psycopg://postgres:postgres@localhost:5432/ebonyi_forum`.

## Important editorial and safety notes
- This is a working foundation, not a fully production-hardened newsroom.
- Sample stories are clearly marked as demo content. Replace them with verified reporting.
- Historical records should include source, author/researcher, date, confidence/verification status and correction history.
- Do not publish allegations, personal data, or sensitive community claims without editorial verification and legal review.
- Before public launch, add authentication/roles, moderation workflow, image/video storage, backups, rate limiting, audit logs, SEO metadata, email notifications and deployment secrets.
- Community names and historical records should be reviewed with local historians and community representatives before being treated as authoritative.

## Project layout
```
backend/
  app/
    main.py
    database.py
    models.py
    schemas.py
    routers/articles.py
    routers/locations.py
  seed.py
frontend/
  src/
    App.tsx
    main.tsx
    index.css
    data.ts
  index.html
  package.json
  vite.config.ts
  tailwind.config.js
  postcss.config.js
docker-compose.yml
.env.example
```
