import os
from datetime import datetime, timezone

from auth import hash_password
from db import get_db

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@javabica.com").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin")


def seed_admin():
    if not ADMIN_PASSWORD:
        return

    db = get_db()
    existing = db.users.find_one({"email": ADMIN_EMAIL})

    if existing:
        db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"role": "admin", "name": ADMIN_NAME}},
        )
        return

    db.users.insert_one(
        {
            "email": ADMIN_EMAIL,
            "name": ADMIN_NAME,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        }
    )
