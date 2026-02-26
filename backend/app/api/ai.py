import json
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import (
    Application, Setting, UserProfile, ChatMessage, Document,
    CareerConsultantSession, CareerConsultantMessage, User, UserAIInsight
)
from ..services.gemini_service import GeminiService
from ..services.blackbox_service import BlackboxService
from ..services.pdf_service import html_to_pdf
from ..services.scraper_service import ScraperService

bp = Blueprint('ai', __name__, url_prefix='/api')


# ── Helpers ────────────────────────────────────────────────────────────────────

def _current_user_id():
    try:
        return int(get_jwt_identity())
    except Exception:
        return None


def _get_gemini_service():
    api_key = Setting.get('gemini_api_key')
    if not api_key:
        return None, jsonify({'error': {'message': 'Gemini API key not configured. Go to Settings to add it.'}}), 422
    try:
        return GeminiService(api_key), None, None
    except Exception as e:
        return None, jsonify({'error': {'message': f'Failed to initialize Gemini: {str(e)}'}}), 500


def _get_blackbox_service():
    """Get Blackbox AI service. Works without API key (free tier) or with key for premium."""
    api_key = Setting.get('blackbox_api_key')
    try:
        return BlackboxService(api_key), None, None
    except Exception as e:
        return None, jsonify({'error': {'message': f'Failed to initialize Blackbox AI: {str(e)}'}}), 500


def _get_blackbox_history_service():
    """Get Blackbox AI service using the hardcoded history analysis API key."""
    api_key = current_app.config.get('BLACKBOX_HISTORY_API_KEY', 'sk-PfFX1Lb7KS3Ec8XnoIPafQ')
    return BlackboxService(api_key)


def _get_ai_service_for_consultant():
    """Get the best available AI service for career consultant."""
    ai_provider = Setting.get('ai_provider', 'auto')

    if ai_provider == 'blackbox':
        service, error, status = _get_blackbox_service()
        if not error:
            return service, 'blackbox', None, None
        service, error, status = _get_gemini_service()
        if not error:
            return service, 'gemini', None, None
        return None, None, error, status

    elif ai_provider == 'gemini':
        service, error, status = _get_gemini_service()
        if not error:
            return service, 'gemini', None, None
        return None, None, error, status

    else:  # 'auto'
        blackbox_key = Setting.get('blackbox_api_key')
        if blackbox_key:
            service, error, status = _get_blackbox_service()
            if not error:
                return service, 'blackbox', None, None

        service, error, status = _get_gemini_service()
        if not error:
            return service, 'gemini', None, None

        service, error, status = _get_blackbox_service()
        if not error:
            return service, 'blackbox', None, None

        return None, None, jsonify({'error': {'message': 'No AI service configured. Go to Settings to add a Gemini or Blackbox API key.'}}), 422


def _get_profile_dict(user_id=None):
    if user_id:
        profile = UserProfile.query.filter_by(user_id=user_id).first()
    else:
        profile = UserProfile.query.first()
    return profile.to_dict() if profile else {}


# ── AI History Analysis ────────────────────────────────────────────────────────

@bp.route('/ai/history-analysis', methods=['GET'])
@jwt_required()
def get_history_analysis():
    """Get cached AI analysis of user's application history."""
    user_id = _current_user_id()

    insight = UserAIInsight.query.filter_by(user_id=user_id).first()
    if not insight:
        return jsonify({'insight': None, 'needs_refresh': True})

    return jsonify({
        'insight': insight.to_dict(),
        'needs_refresh': False,
    })


@bp.route('/ai/history-analysis/refresh', methods=['POST'])
@jwt_required()
def refresh_history_analysis():
    """Force-refresh AI analysis of user's application history using Blackbox AI."""
    user_id = _current_user_id()

    # Get all user's applications
    applications = Application.query.filter_by(user_id=user_id).order_by(Application.applied_date.desc()).all()
    profile = _get_profile_dict(user_id)

    apps_data = [a.to_dict() for a in applications]

    try:
        service = _get_blackbox_history_service()
        analysis = service.analyze_application_history(apps_data, profile)

        # Cache the result
        insight = UserAIInsight.query.filter_by(user_id=user_id).first()
        if not insight:
            insight = UserAIInsight(user_id=user_id)
            db.session.add(insight)

        insight.insight_data = json.dumps(analysis, ensure_ascii=False)
        insight.last_updated = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({'insight': insight.to_dict()})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to analyze history: {str(e)}'}}), 500


# ── Job Post Parsing ───────────────────────────────────────────────────────────

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


