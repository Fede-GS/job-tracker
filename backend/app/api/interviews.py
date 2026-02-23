from datetime import datetime
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Application, InterviewEvent

bp = Blueprint('interviews', __name__, url_prefix='/api')


@bp.route('/applications/<int:app_id>/interviews', methods=['GET'])
def list_interviews(app_id):
    app = db.get_or_404(Application, app_id)
    return jsonify({
        'interviews': [ie.to_dict() for ie in app.interview_events],
    })


@bp.route('/applications/<int:app_id>/interviews', methods=['POST'])
def create_interview(app_id):
    app = db.get_or_404(Application, app_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': {'message': 'Request body is required'}}), 400

    interview_date = data.get('interview_date')
    if not interview_date:
        return jsonify({'error': {'message': 'Interview date is required'}}), 400

    try:
        dt = datetime.fromisoformat(interview_date)
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
def update_interview(app_id, interview_id):
    db.get_or_404(Application, app_id)
    interview = db.get_or_404(InterviewEvent, interview_id)

    if interview.application_id != app_id:
        return jsonify({'error': {'message': 'Interview not found for this application'}}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': {'message': 'Request body is required'}}), 400

    if 'interview_date' in data and data['interview_date']:
        try:
            interview.interview_date = datetime.fromisoformat(data['interview_date'])
        except (ValueError, TypeError):
            return jsonify({'error': {'message': 'Invalid date format'}}), 400

    for field in ['interview_type', 'phase_number', 'location', 'notes', 'outcome', 'salary_offered']:
        if field in data:
            setattr(interview, field, data[field])

    interview.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'interview': interview.to_dict()})


@bp.route('/applications/<int:app_id>/interviews/<int:interview_id>', methods=['DELETE'])
def delete_interview(app_id, interview_id):
    db.get_or_404(Application, app_id)
    interview = db.get_or_404(InterviewEvent, interview_id)

    if interview.application_id != app_id:
        return jsonify({'error': {'message': 'Interview not found for this application'}}), 404

    db.session.delete(interview)
    db.session.commit()
    return '', 204
