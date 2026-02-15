# Deploying AI QA Engineer for Web (Vercel + Backend)

This guide explains how to deploy the app so **anyone can use it on the web** to test their APIs by URL (no local project path required).

## Architecture

- **Frontend (Next.js)** → Deploy to **Vercel**. Users get a public URL.
- **Backend (Express + Playwright + Ollama/AI)** → Deploy to **Railway**, **Render**, or **Fly.io** (Vercel cannot run long-lived servers or Playwright).

Users can:
- Enter **API Base URL** and **OpenAPI/Swagger URL** to discover endpoints and run full scans.
- Or add **endpoints manually** (method + path) and run tests.

---

## 1. Deploy Backend (Railway / Render / Fly.io)

The backend must be deployed on a platform that supports Node.js and Playwright.

### Option A: Railway

1. Go to [railway.app](https://railway.app) and create a project.
2. Connect your repo and set **Root Directory** to `backend`.
3. Add environment variables:
   - `PORT` (Railway often sets this automatically)
   - `OLLAMA_BASE_URL` – If you use a hosted Ollama, set its URL. For Railway you may need to use an external AI (see below).
   - `OLLAMA_MODEL` – e.g. `deepseek-coder`
   - `CORS_ORIGIN` – Your Vercel frontend URL, e.g. `https://your-app.vercel.app`
4. Deploy. Note the public URL (e.g. `https://your-backend.railway.app`).

### Option B: Render

1. Go to [render.com](https://render.com) and create a **Web Service**.
2. Connect repo, set **Root Directory** to `backend`.
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Set env vars (same as above). Set **CORS_ORIGIN** to your Vercel URL.
6. Deploy and copy the service URL.

### Backend requirements

- **Playwright**: Install Chromium in the Dockerfile or use a buildpack that supports Playwright (e.g. `npx playwright install chromium` in build step).
- **Ollama**: Railway/Render typically don’t run Ollama. Options:
  - Use a **hosted Ollama** (e.g. [Ollama Cloud](https://ollama.com) or your own server) and set `OLLAMA_BASE_URL`.
  - Or add **OpenAI** support in the backend and set `OPENAI_API_KEY` (future enhancement).

---

## 2. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and import your Git repository.
2. Set **Root Directory** to `frontend`.
3. Add environment variable:
   - **Name:** `NEXT_PUBLIC_API_URL`  
   - **Value:** Your backend URL (e.g. `https://your-backend.railway.app`)
4. Deploy. Vercel will build and host the Next.js app.

### Local env (optional)

In `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

For production, set `NEXT_PUBLIC_API_URL` in the Vercel project settings.

---

## 3. CORS

Ensure the backend allows the frontend origin:

- **Backend** `CORS_ORIGIN`: exact frontend URL, e.g. `https://your-app.vercel.app`
- No trailing slash in `NEXT_PUBLIC_API_URL` or `CORS_ORIGIN`.

---

## 4. Summary

| Component | Where to deploy | Env / config |
|-----------|------------------|--------------|
| Frontend  | Vercel (root: `frontend`) | `NEXT_PUBLIC_API_URL` = backend URL |
| Backend   | Railway / Render / Fly.io (root: `backend`) | `CORS_ORIGIN` = Vercel URL, `OLLAMA_*` or OpenAI |

After deployment, users open the Vercel URL, choose **“Test a public API (by URL)”**, enter their API base URL and OpenAPI URL (or add endpoints manually), and run a full scan.
