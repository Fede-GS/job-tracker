import os
from flask import Flask
from flask_cors import CORS
from .extensions import db
from .config import Config


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(app.root_path), 'instance'), exist_ok=True)

    CORS(app, origins=["http://localhost:5173"])
    db.init_app(app)

    from .api import applications, documents, reminders, ai, dashboard, settings, profile, job_search, interviews
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

    return app
