import os
import uuid
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models import Application, Document

bp = Blueprint('documents', __name__, url_prefix='/api')

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@bp.route('/applications/<int:app_id>/documents', methods=['POST'])
def upload_document(app_id):
    db.get_or_404(Application, app_id)

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
def list_documents(app_id):
    db.get_or_404(Application, app_id)
    docs = Document.query.filter_by(application_id=app_id).order_by(Document.uploaded_at.desc()).all()
    return jsonify({'documents': [d.to_dict() for d in docs]})


@bp.route('/documents/<int:doc_id>/download', methods=['GET'])
def download_document(doc_id):
    doc = db.get_or_404(Document, doc_id)
    return send_from_directory(
        current_app.config['UPLOAD_FOLDER'],
        doc.stored_filename,
        download_name=doc.filename,
        as_attachment=True,
    )


@bp.route('/documents/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    doc = db.get_or_404(Document, doc_id)
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], doc.stored_filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    db.session.delete(doc)
    db.session.commit()
    return '', 204
