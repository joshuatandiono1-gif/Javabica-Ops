# Javabica Ops

Operations platform for Javabica — admin catalog management, sales inquiries, and investment payback approval workflow.

## Stack

- **Backend:** Flask + MongoDB Atlas
- **Frontend:** React (Vite)
- **Auth:** JWT with admin and sales roles

## Project structure

```
backend/     Flask API
frontend/    React app
render.yaml  Render.com deployment blueprint
```

## Local development

### Backend

```bash
cd backend
cp .env.example .env   # fill in MongoDB + admin credentials
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

API runs at http://127.0.0.1:5001

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:3000 (proxies `/api` to backend).

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | Database name (default: `vibe_coding`) |
| `JWT_SECRET` | Secret for signing auth tokens |
| `ADMIN_EMAIL` | Initial admin email (seeded on startup) |
| `ADMIN_PASSWORD` | Initial admin password |
| `ADMIN_NAME` | Admin display name |
| `FRONTEND_URL` | Allowed CORS origin(s), comma-separated |
| `PORT` | Server port (default: `5001`) |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL in production (empty for local dev) |

## Deployment (Render)

1. Push this repo to GitHub.
2. Create a new **Blueprint** on [Render](https://render.com) from `render.yaml`.
3. Set secret env vars in the Render dashboard:
   - `MONGODB_URI`
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD`
   - `FRONTEND_URL` → your deployed frontend URL (e.g. `https://javabica-ops-web.onrender.com`)
   - `VITE_API_URL` (on the static site) → your deployed API URL (e.g. `https://javabica-ops-api.onrender.com`)
4. Redeploy the frontend after setting `VITE_API_URL` (required at build time).

### MongoDB Atlas

- Add Render's outbound IP addresses (or `0.0.0.0/0` for testing) to **Network Access**.
- Ensure the database user has read/write access.

## Roles

| Role | Access |
|---|---|
| **Admin** | Catalog (machines, coffee COGS), user management |
| **Sales** | Create inquiries, view approved/successful/failed dashboards |

## Inquiry approval

- **Approved:** internal payback period &lt; 22 months
- **Rejected:** payback ≥ 22 months
- Sales only see Approved/Rejected — no COGS, costs, or ROI figures
