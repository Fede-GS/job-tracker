import json
from flask import Blueprint, request, jsonify, current_app
from ..extensions import db
from ..models import Application, Setting, UserProfile, ChatMessage, Document
from ..services.gemini_service import GeminiService
from ..services.pdf_service import html_to_pdf

bp = Blueprint('ai', __name__, url_prefix='/api')


def _get_gemini_service():
    api_key = Setting.get('gemini_api_key')
    if not api_key:
        return None, jsonify({'error': {'message': 'Gemini API key not configured. Go to Settings to add it.'}}), 422
    try:
        return GeminiService(api_key), None, None
    except Exception as e:
        return None, jsonify({'error': {'message': f'Failed to initialize Gemini: {str(e)}'}}), 500


def _get_profile_dict():
    profile = UserProfile.query.first()
    return profile.to_dict() if profile else {}


@bp.route('/ai/parse-job-post', methods=['POST'])
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
def summarize_application():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    app_id = data.get('application_id')
    if not app_id:
        return jsonify({'error': {'message': 'application_id is required'}}), 400

    app = db.get_or_404(Application, app_id)

    try:
        summary = service.summarize_application(app.to_dict())
        app.ai_summary = summary
        db.session.commit()
        return jsonify({'summary': summary})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to summarize: {str(e)}'}}), 500


@bp.route('/ai/improve-text', methods=['POST'])
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


@bp.route('/ai/tailor-cover-letter', methods=['POST'])
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
def generate_followup():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    app_id = data.get('application_id')
    if not app_id:
        return jsonify({'error': {'message': 'application_id is required'}}), 400

    app = db.get_or_404(Application, app_id)
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
def interview_prep():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    app_id = data.get('application_id')
    if not app_id:
        return jsonify({'error': {'message': 'application_id is required'}}), 400

    app = db.get_or_404(Application, app_id)
    profile = _get_profile_dict()
    if not profile.get('full_name'):
        return jsonify({'error': {'message': 'User profile is required.'}}), 400

    try:
        prep = service.generate_interview_prep(app.to_dict(), profile)
        return jsonify({'prep': prep})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to generate interview prep: {str(e)}'}}), 500


@bp.route('/ai/chat', methods=['POST'])
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
def generate_pdf():
    data = request.get_json()
    html_content = data.get('html', '').strip()
    if not html_content:
        return jsonify({'error': {'message': 'HTML content is required'}}), 400

    doc_type = data.get('doc_type', 'cv')
    application_id = data.get('application_id')

    try:
        upload_folder = current_app.config['UPLOAD_FOLDER']
        filename, filepath, file_size = html_to_pdf(html_content, upload_folder, doc_type)

        # Save as document if linked to application
        doc = Document(
            application_id=application_id,
            filename=filename,
            stored_filename=filename,
            file_type='application/pdf',
            file_size=file_size,
            doc_category=doc_type,
        )
        db.session.add(doc)
        db.session.commit()

        return jsonify({
            'document': doc.to_dict(),
            'download_url': f'/api/documents/{doc.id}/download',
        })
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to generate PDF: {str(e)}'}}), 500
