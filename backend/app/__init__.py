import os
from flask import Flask, jsonify
from flask_cors import CORS
from .extensions import db, jwt
from .config import Config


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(app.root_path), 'instance'), exist_ok=True)

    # Parse comma-separated ALLOWED_ORIGINS from config
    allowed_origins = [o.strip() for o in app.config.get('ALLOWED_ORIGINS', 'http://localhost:5173').split(',') if o.strip()]
    CORS(app, origins=allowed_origins, supports_credentials=True)
    db.init_app(app)
    jwt.init_app(app)

    # JWT error handlers
    @jwt.unauthorized_loader
    def unauthorized_callback(reason):
        return jsonify({'error': {'message': 'Authentication required. Please log in.'}}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        return jsonify({'error': {'message': 'Invalid token. Please log in again.'}}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_data):
        return jsonify({'error': {'message': 'Session expired. Please log in again.'}}), 401

    from .api import applications, documents, reminders, ai, dashboard, settings, profile, job_search, interviews
    from .api import auth, admin
    app.register_blueprint(auth.bp)
    app.register_blueprint(admin.bp)
    app.register_blueprint(applications.bp)
    app.register_blueprint(documents.bp)
    app.register_blueprint(reminders.bp)
    app.register_blueprint(ai.bp)
    app.register_blueprint(dashboard.bp)
    app.register_blueprint(settings.bp)
    app.register_blueprint(profile.bp)
    app.register_blueprint(job_search.bp)
    app.register_blueprint(interviews.bp)

    with app.app_context():
        db.create_all()
        _run_schema_migrations()
        _migrate_existing_data()

    return app


def _run_schema_migrations():
    """Add missing columns to existing tables (safe ALTER TABLE migrations)."""
    from sqlalchemy import text
    migrations = [
        # users table
        "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'",
        "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1",
        "ALTER TABLE users ADD COLUMN password_hash VARCHAR(256)",
        # user_profile table
        "ALTER TABLE user_profile ADD COLUMN user_id INTEGER REFERENCES users(id)",
        "ALTER TABLE user_profile ADD COLUMN setup_method VARCHAR(20)",
        # applications table
        "ALTER TABLE applications ADD COLUMN user_id INTEGER REFERENCES users(id)",
        # documents table
        "ALTER TABLE documents ADD COLUMN user_id INTEGER REFERENCES users(id)",
        # chat_messages table
        "ALTER TABLE chat_messages ADD COLUMN user_id INTEGER REFERENCES users(id)",
        # career_consultant_sessions table
        "ALTER TABLE career_consultant_sessions ADD COLUMN user_id INTEGER REFERENCES users(id)",
    ]
    with db.engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                # Column already exists or table doesn't exist yet — skip
                pass


def _migrate_existing_data():
    """Assign existing data (pre-auth) to a default admin user if no users exist yet."""
    from .models import User, UserProfile, Application, Document, ChatMessage, CareerConsultantSession

    # Only migrate if there are no users but there is existing data
    if User.query.count() > 0:
        return

    existing_profile = UserProfile.query.first()
    existing_apps = Application.query.count()

    if not existing_profile and existing_apps == 0:
        return  # Fresh install, nothing to migrate

    # Create a default admin user for existing data
    admin_email = 'admin@finixjob.local'
    admin = User(email=admin_email, role='admin')
    admin.set_password('changeme123')
    db.session.add(admin)
    db.session.flush()

    # Assign existing profile to admin
    if existing_profile and existing_profile.user_id is None:
        existing_profile.user_id = admin.id

    # Assign existing applications to admin
    Application.query.filter_by(user_id=None).update({'user_id': admin.id})
    Document.query.filter_by(user_id=None).update({'user_id': admin.id})
    ChatMessage.query.filter_by(user_id=None).update({'user_id': admin.id})
    CareerConsultantSession.query.filter_by(user_id=None).update({'user_id': admin.id})

    db.session.commit()