@bp.route('/ai/scrape-job-url', methods=['POST'])
@jwt_required()
def scrape_job_url():
    data = request.get_json()
    url = (data.get('url') or '').strip()
    if not url:
        return jsonify({'error': {'message': 'URL is required'}}), 400

    scraper = ScraperService()
    try:
        scraped = scraper.scrape_job_posting(url)
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 422

    extracted_text = scraped.get('text', '')
    if not extracted_text or len(extracted_text.strip()) < 50:
        return jsonify({'error': {'message': 'Could not extract enough content from this URL. Try copying the job posting text manually.'}}), 422

    parsed = None
    try:
        service, error_response, status = _get_gemini_service()
        if not error_response:
            parsed = service.parse_job_posting(extracted_text)
    except Exception:
        pass

    return jsonify({
        'text': extracted_text,
        'parsed': parsed,
        'metadata': {
            'url': scraped.get('url', url),
            'domain': scraped.get('domain', ''),
            'page_title': scraped.get('page_title', ''),
            'extracted_title': scraped.get('extracted_title'),
            'extracted_company': scraped.get('extracted_company'),
            'extracted_location': scraped.get('extracted_location'),
        }
    })


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

    user_id = _current_user_id()
    app = Application.query.filter_by(id=app_id, user_id=user_id).first_or_404()

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

    user_id = _current_user_id()
    profile = data.get('profile') or _get_profile_dict(user_id)
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

    user_id = _current_user_id()
    profile = data.get('profile') or _get_profile_dict(user_id)
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

    user_id = _current_user_id()
    profile = data.get('profile') or _get_profile_dict(user_id)
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

    user_id = _current_user_id()
    profile = data.get('profile') or _get_profile_dict(user_id)
    if not profile or not profile.get('full_name'):
        return jsonify({'error': {'message': 'User profile is required.'}}), 400

    try:
        html = service.generate_cover_letter_html(
            job_posting=data['job_posting'],
            profile=profile,
            company=data['company'],
            role=data['role'],
            instructions=data.get('instructions'),
            length=data.get('length', 'medium'),
        )
        return jsonify({'html': html})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to generate cover letter: {str(e)}'}}), 500


