from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from ..extensions import db
from ..models import User, UserProfile, InvitedEmail

bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': {'message': 'Request body is required'}}), 400

    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email:
        return jsonify({'error': {'message': 'Email is required'}}), 400
    if not password or len(password) < 6:
        return jsonify({'error': {'message': 'Password must be at least 6 characters'}}), 400

    # Check if email already registered
    if User.query.filter_by(email=email).first():
        return jsonify({'error': {'message': 'Email already registered'}}), 409

    open_registration = current_app.config.get('OPEN_REGISTRATION', True)

    if not open_registration:
        # Invite-only: check if email is in the invited list
        invite = InvitedEmail.query.filter_by(email=email).first()
        if not invite:
            return jsonify({'error': {'message': 'Registration is by invitation only. Your email is not on the invite list.'}}), 403
        if invite.used_by_user_id:
            return jsonify({'error': {'message': 'This invitation has already been used.'}}), 403

    # Create user
    user = User(email=email)
    user.set_password(password)

    # First user becomes admin
    if User.query.count() == 0:
        user.role = 'admin'

    db.session.add(user)
    db.session.flush()  # get user.id

    # Create empty profile linked to user
    profile = UserProfile(user_id=user.id, email=email)
    db.session.add(profile)

    # Mark invite as used (if invite-only mode)
    if not open_registration:
        invite.used_at = datetime.now(timezone.utc)
        invite.used_by_user_id = user.id

    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'user': user.to_dict(),
        'access_token': access_token,
        'message': 'Registration successful',
    }), 201


@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': {'message': 'Request body is required'}}), 400

    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': {'message': 'Email and password are required'}}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': {'message': 'Invalid email or password'}}), 401

    if not user.is_active:
        return jsonify({'error': {'message': 'Account is disabled. Contact support.'}}), 403

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'user': user.to_dict(),
        'access_token': access_token,
        'message': 'Login successful',
    })


@bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': {'message': 'User not found'}}), 404
    return jsonify({'user': user.to_dict()})


@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # JWT is stateless — client deletes the token
    return jsonify({'message': 'Logged out successfully'})
