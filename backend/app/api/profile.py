import os
import json
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models import UserProfile
from ..services.pdf_service import extract_text_from_pdf

bp = Blueprint('profile', __name__, url_prefix='/api')


def _get_or_create_profile():
    profile = UserProfile.query.first()
    if not profile:
        profile = UserProfile()
        db.session.add(profile)
        db.session.commit()
    return profile


@bp.route('/profile', methods=['GET'])
def get_profile():
    profile = _get_or_create_profile()
    return jsonify({'profile': profile.to_dict()})


@bp.route('/profile', methods=['PUT'])
def update_profile():
    profile = _get_or_create_profile()
    data = request.get_json()
    if not data:
        return jsonify({'error': {'message': 'Request body is required'}}), 400

    simple_fields = ['full_name', 'email', 'phone', 'location',
                     'linkedin_url', 'portfolio_url', 'professional_summary']
    for field in simple_fields:
        if field in data:
            setattr(profile, field, data[field])

    json_fields = ['work_experiences', 'education', 'skills', 'languages', 'certifications']
    for field in json_fields:
        if field in data:
            val = data[field]
            if isinstance(val, (list, dict)):
                setattr(profile, field, json.dumps(val))
            else:
                setattr(profile, field, val)

    db.session.commit()
    return jsonify({'profile': profile.to_dict()})


@bp.route('/profile/upload-cv', methods=['POST'])
def upload_cv():
    if 'file' not in request.files:
        return jsonify({'error': {'message': 'No file provided'}}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': {'message': 'No file selected'}}), 400

    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': {'message': 'Only PDF files are supported'}}), 400

    filename = secure_filename(file.filename)
    upload_folder = current_app.config['UPLOAD_FOLDER']
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)

    try:
        text = extract_text_from_pdf(filepath)
        if not text.strip():
            return jsonify({'error': {'message': 'Could not extract text from PDF'}}), 400

        return jsonify({
            'extracted_text': text,
            'message': 'PDF text extracted successfully. Use /api/ai/extract-cv-profile to parse it.'
        })
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to extract PDF text: {str(e)}'}}), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


@bp.route('/profile/onboarding-status', methods=['GET'])
def onboarding_status():
    profile = _get_or_create_profile()
    return jsonify({'completed': profile.onboarding_completed})


@bp.route('/profile/complete-onboarding', methods=['POST'])
def complete_onboarding():
    profile = _get_or_create_profile()
    profile.onboarding_completed = True
    db.session.commit()
    return jsonify({'completed': True})
