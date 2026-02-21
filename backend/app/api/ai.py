import json
import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Application, UserProfile, ChatMessage, Document
from ..services.gemini_service import GeminiService
from ..services.pdf_service import html_to_pdf
from ..utils.auth_helpers import get_current_user_id, get_current_profile

bp = Blueprint('ai', __name__, url_prefix='/api')


def _get_gemini_service():
    # Use shared API key from environment
    api_key = current_app.config.get('GEMINI_API_KEY')
    if not api_key:
        return None, jsonify({'error': {'message': 'Gemini API key not configured.'}}), 422
    try:
        return GeminiService(api_key), None, None
    except Exception as e:
        return None, jsonify({'error': {'message': f'Failed to initialize Gemini: {str(e)}'}}), 500


def _get_profile_dict():
    return get_current_profile()


def _verify_app_ownership(app_id):
    uid = get_current_user_id()
    return Application.query.filter_by(id=app_id, user_id=uid).first_or_404()


@bp.route('/ai/parse-job-post', methods=['POST'])
@jwt_required()
def parse_job_post():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': {'message': 'Job posting text is required'}}), 400

    try:
        parsed = service.parse_job_posting(text)
        return jsonify({'parsed': parsed})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to parse job posting: {str(e)}'}}), 500


@bp.route('/ai/generate-cv', methods=['POST'])
@jwt_required()
def generate_cv():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    job_description = data.get('job_description', '').strip()
    if not job_description:
        return jsonify({'error': {'message': 'Job description is required'}}), 400

    try:
        content = service.generate_cv(
            job_description=job_description,
            current_cv=data.get('current_cv_text'),
            instructions=data.get('instructions'),
        )
        return jsonify({'content': content})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to generate CV: {str(e)}'}}), 500


@bp.route('/ai/generate-cover-letter', methods=['POST'])
@jwt_required()
def generate_cover_letter():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    if not data.get('job_description') or not data.get('company') or not data.get('role'):
        return jsonify({'error': {'message': 'job_description, company, and role are required'}}), 400

    try:
        content = service.generate_cover_letter(
            job_description=data['job_description'],
            company=data['company'],
            role=data['role'],
            instructions=data.get('instructions'),
        )
        return jsonify({'content': content})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to generate cover letter: {str(e)}'}}), 500


@bp.route('/ai/summarize-application', methods=['POST'])
@jwt_required()
def summarize_application():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    app_id = data.get('application_id')
    if not app_id:
        return jsonify({'error': {'message': 'application_id is required'}}), 400

    app = _verify_app_ownership(app_id)

    try:
        summary = service.summarize_application(app.to_dict())
        app.ai_summary = summary
        db.session.commit()
        return jsonify({'summary': summary})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to summarize: {str(e)}'}}), 500


@bp.route('/ai/improve-text', methods=['POST'])
@jwt_required()
def improve_text():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': {'message': 'Text is required'}}), 400

    try:
        content = service.improve_text(
            text=text,
            instructions=data.get('instructions'),
        )
        return jsonify({'content': content})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to improve text: {str(e)}'}}), 500


@bp.route('/ai/extract-cv-profile', methods=['POST'])
@jwt_required()
def extract_cv_profile():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': {'message': 'CV text is required'}}), 400

    try:
        profile_data = service.extract_profile_from_cv(text)
        return jsonify({'profile': profile_data})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to extract profile: {str(e)}'}}), 500


@bp.route('/ai/match-analysis', methods=['POST'])
@jwt_required()
def match_analysis():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    job_posting = data.get('job_posting', '').strip()
    if not job_posting:
        return jsonify({'error': {'message': 'Job posting text is required'}}), 400

    profile = data.get('profile') or _get_profile_dict()
    if not profile or not profile.get('full_name'):
        return jsonify({'error': {'message': 'User profile is required. Complete your profile first.'}}), 400

    try:
        analysis = service.analyze_match(job_posting, profile)
        return jsonify({'analysis': analysis})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to analyze match: {str(e)}'}}), 500


@bp.route('/ai/tailor-cv', methods=['POST'])
@jwt_required()
def tailor_cv():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    job_posting = data.get('job_posting', '').strip()
    if not job_posting:
        return jsonify({'error': {'message': 'Job posting text is required'}}), 400

    profile = data.get('profile') or _get_profile_dict()
    if not profile or not profile.get('full_name'):
        return jsonify({'error': {'message': 'User profile is required.'}}), 400

    try:
        html = service.tailor_cv_html(
            job_posting=job_posting,
            profile=profile,
            instructions=data.get('instructions'),
        )
        return jsonify({'html': html})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to tailor CV: {str(e)}'}}), 500


