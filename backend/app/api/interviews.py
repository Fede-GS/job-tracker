from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Application, InterviewEvent


def _parse_iso_datetime(value):
    """Parse ISO datetime string, handling 'Z' suffix for Python < 3.11."""
    if isinstance(value, str):
        value = value.replace('Z', '+00:00')
    return datetime.fromisoformat(value)


def _current_user_id():
    try:
        return int(get_jwt_identity())
    except Exception:
        return None


bp = Blueprint('interviews', __name__, url_prefix='/api')


@bp.route('/applications/<int:app_id>/interviews', methods=['GET'])
@jwt_required()
def list_interviews(app_id):
    user_id = _current_user_id()
    app = Application.query.filter_by(id=app_id, user_id=user_id).first_or_404()
    return jsonify({'interviews': [ie.to_dict() for ie in app.interview_events]})


@bp.route('/applications/<int:app_id>/interviews', methods=['POST'])
@jwt_required()
def create_interview(app_id):
    user_id = _current_user_id()
    app = Application.query.filter_by(id=app_id, user_id=user_id).first_or_404()
    data = request.get_json()
    if not data:
        return jsonify({'error': {'message': 'Request body is required'}}), 400

    interview_date = data.get('interview_date')
    if not interview_date:
        return jsonify({'error': {'message': 'Interview date is required'}}), 400

    try:
        dt = _parse_iso_datetime(interview_date)
    except (ValueError, TypeError):
        return jsonify({'error': {'message': 'Invalid date format'}}), 400

    interview = InterviewEvent(
        application_id=app.id,
        interview_date=dt,
        interview_type=data.get('interview_type', 'other'),
        phase_number=data.get('phase_number', 1),
        location=data.get('location', ''),
        notes=data.get('notes', ''),
        outcome=data.get('outcome', 'pending'),
        salary_offered=data.get('salary_offered', ''),
    )
    db.session.add(interview)
    db.session.commit()

    return jsonify({'interview': interview.to_dict()}), 201


@bp.route('/applications/<int:app_id>/interviews/<int:interview_id>', methods=['PUT'])
@jwt_required()
def update_interview(app_id, interview_id):
    user_id = _current_user_id()
    Application.query.filter_by(id=app_id, user_id=user_id).first_or_404()
    interview = InterviewEvent.query.filter_by(id=interview_id, application_id=app_id).first_or_404()

    data = request.get_json()
    if not data:
        return jsonify({'error': {'message': 'Request body is required'}}), 400

    if 'interview_date' in data and data['interview_date']:
        try:
            interview.interview_date = _parse_iso_datetime(data['interview_date'])
        except (ValueError, TypeError):
            return jsonify({'error': {'message': 'Invalid date format'}}), 400

    for field in ['interview_type', 'phase_number', 'location', 'notes', 'outcome', 'salary_offered']:
        if field in data:
            setattr(interview, field, data[field])

    interview.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({'interview': interview.to_dict()})


@bp.route('/applications/<int:app_id>/interviews/<int:interview_id>', methods=['DELETE'])
@jwt_required()
def delete_interview(app_id, interview_id):
    user_id = _current_user_id()
    Application.query.filter_by(id=app_id, user_id=user_id).first_or_404()
    interview = InterviewEvent.query.filter_by(id=interview_id, application_id=app_id).first_or_404()
    db.session.delete(interview)
    db.session.commit()
    return '', 204
