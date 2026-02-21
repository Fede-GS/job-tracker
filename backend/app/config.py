import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # Database — PostgreSQL in production, SQLite locally
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(os.path.dirname(BASE_DIR), 'instance', 'tracker.db')}"
    )
    # Render uses postgres:// but SQLAlchemy needs postgresql://
    if SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # File uploads
    UPLOAD_FOLDER = os.path.join(os.path.dirname(BASE_DIR), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload

    # JWT Authentication
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=30)

    # Shared API keys (environment variables for online version)
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
    ADZUNA_APP_ID = os.environ.get('ADZUNA_APP_ID', '')
    ADZUNA_API_KEY = os.environ.get('ADZUNA_API_KEY', '')

    # Cloudinary
    CLOUDINARY_URL = os.environ.get('CLOUDINARY_URL', '')
