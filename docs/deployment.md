# Deployment Guide — Render

This guide walks you through deploying the AI Career Copilot to [Render](https://render.com) (free tier available).

## Prerequisites

- GitHub repo pushed (already done ✅)
- [Render account](https://render.com) (free)
- OpenAI API key

---

## Architecture on Render

```
render.com
├── Web Service — FastAPI backend (Python)
├── Web Service — React frontend (Static site)
├── PostgreSQL — Managed database
└── ChromaDB — Run via Docker or use a managed alternative
```

---

## Step 1 — PostgreSQL Database

1. Go to **Render Dashboard → New → PostgreSQL**
2. Name: `career-copilot-db`
3. Plan: Free
4. Click **Create Database**
5. Copy the **Internal Database URL** — you'll need it for the backend env vars

---

## Step 2 — Deploy the Backend

1. Go to **New → Web Service**
2. Connect your GitHub repo: `Sujalpawar01/ai-career-copilot`
3. Configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Free (or Starter for production) |

4. Add **Environment Variables**:

```
OPENAI_API_KEY=sk-...your-key...
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
DATABASE_URL=postgresql+asyncpg://...your-render-db-url...
JWT_SECRET_KEY=generate-a-long-random-secret-here
APP_ENV=production
ALLOWED_ORIGINS=https://your-frontend.onrender.com
CHROMA_PERSIST_DIR=/opt/render/project/src/chroma_db
UPLOAD_DIR=/opt/render/project/src/uploads
```

> [!NOTE]
> For ChromaDB on Render free tier, use `CHROMA_PERSIST_DIR` with a local path.
> For production, consider [Chroma Cloud](https://trychroma.com) or host ChromaDB separately.

5. Click **Create Web Service** → copy the backend URL (e.g. `https://career-copilot-api.onrender.com`)

---

## Step 3 — Deploy the Frontend

1. Go to **New → Static Site**
2. Connect same GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

4. Add **Environment Variables**:

```
VITE_API_URL=https://career-copilot-api.onrender.com
```

5. Click **Create Static Site**

---

## Step 4 — Update CORS

Once both services are deployed, update the backend's `ALLOWED_ORIGINS` environment variable:

```
ALLOWED_ORIGINS=https://your-frontend.onrender.com
```

Then redeploy the backend (Render does this automatically on env var change).

---

## Step 5 — Verify Deployment

1. Visit your frontend URL
2. Register a new account
3. Upload a resume PDF
4. Add a job description
5. Run match analysis
6. Chat with the AI assistant

---

## Local → Production Environment Variable Differences

| Variable | Local | Production |
|----------|-------|------------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:password@localhost:5432/career_copilot` | Render internal URL |
| `CHROMA_HOST` | `localhost` | `""` (use persist dir) |
| `APP_ENV` | `development` | `production` |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Your Render frontend URL |

---

## Troubleshooting

**Backend not starting?**
- Check Render logs for missing env vars
- Ensure `DATABASE_URL` uses `postgresql+asyncpg://` not `postgresql://`

**ChromaDB errors?**
- Set `CHROMA_PERSIST_DIR` to a writable path on Render
- Consider upgrading to a paid plan for persistent disk storage

**OpenAI errors?**
- Verify `OPENAI_API_KEY` is set correctly
- Check your OpenAI usage limits / billing
