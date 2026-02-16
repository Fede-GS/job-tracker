from datetime import datetime
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Application, Reminder

bp = Blueprint('reminders', __name__, url_prefix='/api')


@bp.route('/reminders', methods=['GET'])
def list_reminders():
    include_dismissed = request.args.get('include_dismissed', 'false').lower() == 'true'
    query = Reminder.query
    if not include_dismissed:
        query = query.filter(Reminder.is_dismissed == False)
    reminders = query.order_by(Reminder.remind_at.asc()).all()
    return jsonify({'reminders': [r.to_dict() for r in reminders]})


@bp.route('/reminders/upcoming', methods=['GET'])
def upcoming_reminders():
    now = datetime.utcnow()
    reminders = Reminder.query.filter(
        Reminder.remind_at <= now,
        Reminder.is_dismissed == False,
    ).order_by(Reminder.remind_at.asc()).all()
    return jsonify({'reminders': [r.to_dict() for r in reminders]})


@bp.route('/applications/<int:app_id>/reminders', methods=['POST'])
def create_reminder(app_id):
    db.get_or_404(Application, app_id)
    data = request.get_json()

    if not data or not data.get('remind_at') or not data.get('message'):
        return jsonify({'error': {'message': 'remind_at and message are required'}}), 400

    reminder = Reminder(
        application_id=app_id,
        remind_at=datetime.fromisoformat(data['remind_at']),
        message=data['message'],
    )
    db.session.add(reminder)
    db.session.commit()
    return jsonify({'reminder': reminder.to_dict()}), 201


@bp.route('/reminders/<int:reminder_id>/dismiss', methods=['PATCH'])
def dismiss_reminder(reminder_id):
    reminder = db.get_or_404(Reminder, reminder_id)
    reminder.is_dismissed = True
    db.session.commit()
    return jsonify({'reminder': reminder.to_dict()})


@bp.route('/reminders/<int:reminder_id>', methods=['DELETE'])
def delete_reminder(reminder_id):
    reminder = db.get_or_404(Reminder, reminder_id)
    db.session.delete(reminder)
    db.session.commit()
    return '', 204
