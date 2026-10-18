# Deployment Guide: Supabase + Vercel + Python Backend

This guide covers deploying the **PDF Disclaimer Cleaner (Tracxn)** tool to production with **Supabase** (PostgreSQL & Cloud Object Storage) and **Vercel** (Frontend).

---

## Architecture Overview

```
┌─────────────────────────────────┐
│       Frontend (Vercel)         │
│     React + TypeScript + Vite   │
└────────────────┬────────────────┘
                 │ API calls
                 ▼
┌─────────────────────────────────┐       ┌────────────────────────────────┐
│   Backend (Render / Railway)    │ <---> │       Supabase Backend         │
│   FastAPI + PyMuPDF Redaction   │       │  • PostgreSQL (tracxn_files)   │
│   (Coordinate-level Engine)     │       │  • Storage (raw & cleaned PDFs)│
└─────────────────────────────────┘       └────────────────────────────────┘
```

- **Database & Storage (Supabase)**: Persistent PostgreSQL table (`tracxn_files`) for tracking files and QA verification reports, plus Cloud Storage Buckets (`raw-pdfs`, `cleaned-pdfs`).
- **Processing Engine (Render / Railway)**: FastAPI + PyMuPDF container service. Completely stateless because all files and status sync directly to Supabase.
- **Frontend (Vercel)**: Fast global CDN hosting for the user interface.

---

## Step 1: Set Up Supabase (1-Click SQL)

1. Create a free account at [Supabase.com](https://supabase.com/) and create a new project.
2. In the Supabase Dashboard, go to **SQL Editor** in the left sidebar.
3. Open [`supabase_schema.sql`](supabase_schema.sql), paste its contents into the SQL Editor, and click **Run**.
   - Creates the `tracxn_files` table with indexes, triggers, and Row-Level Security policies.
   - Creates the `raw-pdfs` and `cleaned-pdfs` storage buckets.
   - Enables Supabase Realtime replication.
4. Go to **Project Settings** → **API** and copy:
   - **Project URL** (`SUPABASE_URL`)
   - **Service Role Secret Key** (`SUPABASE_KEY`) *(recommended for backend server)*

---

## Step 2: Deploy Backend with Supabase Keys (Render — Free Tier)

1. Push your repository to **GitHub**:
   ```powershell
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin master
   ```
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Web Service**.
3. Select your GitHub repository.
4. Render auto-detects [`render.yaml`](backend/render.yaml), or configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. In **Environment Variables**, add:
   - `SUPABASE_URL`: *(your Project URL from Step 1)*
   - `SUPABASE_KEY`: *(your Service Role or Anon Key from Step 1)*
6. Click **Create Web Service** and copy your backend URL (e.g. `https://tracxn-cleaner-backend.onrender.com`).

---

## Step 3: Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new) and click **Import** next to your GitHub repository.
2. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend` *(or leave as root; the root `vercel.json` will build it automatically)*
3. In **Environment Variables**, add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://tracxn-cleaner-backend.onrender.com` *(your URL from Step 2)*
4. Click **Deploy**.

---

## Testing Local Development with Supabase

To test locally with your Supabase project:
1. Create a `.env` file inside `backend/`:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-supabase-key
   ```
2. When the backend starts, it will print:
   ```
   [Supabase] Connected successfully to Supabase.
   ```
3. Upload and process a file. Inspect your **Supabase Table Editor** (`tracxn_files`) and **Storage Buckets** (`raw-pdfs` and `cleaned-pdfs`) to see the records and vector PDFs synced live!
