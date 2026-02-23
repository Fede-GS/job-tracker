import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from .extensions import db, jwt, migrate
from .config import Config


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(app.root_path), 'instance'), exist_ok=True)

    # CORS
    allowed_origins = [
        "http://localhost:5173",
    ]
    frontend_url = os.environ.get('FRONTEND_URL')
    if frontend_url:
        allowed_origins.append(frontend_url)
    CORS(app, origins=allowed_origins, supports_credentials=True)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    # JWT error handlers — normalize ALL JWT errors to 401
    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return jsonify({'error': {'message': 'Invalid token'}, 'msg': error_string}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': {'message': 'Token has expired'}, 'msg': 'Token has expired'}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return jsonify({'error': {'message': 'Missing authorization token'}, 'msg': error_string}), 401

    @jwt.token_verification_failed_loader
    def token_verification_failed_callback(jwt_header, jwt_payload):
        return jsonify({'error': {'message': 'Token verification failed'}, 'msg': 'Token verification failed'}), 401

    # Register blueprints
    from .api import applications, documents, reminders, ai, dashboard, settings, profile, job_search, auth, interviews
    app.register_blueprint(auth.bp)
    app.register_blueprint(applications.bp)
    app.register_blueprint(documents.bp)
    app.register_blueprint(reminders.bp)
    app.register_blueprint(ai.bp)
    app.register_blueprint(dashboard.bp)
    app.register_blueprint(settings.bp)
    app.register_blueprint(profile.bp)
    app.register_blueprint(job_search.bp)
    app.register_blueprint(interviews.bp)

    # Serve React frontend in production
    static_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'frontend', 'dist')
    static_folder = os.path.abspath(static_folder)

    if os.path.isdir(static_folder):
        @app.route('/', defaults={'path': ''})
        @app.route('/<path:path>')
        def serve_frontend(path):
            if path.startswith('api/'):
                return '', 404
            file_path = os.path.join(static_folder, path)
            if path and os.path.exists(file_path):
                return send_from_directory(static_folder, path)
            return send_from_directory(static_folder, 'index.html')

    return app
