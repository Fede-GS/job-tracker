from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Setting

bp = Blueprint('settings', __name__, url_prefix='/api')

ALLOWED_KEYS = ['gemini_api_key', 'adzuna_app_id', 'adzuna_api_key', 'theme', 'default_currency', 'language']


@bp.route('/settings', methods=['GET'])
def get_settings():
    settings = {}
    for key in ALLOWED_KEYS:
        settings[key] = Setting.get(key)
    return jsonify({'settings': settings})


@bp.route('/settings', methods=['PUT'])
def update_settings():
    data = request.get_json()
    if not data:
        return jsonify({'error': {'message': 'Request body is required'}}), 400

    for key in ALLOWED_KEYS:
        if key in data:
            Setting.set(key, data[key])

    settings = {}
    for key in ALLOWED_KEYS:
        settings[key] = Setting.get(key)

    return jsonify({'settings': settings})


@bp.route('/settings/test-api-key', methods=['GET'])
def test_api_key():
    api_key = Setting.get('gemini_api_key')
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
