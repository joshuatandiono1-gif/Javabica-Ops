import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import bcrypt
import jwt
from bson import ObjectId
from flask import jsonify, request

from db import get_db

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_EXPIRY_HOURS = 24
ROLE_SALES = "sales"
ROLE_ADMIN = "admin"
ALLOWED_ROLES = {ROLE_SALES, ROLE_ADMIN}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def check_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def normalize_role(role: str) -> str:
    if role == "user":
        return ROLE_SALES
    return role


def serialize_user(user) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", ""),
        "role": normalize_role(user.get("role", ROLE_SALES)),
    }


def create_token(user: dict) -> str:
    payload = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": normalize_role(user.get("role", ROLE_SALES)),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])


def admin_create_user(data: dict):
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name = (data.get("name") or "").strip()
    role = normalize_role((data.get("role") or ROLE_SALES).strip().lower())

    if not email or not password:
        return {"error": "Email and password are required"}, 400
    if len(password) < 6:
        return {"error": "Password must be at least 6 characters"}, 400
    if role not in ALLOWED_ROLES:
        return {"error": "Invalid user category"}, 400
    if role == ROLE_ADMIN:
        return {"error": "Admin accounts cannot be created here"}, 400

    db = get_db()
    if db.users.find_one({"email": email}):
        return {"error": "User already exists"}, 409

    user = {
        "email": email,
        "name": name or email.split("@")[0],
        "password_hash": hash_password(password),
        "role": role,
        "created_at": datetime.now(timezone.utc),
    }
    result = db.users.insert_one(user)
    user["_id"] = result.inserted_id

    return {"user": serialize_user(user)}, 201


def login_user(data: dict):
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return {"error": "Email and password are required"}, 400

    db = get_db()
    user = db.users.find_one({"email": email})
    if not user or not check_password(password, user["password_hash"]):
        return {"error": "Invalid email or password"}, 401

    token = create_token(user)

    return {"token": token, "user": serialize_user(user)}, 200


def get_current_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        return None

    db = get_db()
    user = db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        return None

    return serialize_user(user)


def is_admin(user: dict) -> bool:
    return user.get("role") == ROLE_ADMIN


def is_sales(user: dict) -> bool:
    return normalize_role(user.get("role", "")) == ROLE_SALES


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        request.current_user = user
        return f(*args, **kwargs)

    return decorated


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        if not is_admin(user):
            return jsonify({"error": "Admin access required"}), 403
        request.current_user = user
        return f(*args, **kwargs)

    return decorated


def require_sales(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        if not is_sales(user):
            return jsonify({"error": "Sales access required"}), 403
        request.current_user = user
        return f(*args, **kwargs)

    return decorated