@bp.route('/ai/extract-apply-method', methods=['POST'])
@jwt_required()
def extract_apply_method():
    service, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    job_posting = data.get('job_posting', '').strip()
    if not job_posting:
        return jsonify({'error': {'message': 'Job posting text is required'}}), 400

    try:
        result = service.extract_application_method(job_posting)
        return jsonify({'apply_method': result})
    except Exception as e:
        return jsonify({'error': {'message': f'Failed to extract application method: {str(e)}'}}), 500


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

    user_id = _current_user_id()
    app = Application.query.filter_by(id=app_id, user_id=user_id).first_or_404()
    profile = _get_profile_dict(user_id)
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

    user_id = _current_user_id()
    app = Application.query.filter_by(id=app_id, user_id=user_id).first_or_404()
    profile = _get_profile_dict(user_id)
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

    user_id = _current_user_id()
    context = {
        'step': data.get('step', 'general'),
        'company': data.get('company', ''),
        'role': data.get('role', ''),
        'profile': data.get('profile') or _get_profile_dict(user_id),
        'job_posting': data.get('job_posting', ''),
        'match_analysis': data.get('match_analysis'),
        'history': data.get('history', []),
    }

    try:
        response = service.chat(message, context)

        app_id = data.get('application_id')
        if app_id:
            user_msg = ChatMessage(
                user_id=user_id,
                application_id=app_id,
                role='user',
                content=message,
                step=data.get('step'),
            )
            assistant_msg = ChatMessage(
                user_id=user_id,
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


# ── Career Consultant ──────────────────────────────────────────────────────────

@bp.route('/ai/career-consultant/chat', methods=['POST'])
@jwt_required()
def career_consultant_chat():
    service, provider, error_response, status = _get_ai_service_for_consultant()
    if error_response:
        return error_response, status

    data = request.get_json()
    message = data.get('message', '').strip()
    if not message:
        return jsonify({'error': {'message': 'Message is required'}}), 400

    user_id = _current_user_id()
    context = {
        'profile': data.get('profile') or _get_profile_dict(user_id),
        'topic': data.get('topic', 'general'),
        'history': data.get('history', []),
    }

    app_id = data.get('application_id')
    if app_id:
        app = Application.query.filter_by(id=app_id, user_id=user_id).first()
        if app:
            context['application'] = app.to_dict()

    try:
        response = service.career_consultant_chat(message, context)

        session_id = data.get('session_id')
        if session_id:
            session = CareerConsultantSession.query.filter_by(id=session_id, user_id=user_id).first()
            if session:
                user_msg = CareerConsultantMessage(session_id=session_id, role='user', content=message)
                assistant_msg = CareerConsultantMessage(session_id=session_id, role='assistant', content=response)
                db.session.add(user_msg)
                db.session.add(assistant_msg)
                db.session.commit()

        return jsonify({'response': response, 'provider': provider})
    except Exception as e:
        if provider == 'blackbox':
            try:
                fallback_service, fb_error, fb_status = _get_gemini_service()
                if not fb_error:
                    response = fallback_service.career_consultant_chat(message, context)
                    return jsonify({'response': response, 'provider': 'gemini'})
            except Exception:
                pass
        elif provider == 'gemini':
            try:
                fallback_service, fb_error, fb_status = _get_blackbox_service()
                if not fb_error:
                    response = fallback_service.career_consultant_chat(message, context)
                    return jsonify({'response': response, 'provider': 'blackbox'})
            except Exception:
                pass

        return jsonify({'error': {'message': f'Career consultant chat failed: {str(e)}'}}), 500


@bp.route('/ai/career-consultant/sessions', methods=['GET'])
@jwt_required()
def get_consultant_sessions():
    user_id = _current_user_id()
    app_id = request.args.get('application_id')
    query = CareerConsultantSession.query.filter_by(user_id=user_id).order_by(CareerConsultantSession.updated_at.desc())
    if app_id:
        query = query.filter_by(application_id=int(app_id))
    sessions = query.all()
    return jsonify({'sessions': [s.to_dict() for s in sessions]})


@bp.route('/ai/career-consultant/sessions', methods=['POST'])
@jwt_required()
def create_consultant_session():
    user_id = _current_user_id()
    data = request.get_json()
    session = CareerConsultantSession(
        user_id=user_id,
        application_id=data.get('application_id'),
        title=data.get('title', 'New Session'),
        topic=data.get('topic', 'general'),
    )
    db.session.add(session)
    db.session.commit()
    return jsonify({'session': session.to_dict()}), 201


@bp.route('/ai/career-consultant/sessions/<int:session_id>', methods=['GET'])
@jwt_required()
def get_consultant_session(session_id):
    user_id = _current_user_id()
    session = CareerConsultantSession.query.filter_by(id=session_id, user_id=user_id).first_or_404()
    return jsonify({'session': session.to_dict()})


@bp.route('/ai/career-consultant/sessions/<int:session_id>', methods=['DELETE'])
@jwt_required()
def delete_consultant_session(session_id):
    user_id = _current_user_id()
    session = CareerConsultantSession.query.filter_by(id=session_id, user_id=user_id).first_or_404()
    db.session.delete(session)
    db.session.commit()
    return jsonify({'message': 'Session deleted'})


@bp.route('/ai/career-consultant/sessions/<int:session_id>/assign', methods=['POST'])
@jwt_required()
def assign_session_to_application(session_id):
    user_id = _current_user_id()
    session = CareerConsultantSession.query.filter_by(id=session_id, user_id=user_id).first_or_404()
    data = request.get_json()
    app_id = data.get('application_id')
    if not app_id:
        return jsonify({'error': {'message': 'application_id is required'}}), 400

    app = Application.query.filter_by(id=app_id, user_id=user_id).first_or_404()
    session.application_id = app_id

    if session.messages:
        service, error_response, status = _get_gemini_service()
        if not error_response:
            try:
                conversation = '\n'.join([f"{m.role}: {m.content}" for m in session.messages])
                summary = service.career_consultant_summarize(conversation, app.company, app.role)
                session.summary = summary
            except Exception:
                pass

    db.session.commit()
    return jsonify({'session': session.to_dict()})


@bp.route('/ai/generate-pdf', methods=['POST'])
@jwt_required()
def generate_pdf():
    data = request.get_json()
    html_content = data.get('html', '').strip()
    if not html_content:
        return jsonify({'error': {'message': 'HTML content is required'}}), 400

    user_id = _current_user_id()
    doc_type = data.get('doc_type', 'cv')
    application_id = data.get('application_id')
    template_id = data.get('template_id')

    try:
        upload_folder = current_app.config['UPLOAD_FOLDER']
        filename, filepath, file_size = html_to_pdf(html_content, upload_folder, doc_type, template_id=template_id)

        doc = Document(
            user_id=user_id,
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
