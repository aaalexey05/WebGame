"""
API endpoints для работы со скинами
"""
from flask import Blueprint, jsonify, request
from models import db, Skin
from services.user_service import get_current_user
from models import Upgrade

skin_bp = Blueprint('skin', __name__, url_prefix='/api/skins')

def get_per_second(user_id):
    """Расчет дохода в секунду"""
    upgrades = Upgrade.query.filter_by(user_id=user_id).all()
    return sum(u.current_production for u in upgrades)


@skin_bp.route('/buy', methods=['POST'])
def buy_skin():
    """
        Купить скин
        POST: /api/skins/buy
        Body: {"name": "Красный скин"}

        Returns:
            JSON с обновленным скином и счетом пользователя
    """
    user = get_current_user()
    data = request.get_json()

    # ← ПРИМЕНЯЕМ АВТОПРОИЗВОДСТВО
    per_second = get_per_second(user.user_id)
    user.apply_auto_production(per_second)

    skin_id = data.get('skin_id')
    skin = Skin.query.get(skin_id)

    # Проверяем, что скин существует и принадлежит пользователю
    if not skin or skin.user_id != user.user_id:
        return jsonify({
            'success': False,
            'error': 'Skin not found'
        }), 404
    
    # Проверяем, не куплен ли уже
    if skin.accquired_at:
        return jsonify({
            'success': False,
            'error': 'Skin already acquired'
        }), 400
    
    # Пытаемся купить скин
    success = skin.purchase(user)

    if not success:
        return jsonify({
            'success': False,
            'error': 'Not enough score to purchase skin'
        }), 400
    
    db.session.commit()

    return jsonify({
        'success': True,
        'skin': skin.to_dict(),
        'score': user.score
    })


@skin_bp.route('/activate', methods=['POST'])
def activate_skin():
    """
        Активировать скин
        POST /api/skins/activate
        Body: {"skin_id": 1}

        Returns:
            JSON с активированным скином
    """
    user = get_current_user()
    data = request.get_json()

    skin_id = data.get('skin_id')
    skin = Skin.query.get(skin_id)

    # Проверяем, что скин существует и принадлежит пользователю
    if not skin or skin.user_id != user.user_id:
        return jsonify({
            'success': False,
            'error': 'Skin not found'
        }), 404
    
    # Проверяем, куплен ли скин
    if not skin.acquired_at:
        return jsonify({
            'success': False,
            'error': 'Skin not acquired'
        }), 400
    
    # Активируем скин
    skin.activate()
    db.session.commit()

    return jsonify({
        'success': True,
        'skin': skin.to_dict()
    })