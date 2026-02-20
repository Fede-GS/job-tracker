import json
from datetime import date
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Application, Setting, UserProfile, StatusHistory
from ..services.adzuna_service import AdzunaService
from ..services.gemini_service import GeminiService

bp = Blueprint('job_search', __name__, url_prefix='/api')


def _get_adzuna_service():
    app_id = Setting.get('adzuna_app_id')
    api_key = Setting.get('adzuna_api_key')
    if not app_id or not api_key:
        return None, jsonify({
            'error': {'message': 'Adzuna API credentials not configured. Go to Settings to add them.'}
        }), 422
    return AdzunaService(app_id, api_key), None, None


def _get_gemini_service():
    api_key = Setting.get('gemini_api_key')
    if not api_key:
        return None, jsonify({
            'error': {'message': 'Gemini API key not configured. Go to Settings to add it.'}
        }), 422
    try:
        return GeminiService(api_key), None, None
    except Exception as e:
        return None, jsonify({'error': {'message': f'Failed to initialize Gemini: {str(e)}'}}), 500


def _get_profile_dict():
    profile = UserProfile.query.first()
    return profile.to_dict() if profile else {}


@bp.route('/job-search/smart-suggestions', methods=['GET'])
def smart_suggestions():
    """Generate search queries based on user profile."""
    gemini, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    profile = _get_profile_dict()
    if not profile.get('full_name'):
        return jsonify({'error': {'message': 'Complete your profile first.'}}), 400

    # Build context from profile
    skills = profile.get('skills', [])
    experiences = profile.get('work_experiences', [])
    summary = profile.get('professional_summary', '')
    location = profile.get('location', '')

    recent_roles = [exp.get('title', '') for exp in experiences[:3] if exp.get('title')]
    skill_names = [s.get('name', '') if isinstance(s, dict) else str(s) for s in skills[:10]]

    prompt = f"""Based on this professional profile, generate 3-5 job search queries that would find the best matching positions.

Profile summary: {summary}
Recent roles: {', '.join(recent_roles)}
Key skills: {', '.join(skill_names)}
Location: {location}

Return ONLY a JSON array of objects with "query" (search term) and "location" (suggested location or empty string).
Example: [{{"query": "Senior Software Engineer", "location": "Milan"}}, {{"query": "Tech Lead Python", "location": ""}}]
Keep queries concise (2-4 words). Focus on roles that match the profile.
Return ONLY valid JSON, no markdown."""

    try:
        result = gemini._generate(prompt)
        suggestions = gemini._parse_json_response(result)
        return jsonify({'suggestions': suggestions, 'profile_location': location})
    except Exception as e:
        # Fallback: generate suggestions from profile data directly
        fallback = []
        for role in recent_roles[:3]:
            fallback.append({'query': role, 'location': location})
        if not fallback and skill_names:
            fallback.append({'query': ' '.join(skill_names[:2]), 'location': location})
        return jsonify({'suggestions': fallback, 'profile_location': location})


@bp.route('/job-search/search', methods=['GET'])
def search_jobs():
    service, error_response, status = _get_adzuna_service()
    if error_response:
        return error_response, status

    q = request.args.get('q', '').strip()
    location = request.args.get('location', '').strip()
    country = request.args.get('country', 'it').strip()
    page = request.args.get('page', 1, type=int)

    if not q:
        return jsonify({'error': {'message': 'Search query (q) is required'}}), 400

    try:
        results = service.search_jobs(
            query=q,
            location=location,
            country=country,
            page=page,
            per_page=15,
        )
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': {'message': f'Search failed: {str(e)}'}}), 500


@bp.route('/job-search/analyze-match', methods=['POST'])
def analyze_match():
    gemini, error_response, status = _get_gemini_service()
    if error_response:
        return error_response, status

    data = request.get_json()
    job_description = data.get('job_description', '').strip()
    job_title = data.get('job_title', '')
    company = data.get('company', '')

    if not job_description:
        return jsonify({'error': {'message': 'Job description is required'}}), 400

    profile = _get_profile_dict()
    if not profile.get('full_name'):
        return jsonify({'error': {'message': 'User profile not found. Complete your profile first.'}}), 400

    job_posting_text = f"Role: {job_title}\nCompany: {company}\n\n{job_description}"

    try:
        analysis = gemini.analyze_match(job_posting_text, profile)
        return jsonify({'analysis': analysis})
    except Exception as e:
        return jsonify({'error': {'message': f'Match analysis failed: {str(e)}'}}), 500


@bp.route('/job-search/save-application', methods=['POST'])
def save_application():
    data = request.get_json()
    if not data:
        return jsonify({'error': {'message': 'Request body is required'}}), 400

    title = data.get('title', '')
    company = data.get('company', '')

    if not title or not company:
        return jsonify({'error': {'message': 'Title and company are required'}}), 400

    # Build job posting text from Adzuna data
    job_posting_text = data.get('description', '')

    # Parse match analysis if provided
    match_analysis = data.get('match_analysis')
    match_score = None
    if match_analysis:
        match_score = match_analysis.get('match_score')
        match_analysis = json.dumps(match_analysis)

    # Convert salary to int (Adzuna sends floats)
    salary_min = data.get('salary_min')
    salary_max = data.get('salary_max')
    if salary_min is not None:
        salary_min = int(round(salary_min))
    if salary_max is not None:
        salary_max = int(round(salary_max))

    try:
        application = Application(
            company=company,
            role=title,
            location=data.get('location', ''),
            url=data.get('url', ''),
            status='draft',
            applied_date=date.today(),
            job_posting_text=job_posting_text,
            job_description=data.get('description', '')[:500] if data.get('description') else '',
            salary_min=salary_min,
            salary_max=salary_max,
            match_score=match_score,
            match_analysis=match_analysis,
        )

        db.session.add(application)
        db.session.flush()

        # Create initial status history
        history = StatusHistory(
            application_id=application.id,
            from_status=None,
            to_status='draft',
            note='Created from job search',
        )
        db.session.add(history)
        db.session.commit()

        return jsonify({'application': application.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': {'message': f'Failed to save application: {str(e)}'}}), 500
