from flask_jwt_extended import get_jwt_identity
from ..models import User, UserProfile


def get_current_user_id():
    """Get the current authenticated user's ID from JWT (as int)."""
    return int(get_jwt_identity())


def get_current_user():
    """Get the current authenticated User object."""
    user_id = int(get_jwt_identity())
    return User.query.get(user_id)


def get_current_profile():
    """Get the current user's profile, or empty dict if none."""
    user_id = int(get_jwt_identity())
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    return profile.to_dict() if profile else {}
