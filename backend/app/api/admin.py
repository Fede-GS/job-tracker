from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User, InvitedEmail

bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def _require_admin():
    """Returns (user, error_response) — error_response is None if user is admin."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return None, (jsonify({'error': {'message': 'Admin access required'}}), 403)
    return user, None


@bp.route('/invited-emails', methods=['GET'])
@jwt_required()
def list_invited_emails():
    _, err = _require_admin()
    if err:
        return err

    invites = InvitedEmail.query.order_by(InvitedEmail.created_at.desc()).all()
    return jsonify({'invited_emails': [i.to_dict() for i in invites]})


@bp.route('/invited-emails', methods=['POST'])
@jwt_required()
def add_invited_email():
    _, err = _require_admin()
    if err:
        return err

    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': {'message': 'Email is required'}}), 400

    if InvitedEmail.query.filter_by(email=email).first():
        return jsonify({'error': {'message': 'Email already in invite list'}}), 409

    invite = InvitedEmail(email=email)
    db.session.add(invite)
    db.session.commit()
    return jsonify({'invited_email': invite.to_dict()}), 201


@bp.route('/invited-emails/<int:invite_id>', methods=['DELETE'])
@jwt_required()
def delete_invited_email(invite_id):
    _, err = _require_admin()
    if err:
        return err

    invite = db.get_or_404(InvitedEmail, invite_id)
    db.session.delete(invite)
    db.session.commit()
    return jsonify({'message': 'Invite removed'})


@bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    _, err = _require_admin()
    if err:
        return err

    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({'users': [u.to_dict() for u in users]})


@bp.route('/users/<int:user_id>/toggle-active', methods=['POST'])
@jwt_required()
def toggle_user_active(user_id):
    admin, err = _require_admin()
    if err:
        return err

    user = db.get_or_404(User, user_id)
    if user.id == admin.id:
        return jsonify({'error': {'message': 'Cannot deactivate yourself'}}), 400

    user.is_active = not user.is_active
    db.session.commit()
    return jsonify({'user': user.to_dict()})


@bp.route('/registration-mode', methods=['GET'])
@jwt_required()
def get_registration_mode():
    _, err = _require_admin()
    if err:
        return err

    from flask import current_app
    return jsonify({'open_registration': current_app.config.get('OPEN_REGISTRATION', True)})


@bp.route('/registration-mode', methods=['POST'])
@jwt_required()
def set_registration_mode():
    _, err = _require_admin()
    if err:
        return err

    from flask import current_app
    data = request.get_json()
    open_reg = data.get('open_registration', True)
    current_app.config['OPEN_REGISTRATION'] = bool(open_reg)
    return jsonify({'open_registration': current_app.config['OPEN_REGISTRATION']})
