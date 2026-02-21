import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Setting
from ..utils.auth_helpers import get_current_user_id

bp = Blueprint('settings', __name__, url_prefix='/api')

ALLOWED_KEYS = ['theme', 'default_currency', 'language']


@bp.route('/settings', methods=['GET'])
@jwt_required()
def get_settings():
    uid = get_current_user_id()
    settings = {}
    for key in ALLOWED_KEYS:
        settings[key] = Setting.get(key, uid)

    # Report whether shared API keys are configured (don't expose the actual keys)
    settings['shared_api_keys'] = bool(current_app.config.get('GEMINI_API_KEY'))

    return jsonify({'settings': settings})


@bp.route('/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    uid = get_current_user_id()
    data = request.get_json()
    if not data:
        return jsonify({'error': {'message': 'Request body is required'}}), 400

    for key in ALLOWED_KEYS:
        if key in data:
            Setting.set(key, data[key], uid)

    settings = {}
    for key in ALLOWED_KEYS:
        settings[key] = Setting.get(key, uid)

    settings['shared_api_keys'] = bool(current_app.config.get('GEMINI_API_KEY'))

    return jsonify({'settings': settings})


@bp.route('/settings/test-api-key', methods=['GET'])
@jwt_required()
def test_api_key():
    # Use shared API key from environment
    api_key = current_app.config.get('GEMINI_API_KEY')
    if not api_key:
        return jsonify({'valid': False, 'error': 'No API key configured'}), 200

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        model.generate_content('Say hello')
        return jsonify({'valid': True})
    except Exception as e:
        return jsonify({'valid': False, 'error': str(e)})
