import os
import uuid
from flask import Blueprint, request, jsonify, send_from_directory, redirect, current_app
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models import Application, Document
from ..utils.auth_helpers import get_current_user_id
from ..services.cloud_storage import upload_file, delete_file

bp = Blueprint('documents', __name__, url_prefix='/api')

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _verify_app_ownership(app_id):
    """Verify the application belongs to current user."""
    uid = get_current_user_id()
    return Application.query.filter_by(id=app_id, user_id=uid).first_or_404()


@bp.route('/applications/<int:app_id>/documents', methods=['POST'])
@jwt_required()
def upload_document(app_id):
    _verify_app_ownership(app_id)

    if 'file' not in request.files:
        return jsonify({'error': {'message': 'No file provided'}}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': {'message': 'No file selected'}}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': {'message': f'File type not allowed. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'}}), 400

    filename = secure_filename(file.filename)
    stored_name = f"{uuid.uuid4().hex}_{filename}"

    # Try Cloudinary upload, fallback to local
    cloud_url = None
    cloud_public_id = None
    try:
        cloud_url, cloud_public_id = upload_file(file, folder='documents')
        file_size = 0  # Cloudinary doesn't return size easily, set from content-length
    except Exception:
        # Fallback to local storage
        file.seek(0)
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], stored_name)
        file.save(filepath)
        file_size = os.path.getsize(filepath)

    doc = Document(
        application_id=app_id,
        filename=filename,
        stored_filename=stored_name,
        file_type=file.content_type or 'application/octet-stream',
        file_size=file_size,
        doc_category=request.form.get('doc_category', 'cv'),
        cloud_url=cloud_url,
        cloud_public_id=cloud_public_id,
    )
    db.session.add(doc)
    db.session.commit()

    return jsonify({'document': doc.to_dict()}), 201


@bp.route('/applications/<int:app_id>/documents', methods=['GET'])
@jwt_required()
def list_documents(app_id):
    _verify_app_ownership(app_id)
    docs = Document.query.filter_by(application_id=app_id).order_by(Document.uploaded_at.desc()).all()
    return jsonify({'documents': [d.to_dict() for d in docs]})


@bp.route('/documents/<int:doc_id>/download', methods=['GET'])
@jwt_required()
def download_document(doc_id):
    doc = db.get_or_404(Document, doc_id)

    # Verify ownership through application
    if doc.application_id:
        uid = get_current_user_id()
        Application.query.filter_by(id=doc.application_id, user_id=uid).first_or_404()

    # If cloud URL exists, redirect to it
    if doc.cloud_url:
        return redirect(doc.cloud_url)

    return send_from_directory(
        current_app.config['UPLOAD_FOLDER'],
        doc.stored_filename,
        download_name=doc.filename,
        as_attachment=True,
    )


@bp.route('/documents/<int:doc_id>', methods=['DELETE'])
@jwt_required()
def delete_document(doc_id):
    doc = db.get_or_404(Document, doc_id)

    # Verify ownership through application
    if doc.application_id:
        uid = get_current_user_id()
        Application.query.filter_by(id=doc.application_id, user_id=uid).first_or_404()

    # Delete from cloud if exists
    if doc.cloud_public_id:
        try:
            delete_file(doc.cloud_public_id)
        except Exception:
            pass  # Continue even if cloud delete fails

    # Delete local file if exists
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], doc.stored_filename)
    if os.path.exists(filepath):
        os.remove(filepath)

    db.session.delete(doc)
    db.session.commit()
    return '', 204
