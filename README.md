# Javabica Ops

Operations platform for Javabica — admin catalog management, sales inquiries, and investment payback approval workflow.

## Stack

- **Backend:** Flask + MongoDB Atlas (serves the React app in production)
- **Frontend:** React (Vite)
- **Deploy:** Single Render web service — no `VITE_API_URL` needed

## Local development

### Backend

```bash
cd backend
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Frontend (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — Vite proxies `/api` to the backend.

## Production (Render)

One service serves both the app and API from the same URL (e.g. `https://javabica-ops-api.onrender.com`).

1. Push to GitHub and sync the Render blueprint
2. Set secrets on **javabica-ops-api**:
   - `MONGODB_URI`
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD`
3. Open your API service URL — login works with no frontend env vars

You can delete the old **javabica-ops-web** static site; it is no longer used.

## Environment variables (backend)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | Database name (default: `vibe_coding`) |
| `JWT_SECRET` | Auth token secret |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Initial admin account |

## Roles

| Role | Access |
|---|---|
| **Admin** | Catalog (machines, coffee COGS), user management |
| **Sales** | Create inquiries, view approved/successful/failed dashboards |

## Inquiry approval

- **Approved:** internal payback period < 22 months
- **Rejected:** payback ≥ 22 months
- Sales only see Approved/Rejected — no COGS, costs, or ROI figures
