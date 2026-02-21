from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Application, Reminder
from ..utils.auth_helpers import get_current_user_id

bp = Blueprint('reminders', __name__, url_prefix='/api')


def _verify_app_ownership(app_id):
    """Verify the application belongs to current user."""
    uid = get_current_user_id()
    return Application.query.filter_by(id=app_id, user_id=uid).first_or_404()


def _verify_reminder_ownership(reminder_id):
    """Verify the reminder belongs to current user (through application)."""
    uid = get_current_user_id()
    reminder = db.get_or_404(Reminder, reminder_id)
    if reminder.application_id:
        Application.query.filter_by(id=reminder.application_id, user_id=uid).first_or_404()
    return reminder


@bp.route('/reminders', methods=['GET'])
@jwt_required()
def list_reminders():
    uid = get_current_user_id()
    include_dismissed = request.args.get('include_dismissed', 'false').lower() == 'true'

    # Only get reminders for user's applications
    user_app_ids = db.session.query(Application.id).filter_by(user_id=uid).subquery()
    query = Reminder.query.filter(Reminder.application_id.in_(user_app_ids))

    if not include_dismissed:
        query = query.filter(Reminder.is_dismissed == False)
    reminders = query.order_by(Reminder.remind_at.asc()).all()
    return jsonify({'reminders': [r.to_dict() for r in reminders]})


@bp.route('/reminders/upcoming', methods=['GET'])
@jwt_required()
def upcoming_reminders():
    uid = get_current_user_id()
    now = datetime.utcnow()

    user_app_ids = db.session.query(Application.id).filter_by(user_id=uid).subquery()
    reminders = Reminder.query.filter(
        Reminder.application_id.in_(user_app_ids),
        Reminder.remind_at <= now,
        Reminder.is_dismissed == False,
    ).order_by(Reminder.remind_at.asc()).all()
    return jsonify({'reminders': [r.to_dict() for r in reminders]})


@bp.route('/applications/<int:app_id>/reminders', methods=['POST'])
@jwt_required()
def create_reminder(app_id):
    _verify_app_ownership(app_id)
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
@jwt_required()
def dismiss_reminder(reminder_id):
    reminder = _verify_reminder_ownership(reminder_id)
    reminder.is_dismissed = True
    db.session.commit()
    return jsonify({'reminder': reminder.to_dict()})


@bp.route('/reminders/<int:reminder_id>', methods=['DELETE'])
@jwt_required()
def delete_reminder(reminder_id):
    reminder = _verify_reminder_ownership(reminder_id)
    db.session.delete(reminder)
    db.session.commit()
    return '', 204
