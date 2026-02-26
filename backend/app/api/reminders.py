from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Application, Reminder


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


bp = Blueprint('reminders', __name__, url_prefix='/api')


@bp.route('/reminders', methods=['GET'])
@jwt_required()
def list_reminders():
    user_id = _current_user_id()
    include_dismissed = request.args.get('include_dismissed', 'false').lower() == 'true'

    # Get reminders for user's applications
    user_app_ids = [
        a.id for a in Application.query.filter_by(user_id=user_id).with_entities(Application.id).all()
    ]
    query = Reminder.query.filter(Reminder.application_id.in_(user_app_ids))
    if not include_dismissed:
        query = query.filter(Reminder.is_dismissed == False)
    reminders = query.order_by(Reminder.remind_at.asc()).all()
    return jsonify({'reminders': [r.to_dict() for r in reminders]})


@bp.route('/reminders/upcoming', methods=['GET'])
@jwt_required()
def upcoming_reminders():
    user_id = _current_user_id()
    now = datetime.now(timezone.utc)

    user_app_ids = [
        a.id for a in Application.query.filter_by(user_id=user_id).with_entities(Application.id).all()
    ]
    reminders = Reminder.query.filter(
        Reminder.application_id.in_(user_app_ids),
        Reminder.remind_at <= now,
        Reminder.is_dismissed == False,
    ).order_by(Reminder.remind_at.asc()).all()
    return jsonify({'reminders': [r.to_dict() for r in reminders]})


@bp.route('/applications/<int:app_id>/reminders', methods=['POST'])
@jwt_required()
def create_reminder(app_id):
    user_id = _current_user_id()
    Application.query.filter_by(id=app_id, user_id=user_id).first_or_404()
    data = request.get_json()

    if not data or not data.get('remind_at') or not data.get('message'):
        return jsonify({'error': {'message': 'remind_at and message are required'}}), 400

    reminder = Reminder(
        application_id=app_id,
        remind_at=_parse_iso_datetime(data['remind_at']),
        message=data['message'],
    )
    db.session.add(reminder)
    db.session.commit()
    return jsonify({'reminder': reminder.to_dict()}), 201


@bp.route('/reminders/<int:reminder_id>/dismiss', methods=['PATCH'])
@jwt_required()
def dismiss_reminder(reminder_id):
    user_id = _current_user_id()
    user_app_ids = [
        a.id for a in Application.query.filter_by(user_id=user_id).with_entities(Application.id).all()
    ]
    reminder = Reminder.query.filter(
        Reminder.id == reminder_id,
        Reminder.application_id.in_(user_app_ids),
    ).first_or_404()
    reminder.is_dismissed = True
    db.session.commit()
    return jsonify({'reminder': reminder.to_dict()})


@bp.route('/reminders/<int:reminder_id>', methods=['DELETE'])
@jwt_required()
def delete_reminder(reminder_id):
    user_id = _current_user_id()
    user_app_ids = [
        a.id for a in Application.query.filter_by(user_id=user_id).with_entities(Application.id).all()
    ]
    reminder = Reminder.query.filter(
        Reminder.id == reminder_id,
        Reminder.application_id.in_(user_app_ids),
    ).first_or_404()
    db.session.delete(reminder)
    db.session.commit()
    return '', 204
