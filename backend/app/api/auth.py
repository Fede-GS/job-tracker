import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import bcrypt
from ..extensions import db
from ..models import User, UserProfile

bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def _validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    full_name = (data.get('full_name') or '').strip()

    # Validation
    if not email or not _validate_email(email):
        return jsonify({'error': {'message': 'Valid email is required'}}), 400
    if len(password) < 6:
        return jsonify({'error': {'message': 'Password must be at least 6 characters'}}), 400
    if not full_name:
        return jsonify({'error': {'message': 'Full name is required'}}), 400

    # Check existing
    if User.query.filter_by(email=email).first():
        return jsonify({'error': {'message': 'Email already registered'}}), 409

    # Create user
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user = User(email=email, password_hash=password_hash, full_name=full_name)
    db.session.add(user)
    db.session.flush()  # Get user.id

    # Create empty profile
    profile = UserProfile(user_id=user.id, full_name=full_name, email=email)
    db.session.add(profile)
    db.session.commit()

    # Generate token
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        'token': access_token,
        'user': user.to_dict(),
    }), 201


@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': {'message': 'Email and password are required'}}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({'error': {'message': 'Invalid email or password'}}), 401

    if not user.is_active:
        return jsonify({'error': {'message': 'Account is disabled'}}), 403

    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        'token': access_token,
        'user': user.to_dict(),
    })


@bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': {'message': 'User not found'}}), 404

    profile = UserProfile.query.filter_by(user_id=user_id).first()

    return jsonify({
        'user': user.to_dict(),
        'onboarding_completed': profile.onboarding_completed if profile else False,
    })
