import os
import json
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models import UserProfile
from ..services.pdf_service import extract_text_from_pdf
from ..services.scraper_service import ScraperService
from ..services.blackbox_service import BlackboxService

bp = Blueprint('profile', __name__, url_prefix='/api')


def _current_user_id():
    try:
        return int(get_jwt_identity())
    except Exception:
        return None


def _get_or_create_profile(user_id=None):
    if user_id:
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not profile:
            profile = UserProfile(user_id=user_id)
            db.session.add(profile)
            db.session.commit()
    else:
        profile = UserProfile.query.first()
        if not profile:
            profile = UserProfile()
            db.session.add(profile)
            db.session.commit()
    return profile


@bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = _current_user_id()
    profile = _get_or_create_profile(user_id)
    return jsonify({'profile': profile.to_dict()})


@bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = _current_user_id()
    profile = _get_or_create_profile(user_id)
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

    if 'setup_method' in data:
        profile.setup_method = data['setup_method']

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


@bp.route('/profile/import-linkedin', methods=['POST'])
@jwt_required()
def import_linkedin():
    """
    Import profile from LinkedIn.
    Accepts either:
    - { "url": "https://linkedin.com/in/..." } — tries to scrape the page
    - { "text": "...pasted LinkedIn profile text..." } — parses directly
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': {'message': 'Request body is required'}}), 400

    linkedin_text = (data.get('text') or '').strip()
    linkedin_url = (data.get('url') or '').strip()

    if not linkedin_text and not linkedin_url:
        return jsonify({'error': {'message': 'Either "url" or "text" is required'}}), 400

    # If URL provided, try to scrape it
    if linkedin_url and not linkedin_text:
        scraper = ScraperService()
        try:
            scraped = scraper.scrape_job_posting(linkedin_url)
            linkedin_text = scraped.get('text', '')
        except Exception as e:
            return jsonify({
                'error': {'message': f'Could not scrape LinkedIn URL: {str(e)}. Please paste your profile text instead.'},
                'fallback': 'paste_text',
            }), 422

        if not linkedin_text or len(linkedin_text.strip()) < 50:
            return jsonify({
                'error': {'message': 'Could not extract enough content from LinkedIn. Please paste your profile text instead.'},
                'fallback': 'paste_text',
            }), 422

    # Use Blackbox AI to extract profile from text
    api_key = current_app.config.get('BLACKBOX_HISTORY_API_KEY', 'sk-PfFX1Lb7KS3Ec8XnoIPafQ')
    service = BlackboxService(api_key)

    try:
        profile_data = service.extract_linkedin_profile(linkedin_text)
        # Set linkedin_url if provided
        if linkedin_url and not profile_data.get('linkedin_url'):
            profile_data['linkedin_url'] = linkedin_url
        return jsonify({'profile': profile_data})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to extract profile from LinkedIn: {str(e)}'}}), 500


@bp.route('/profile/onboarding-status', methods=['GET'])
@jwt_required()
def onboarding_status():
    user_id = _current_user_id()
    profile = _get_or_create_profile(user_id)
    return jsonify({'completed': profile.onboarding_completed})


@bp.route('/profile/complete-onboarding', methods=['POST'])
@jwt_required()
def complete_onboarding():
    user_id = _current_user_id()
    profile = _get_or_create_profile(user_id)
    profile.onboarding_completed = True
    db.session.commit()
    return jsonify({'completed': True})
