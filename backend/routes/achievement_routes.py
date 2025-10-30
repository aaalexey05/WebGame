"""
API endpoints для работы с достижениями
"""
from flask import Blueprint, jsonify
from models import Achievement
from services.user_service import get_current_user

achievement_bp = Blueprint('achievement', __name__, url_prefix='/api/achievements')


@achievement_bp.route('/')
def get_achievements():
    """
        Получить все достижения пользователя
        GET: /api/achievements/
        Returns:
            JSON с достижениями пользователя
    """
    user = get_current_user()
    achievements = Achievement.query.filter_by(user_id=user.user_id).all()

    return jsonify({
        'achievements': [a.to_dict() for a in achievements]
    })