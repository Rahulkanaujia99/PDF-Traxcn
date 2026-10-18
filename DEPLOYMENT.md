# Deployment Guide: Vercel + Backend Host

This guide covers deploying the **PDF Disclaimer Cleaner (Tracxn)** tool to production.

---

## Architecture Overview

- **Frontend (Vercel)**: React + TypeScript + Vite dashboard hosted on Vercel's global CDN edge network.
- **Backend (Render / Railway / Koyeb)**: FastAPI + PyMuPDF container service. 

> [!NOTE]
> **Why deploy the backend on Render/Railway instead of Vercel Serverless Functions?**  
> PyMuPDF uses native C vector engines, performs multi-page PDF processing with asynchronous progress polling, and writes temporary artifacts. Serverless functions on Vercel have a strict 10s execution limit and stateless, ephemeral filesystems. Hosting the backend on a container platform like Render (free tier) gives you zero timeout issues, persistent PyMuPDF execution, and smooth multi-file batch processing.

---

## Step 1: Deploy the Backend (Render — Free Tier)

1. Push your repository to **GitHub**.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Web Service**.
3. Select your GitHub repository.
4. Render will auto-detect the configuration using the included [`render.yaml`](backend/render.yaml), or enter manually:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Click **Create Web Service**.
6. Once deployed, copy your backend service URL (e.g., `https://tracxn-cleaner-backend.onrender.com`).

*(Alternative: You can also deploy to **Railway.app** or **Fly.io** using the included [`Dockerfile`](backend/Dockerfile) or [`Procfile`](backend/Procfile).)*

---

## Step 2: Deploy the Frontend to Vercel

### Method A: Via Vercel Web Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Click **Import** next to your GitHub repository.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and select `frontend` *(or leave as root; the included root `vercel.json` supports both)*.
4. Expand **Environment Variables** and add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://your-backend-app.onrender.com` *(your URL from Step 1)*
5. Click **Deploy**.

---

### Method B: Via Vercel CLI

From your terminal:

```powershell
# 1. Install Vercel CLI (if not installed)
npm install -g vercel

# 2. Deploy from frontend directory
cd frontend
vercel
```

When prompted:
- Set `VITE_API_BASE_URL` to your backend URL.
- Deploy to production: `vercel --prod`

---

## Verifying Deployment

1. Visit your Vercel deployment URL (e.g. `https://your-app.vercel.app`).
2. Click **"Load Sample Financial Report"** to test generation and coordinate-level redaction.
3. Use the **Interactive Before/After Curtain Slider** to verify that disclaimers are removed with 100% vector fidelity.
