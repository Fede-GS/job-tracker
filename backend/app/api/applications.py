import json
import calendar
from datetime import date, datetime
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Application, StatusHistory, InterviewEvent

bp = Blueprint('applications', __name__, url_prefix='/api')


@bp.route('/applications', methods=['GET'])
def list_applications():
    query = Application.query

    status = request.args.get('status')
    if status:
        query = query.filter(Application.status == status)

    search = request.args.get('search')
    if search:
        term = f'%{search}%'
        query = query.filter(
            db.or_(Application.company.ilike(term), Application.role.ilike(term))
        )

    sort_by = request.args.get('sort_by', 'applied_date')
    order = request.args.get('order', 'desc')
    sort_column = getattr(Application, sort_by, Application.applied_date)
    if order == 'asc':
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'applications': [a.to_dict() for a in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@bp.route('/applications/calendar', methods=['GET'])
def calendar_applications():
    year = request.args.get('year', date.today().year, type=int)
    month = request.args.get('month', date.today().month, type=int)

    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])

    query = Application.query.filter(
        Application.applied_date >= first_day,
        Application.applied_date <= last_day,
    )

    status = request.args.get('status')
    if status:
        query = query.filter(Application.status == status)

    query = query.order_by(Application.applied_date.asc())
    apps = query.all()

    # Fetch interview events for this month
    interview_query = InterviewEvent.query.filter(
        InterviewEvent.interview_date >= datetime(year, month, 1),
        InterviewEvent.interview_date <= datetime(year, month, calendar.monthrange(year, month)[1], 23, 59, 59),
    ).order_by(InterviewEvent.interview_date.asc())
    interviews = interview_query.all()

    return jsonify({
        'applications': [{
            'id': a.id,
            'company': a.company,
            'role': a.role,
            'status': a.status,
            'applied_date': a.applied_date.isoformat() if a.applied_date else None,
            'location': a.location,
            'deadline': a.deadline.isoformat() if a.deadline else None,
        } for a in apps],
        'interviews': [ie.to_dict() for ie in interviews],
        'month': month,
        'year': year,
    })


@bp.route('/applications/<int:app_id>', methods=['GET'])
def get_application(app_id):
    app = db.get_or_404(Application, app_id)
    data = app.to_dict()
    data['documents'] = [d.to_dict() for d in app.documents]
    data['reminders'] = [r.to_dict() for r in app.reminders]
    data['status_history'] = [h.to_dict() for h in app.status_history]
    data['chat_messages'] = [m.to_dict() for m in app.chat_messages]
    data['interview_events'] = [ie.to_dict() for ie in app.interview_events]
    return jsonify({'application': data})


@bp.route('/applications', methods=['POST'])
def create_application():
    data = request.get_json()
    if not data:
        return jsonify({'error': {'message': 'Request body is required'}}), 400
    if not data.get('company') or not data.get('role'):
        return jsonify({'error': {'message': 'Company and role are required'}}), 400

    applied = data.get('applied_date')
    applied_date = date.fromisoformat(applied) if applied else date.today()

    deadline = data.get('deadline')
    deadline_date = date.fromisoformat(deadline) if deadline else None

    match_analysis = data.get('match_analysis')
    if match_analysis and isinstance(match_analysis, (dict, list)):
        match_analysis = json.dumps(match_analysis)

    app = Application(
        company=data['company'],
        role=data['role'],
        location=data.get('location'),
        status=data.get('status', 'draft'),
        salary_min=data.get('salary_min'),
        salary_max=data.get('salary_max'),
        salary_currency=data.get('salary_currency', 'EUR'),
        url=data.get('url'),
        job_description=data.get('job_description'),
        requirements=data.get('requirements'),
        notes=data.get('notes'),
        applied_date=applied_date,
        deadline=deadline_date,
        match_score=data.get('match_score'),
        match_analysis=match_analysis,
        job_posting_text=data.get('job_posting_text'),
        generated_cv_html=data.get('generated_cv_html'),
        generated_cover_letter_html=data.get('generated_cover_letter_html'),
    )
    db.session.add(app)
    db.session.flush()

    history = StatusHistory(
        application_id=app.id,
        from_status=None,
        to_status=app.status,
    )
    db.session.add(history)
    db.session.commit()

    return jsonify({'application': app.to_dict()}), 201


@bp.route('/applications/<int:app_id>', methods=['PUT'])
def update_application(app_id):
    app = db.get_or_404(Application, app_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': {'message': 'Request body is required'}}), 400

    fields = ['company', 'role', 'location', 'salary_min', 'salary_max',
              'salary_currency', 'url', 'job_description', 'requirements', 'notes',
              'match_score', 'job_posting_text', 'generated_cv_html', 'generated_cover_letter_html']
    for field in fields:
        if field in data:
            setattr(app, field, data[field])

    if 'match_analysis' in data:
        val = data['match_analysis']
        if isinstance(val, (dict, list)):
            app.match_analysis = json.dumps(val)
        else:
            app.match_analysis = val

    if 'applied_date' in data and data['applied_date']:
        app.applied_date = date.fromisoformat(data['applied_date'])
    if 'response_date' in data:
        app.response_date = date.fromisoformat(data['response_date']) if data['response_date'] else None
    if 'deadline' in data:
        app.deadline = date.fromisoformat(data['deadline']) if data['deadline'] else None

    app.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'application': app.to_dict()})


@bp.route('/applications/<int:app_id>', methods=['DELETE'])
def delete_application(app_id):
    app = db.get_or_404(Application, app_id)
    db.session.delete(app)
    db.session.commit()
    return '', 204


@bp.route('/applications/<int:app_id>/status', methods=['PATCH'])
def change_status(app_id):
    app = db.get_or_404(Application, app_id)
    data = request.get_json()
    new_status = data.get('status')

    if new_status not in Application.VALID_STATUSES:
        return jsonify({'error': {'message': f'Invalid status. Must be one of: {Application.VALID_STATUSES}'}}), 400

    old_status = app.status
    app.status = new_status
    app.updated_at = datetime.utcnow()

    if new_status != 'sent' and old_status == 'sent':
        app.response_date = date.today()

    history = StatusHistory(
        application_id=app.id,
        from_status=old_status,
        to_status=new_status,
        note=data.get('note'),
    )
    db.session.add(history)
    db.session.commit()

    result = app.to_dict()
    result['status_history'] = [h.to_dict() for h in app.status_history]
    return jsonify({'application': result})
