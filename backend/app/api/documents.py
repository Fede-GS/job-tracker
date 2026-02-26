import os
import uuid
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models import Application, Document

bp = Blueprint('documents', __name__, url_prefix='/api')

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg'}


def _current_user_id():
    try:
        return int(get_jwt_identity())
    except Exception:
        return None


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@bp.route('/applications/<int:app_id>/documents', methods=['POST'])
@jwt_required()
def upload_document(app_id):
    user_id = _current_user_id()
    Application.query.filter_by(id=app_id, user_id=user_id).first_or_404()

    if 'file' not in request.files:
        return jsonify({'error': {'message': 'No file provided'}}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': {'message': 'No file selected'}}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': {'message': f'File type not allowed. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'}}), 400

    filename = secure_filename(file.filename)
    stored_name = f"{uuid.uuid4().hex}_{filename}"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], stored_name)
    file.save(filepath)

    doc = Document(
        user_id=user_id,
        application_id=app_id,
        filename=filename,
        stored_filename=stored_name,
        file_type=file.content_type or 'application/octet-stream',
        file_size=os.path.getsize(filepath),
        doc_category=request.form.get('doc_category', 'cv'),
    )
    db.session.add(doc)
    db.session.commit()

    return jsonify({'document': doc.to_dict()}), 201


@bp.route('/applications/<int:app_id>/documents', methods=['GET'])
@jwt_required()
def list_documents(app_id):
    user_id = _current_user_id()
    Application.query.filter_by(id=app_id, user_id=user_id).first_or_404()
    docs = Document.query.filter_by(application_id=app_id).order_by(Document.uploaded_at.desc()).all()
    return jsonify({'documents': [d.to_dict() for d in docs]})


@bp.route('/documents/<int:doc_id>/download', methods=['GET'])
@jwt_required()
def download_document(doc_id):
    user_id = _current_user_id()
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first_or_404()
    return send_from_directory(
        current_app.config['UPLOAD_FOLDER'],
        doc.stored_filename,
        download_name=doc.filename,
        as_attachment=True,
    )


@bp.route('/documents/<int:doc_id>', methods=['DELETE'])
@jwt_required()
def delete_document(doc_id):
    user_id = _current_user_id()
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first_or_404()
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], doc.stored_filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    db.session.delete(doc)
    db.session.commit()
    return '', 204
