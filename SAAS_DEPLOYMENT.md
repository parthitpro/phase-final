# SaaS Online Deployment Guide (Railway)

I have upgraded your project to a professional SaaS architecture. It now supports **PostgreSQL** (the industry standard for online apps).

## Step 1: Create a Railway Account
1. Go to [Railway.app](https://railway.app) and sign up with GitHub.

## Step 2: Deploy the Project
1. Click **"New Project"** -> **"Deploy from GitHub repo"**.
2. Select your repository.
3. Click **"Add Variable"** and add:
   - **Key:** `PORT`
   - **Value:** `8000`
4. Click **"Add Service"** (the + button) and choose **"Database"** -> **"Add PostgreSQL"**.
   - *Railway will automatically connect your backend to this database.*

## Step 3: Deployment Settings
In your backend service settings on Railway:
- **Root Directory:** (Leave this empty/blank)
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Step 4: Final Link
1. Once deployed, Railway will give you a domain (e.g., `viren-khakhra.up.railway.app`).
2. **Backend URL:** Use that domain for your API.
3. **Frontend:** You can host the frontend on Railway too, or on Vercel/Netlify for free.

---

### What changed in the code:
- **Database Logic:** The app now automatically detects if it's on Railway and switches from local SQLite to professional PostgreSQL.
- **Dependencies:** Added `psycopg2-binary` to handle the new database.
- **Flexibility:** You can still run it locally for testing; it will just use `orders.db` like before.