@bp.route('/ai/tailor-cv-template', methods=['POST'])
@jwt_required()
def tailor_cv_template():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    job_posting = data.get('job_posting', '').strip()
    if not job_posting:
        return jsonify({'error': {'message': 'Job posting text is required'}}), 400

    profile = data.get('profile') or _get_profile_dict()
    if not profile or not profile.get('full_name'):
        return jsonify({'error': {'message': 'User profile is required.'}}), 400

    template_config = data.get('template_config', {})

    try:
        html = service.tailor_cv_with_template(
            job_posting=job_posting,
            profile=profile,
            template_id=template_config.get('template_id', 'classic'),
            include_photo=template_config.get('include_photo', False),
            max_pages=template_config.get('max_pages', 1),
            skills_format=template_config.get('skills_format', 'list'),
            instructions=data.get('instructions'),
        )
        return jsonify({'html': html})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to generate CV: {str(e)}'}}), 500


@bp.route('/ai/tailor-cover-letter', methods=['POST'])
@jwt_required()
def tailor_cover_letter():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    if not data.get('job_posting') or not data.get('company') or not data.get('role'):
        return jsonify({'error': {'message': 'job_posting, company, and role are required'}}), 400

    profile = data.get('profile') or _get_profile_dict()
    if not profile or not profile.get('full_name'):
        return jsonify({'error': {'message': 'User profile is required.'}}), 400

    try:
        html = service.generate_cover_letter_html(
            job_posting=data['job_posting'],
            profile=profile,
            company=data['company'],
            role=data['role'],
            instructions=data.get('instructions'),
        )
        return jsonify({'html': html})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to generate cover letter: {str(e)}'}}), 500


@bp.route('/ai/generate-followup', methods=['POST'])
@jwt_required()
def generate_followup():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    app_id = data.get('application_id')
    if not app_id:
        return jsonify({'error': {'message': 'application_id is required'}}), 400

    app = _verify_app_ownership(app_id)
    profile = _get_profile_dict()
    if not profile.get('full_name'):
        return jsonify({'error': {'message': 'User profile is required.'}}), 400

    context_desc = data.get('context', '')

    try:
        followup = service.generate_followup(app.to_dict(), profile, context_desc)
        return jsonify({'followup': followup})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to generate follow-up: {str(e)}'}}), 500


@bp.route('/ai/interview-prep', methods=['POST'])
@jwt_required()
def interview_prep():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    app_id = data.get('application_id')
    if not app_id:
        return jsonify({'error': {'message': 'application_id is required'}}), 400

    app = _verify_app_ownership(app_id)
    profile = _get_profile_dict()
    if not profile.get('full_name'):
        return jsonify({'error': {'message': 'User profile is required.'}}), 400

    try:
        prep = service.generate_interview_prep(app.to_dict(), profile)
        return jsonify({'prep': prep})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to generate interview prep: {str(e)}'}}), 500


@bp.route('/ai/chat', methods=['POST'])
@jwt_required()
def chat():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    message = data.get('message', '').strip()
    if not message:
        return jsonify({'error': {'message': 'Message is required'}}), 400

    context = {
        'step': data.get('step', 'general'),
        'company': data.get('company', ''),
        'role': data.get('role', ''),
        'profile': data.get('profile') or _get_profile_dict(),
        'job_posting': data.get('job_posting', ''),
        'match_analysis': data.get('match_analysis'),
        'history': data.get('history', []),
    }

    try:
        response = service.chat(message, context)

        # Save messages if linked to an application
        app_id = data.get('application_id')
        if app_id:
            _verify_app_ownership(app_id)
            user_msg = ChatMessage(
                application_id=app_id,
                role='user',
                content=message,
                step=data.get('step'),
            )
            assistant_msg = ChatMessage(
                application_id=app_id,
                role='assistant',
                content=response,
                step=data.get('step'),
            )
            db.session.add(user_msg)
            db.session.add(assistant_msg)
            db.session.commit()

        return jsonify({'response': response})
    except Exception as e:
        return jsonify({'error': {'message': f'Chat failed: {str(e)}'}}), 500


@bp.route('/ai/generate-pdf', methods=['POST'])
@jwt_required()
def generate_pdf():
    data = request.get_json()
    html_content = data.get('html', '').strip()
    if not html_content:
        return jsonify({'error': {'message': 'HTML content is required'}}), 400

    doc_type = data.get('doc_type', 'cv')
    application_id = data.get('application_id')
    template_id = data.get('template_id')

    # Verify ownership if linked to application
    if application_id:
        _verify_app_ownership(application_id)

    try:
        upload_folder = current_app.config['UPLOAD_FOLDER']
        filename, filepath, file_size = html_to_pdf(html_content, upload_folder, doc_type, template_id=template_id)

        # Try to upload to Cloudinary
        cloud_url = None
        cloud_public_id = None
        try:
            from ..services.cloud_storage import upload_file_from_path
            cloud_url, cloud_public_id = upload_file_from_path(filepath, folder='pdfs')
        except Exception:
            pass  # Fallback to local

        doc = Document(
            application_id=application_id,
            filename=filename,
            stored_filename=filename,
            file_type='application/pdf',
            file_size=file_size,
            doc_category=doc_type,
            cloud_url=cloud_url,
            cloud_public_id=cloud_public_id,
        )
        db.session.add(doc)
        db.session.commit()

        return jsonify({
            'document': doc.to_dict(),
            'download_url': f'/api/documents/{doc.id}/download',
        })
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to generate PDF: {str(e)}'}}), 500
