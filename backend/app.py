import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from auth import admin_create_user, is_admin, login_user, require_admin, require_auth
from calculator import register_calculator_routes
from seed import seed_admin

load_dotenv()

app = Flask(__name__)

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
SERVE_FRONTEND = FRONTEND_DIST.exists()

DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "https://javabica-ops-api.onrender.com",
    "https://javabica-ops-web.onrender.com",
]
extra_origins = os.getenv("FRONTEND_URL", "")
allowed_origins = DEFAULT_ORIGINS + [
    url.strip() for url in extra_origins.split(",") if url.strip()
]

CORS(app, origins=allowed_origins)

with app.app_context():
    seed_admin()

register_calculator_routes(app)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "frontend": SERVE_FRONTEND})


@app.post("/api/auth/register")
def register():
    return jsonify({"error": "Public registration is disabled. Contact an admin."}), 403


@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    result, status = login_user(data)
    return jsonify(result), status


@app.get("/api/auth/me")
@require_auth
def me():
    return jsonify({"user": request.current_user})


@app.get("/api/dashboard")
@require_auth
def dashboard():
    user = request.current_user
    is_site_admin = is_admin(user)

    return jsonify(
        {
            "message": (
                f"Welcome, {user['name']}! Manage the product and machine catalog."
                if is_site_admin
                else f"Welcome, {user['name']}! Create inquiries to estimate client payback."
            ),
            "role": user["role"],
            "isAdmin": is_site_admin,
            "isSales": not is_site_admin,
        }
    )


@app.get("/api/admin/users")
@require_admin
def list_users():
    from auth import normalize_role
    from db import get_db

    users = get_db().users.find({}, {"password_hash": 0}).sort("created_at", -1)
    return jsonify(
        {
            "users": [
                {
                    "id": str(user["_id"]),
                    "email": user["email"],
                    "name": user.get("name", ""),
                    "role": normalize_role(user.get("role", "sales")),
                }
                for user in users
            ]
        }
    )


@app.post("/api/admin/users")
@require_admin
def create_user():
    data = request.get_json(silent=True) or {}
    result, status = admin_create_user(data)
    return jsonify(result), status


@app.get("/api/admin/user-categories")
@require_admin
def user_categories():
    return jsonify({"categories": [{"id": "sales", "label": "Sales"}]})


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if not SERVE_FRONTEND:
        return jsonify({"message": "Frontend not built. Run: cd frontend && npm run build"}), 404

    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404

    if path and (FRONTEND_DIST / path).is_file():
        return send_from_directory(FRONTEND_DIST, path)

    return send_from_directory(FRONTEND_DIST, "index.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug, host="0.0.0.0", port=port)
