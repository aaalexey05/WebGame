"""
API endpoints для работы с улучшениями пользователя
"""
from flask import Blueprint, jsonify, request
from models import db, Upgrade
from services.user_service import get_current_user
from services.achievement_service import check_and_unlock_achievements
from services.game_data import UPGRADE_TEMPLATES

upgrade_bp = Blueprint('upgrade', __name__, url_prefix='/api/upgrades')


def get_per_second(user_id):
    """Расчет дохода в секунду"""
    upgrades = Upgrade.query.filter_by(user_id=user_id).all()
    return sum(u.current_production for u in upgrades)


@upgrade_bp.route('/buy', methods=['POST'])
def buy_upgrade():
    """
        Купить улучшение
        POST: /api/upgrades/buy
        Body: {"name": "Курсор"}

        Returns:
            JSON с обновленным улучшением, счетом пользователя и разблокированными достижениями
    """
    user = get_current_user()
    data = request.get_json()

    upgrade_name = data.get('name')

    # ← ПРИМЕНЯЕМ АВТОПРОИЗВОДСТВО ПЕРЕД ПОКУПКОЙ
    per_second = get_per_second(user.user_id)
    user.apply_auto_production(per_second)

    # Находим улучшение в базе
    upgrade = Upgrade.query.filter_by(
        user_id=user.user_id,
        name=upgrade_name
    ).first()

    # Если улучшения нет, создаем новое
    if not upgrade:
        template = next(
            (u for u in UPGRADE_TEMPLATES if u['name'] == upgrade_name), None
        )

        if not template:
            return jsonify({
                'success': False,
                'error': 'Upgrade not found'
            }), 404
        
        upgrade = Upgrade(
            name = template['name'],
            description = template['description'],
            base_cost = template['baseCost'],
            base_production = template['baseProduction'],
            level=0,
            cost_multiplier=1.15,
            user_id=user.user_id
        )
        db.session.add(upgrade)
        db.session.flush()

    # Проверяем, хватает ли очков
    success = upgrade.purchase(user)

    if not success:
        return jsonify({
            'success': False,
            'error': 'Not enough score to purchase upgrade'
        }), 400
    
    db.session.commit()

    # Проверяем достижения
    unlocked_achievements = check_and_unlock_achievements(user)

    # Пересчитываем per_second после покупки
    new_per_second = get_per_second(user.user_id)

    return jsonify({
        'success': True,
        'upgrade': upgrade.to_dict(),
        'user_score': user.score,
        'score': user.score,
        'per_second': new_per_second,
        'unlocked_achievements': unlocked_achievements
    })