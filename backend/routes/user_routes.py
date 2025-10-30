"""
API endpoints для работы с пользователем
"""
from flask import Blueprint, jsonify, request
from models import db, Upgrade, Achievement, Skin
from services.user_service import get_current_user
from services.achievement_service import check_and_unlock_achievements
from datetime import datetime

user_bp = Blueprint('user', __name__, url_prefix='/api/user')


def get_per_second(user_id):
    """Вспомогательная функция для расчета дохода в секунду"""
    upgrades = Upgrade.query.filter_by(user_id=user_id).all()
    return sum(u.current_production for u in upgrades)


@user_bp.route('/state')
def get_user_state():
    """
        Получить текущее состояние пользователя
        GET: /api/user/state
        Returns:
            JSON с данными пользователя, улучшениями, достижениями и скинами
    """
    user = get_current_user()

    # Доход в секунду
    per_second = get_per_second(user.user_id)
    
    # Применяем автопроизводство
    user.apply_auto_production(per_second)
    db.session.commit()

    upgrades = Upgrade.query.filter_by(user_id=user.user_id).all()
    achievement = Achievement.query.filter_by(user_id=user.user_id).all()
    skins = Skin.query.filter_by(user_id=user.user_id).all()
    active_skin = Skin.query.filter_by(user_id=user.user_id, is_active=True).first()
    
    total_production = sum(u.current_production for u in upgrades)

    if total_production > 0 and hasattr(user, 'last_update'):
        time_passed = (datetime.now() - user.last_update).total_seconds()
        earned = int(total_production * time_passed)
        user.score += earned
        user.last_update = datetime.now()
        db.session.commit()

    return jsonify({
        'user_id': user.user_id,
        'username': user.username,
        'score': user.score,
        'per_second': total_production,
        'upgrades': [u.to_dict() for u in upgrades],
        'achievements': [a.to_dict() for a in achievement],
        'skins': [s.to_dict() for s in skins],
        'active_skin': active_skin.to_dict() if active_skin else None
    })


@user_bp.route('/click', methods=['POST'])
def handle_click():
    """
        Обработка клика по кнопке
        POST: /api/user/click
        Body: {"clickPower": 1}
        Returns:
            JSON с обновленным счетом и разблокированными достижениями
    """
    user = get_current_user()
    data = request.get_json()

    # Применяем автопроизводство перед кликом
    per_second = get_per_second(user.user_id)
    user.apply_auto_production(per_second)

    click_power = data.get('clickPower', 1)
    user.score += click_power

    db.session.commit()

    # Проверяем достижения
    unlocked_achievements = check_and_unlock_achievements(user)

    return jsonify({
        'success': True,
        'score': user.score,
        'per_second': per_second,
        'unlocked_achievements': unlocked_achievements
    })