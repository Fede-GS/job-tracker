import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import UserProfile
from ..services.pdf_service import extract_text_from_pdf
from ..utils.auth_helpers import get_current_user_id

bp = Blueprint('profile', __name__, url_prefix='/api')


def _get_or_create_profile():
    uid = get_current_user_id()
    profile = UserProfile.query.filter_by(user_id=uid).first()
    if not profile:
        profile = UserProfile(user_id=uid)
        db.session.add(profile)
        db.session.commit()
    return profile


@bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    profile = _get_or_create_profile()
    return jsonify({'profile': profile.to_dict()})


@bp.route('/profile', methods=['PUT'])
@jwt_required()
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
@jwt_required()
def upload_cv():
    if 'file' not in request.files:
        return jsonify({'error': {'message': 'No file provided'}}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': {'message': 'No file selected'}}), 400

    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': {'message': 'Only PDF files are supported'}}), 400

    try:
        # Extract text directly from file stream (no disk save needed)
        file.seek(0)
        text = extract_text_from_pdf(file)
        if not text.strip():
            return jsonify({'error': {'message': 'Could not extract text from PDF'}}), 400

        return jsonify({
            'extracted_text': text,
            'message': 'PDF text extracted successfully. Use /api/ai/extract-cv-profile to parse it.'
        })
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to extract PDF text: {str(e)}'}}), 500


@bp.route('/profile/onboarding-status', methods=['GET'])
@jwt_required()
def onboarding_status():
    profile = _get_or_create_profile()
    return jsonify({'completed': profile.onboarding_completed})


@bp.route('/profile/complete-onboarding', methods=['POST'])
@jwt_required()
def complete_onboarding():
    profile = _get_or_create_profile()
    profile.onboarding_completed = True
    db.session.commit()
    return jsonify({'completed': True})
