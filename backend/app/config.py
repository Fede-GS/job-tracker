import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Persistent data directory: use RENDER_DATA_DIR env var on Render,
# otherwise fall back to the local backend directory (dev mode).
# Use `or` so that an empty string also falls back to the default.
_DATA_DIR = os.environ.get('RENDER_DATA_DIR') or os.path.dirname(BASE_DIR)


class Config:
    # ── Database ───────────────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(_DATA_DIR, 'instance', 'tracker.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── File uploads ───────────────────────────────────────────────────────────
    UPLOAD_FOLDER = os.environ.get(
        'UPLOAD_FOLDER',
        os.path.join(_DATA_DIR, 'uploads')
    )
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload

    # ── Security (MUST be set via env vars in production) ─────────────────────
    SECRET_KEY = os.environ.get('SECRET_KEY', 'finixjob-secret-key-change-in-production-2024')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'finixjob-jwt-secret-key-change-in-production-2024')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=30)

    # ── AI API Keys ────────────────────────────────────────────────────────────
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
    BLACKBOX_HISTORY_API_KEY = os.environ.get('BLACKBOX_HISTORY_API_KEY', 'sk-PfFX1Lb7KS3Ec8XnoIPafQ')

    # ── CORS ───────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed frontend origins, e.g.:
    # "https://finixjob.onrender.com,http://localhost:5173"
    ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173')

    # ── Registration ───────────────────────────────────────────────────────────
    # True = anyone can register; False = invite-only (recommended for production)
    OPEN_REGISTRATION = os.environ.get('OPEN_REGISTRATION', 'false').lower() == 'true'
