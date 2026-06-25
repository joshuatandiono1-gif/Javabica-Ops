import os

import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

_client = None


def get_db():
    global _client
    if _client is None:
        uri = os.getenv("MONGODB_URI")
        if not uri:
            raise RuntimeError("MONGODB_URI is not set in environment")
        if not uri.startswith("mongodb+srv://") and not uri.startswith("mongodb://"):
            raise RuntimeError("MONGODB_URI must start with mongodb+srv:// or mongodb://")

        _client = MongoClient(
            uri,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
        )
    return _client[os.getenv("MONGODB_DB_NAME", "vibe_coding")]
