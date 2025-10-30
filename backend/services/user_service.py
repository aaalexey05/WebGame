from flask import session
from models import db, User, Achievement, Skin
from services.game_data import ACHIEVEMENT_TEMPLATES, SKIN_TEMPLATES


def get_current_user():
    """
    Получить текущего пользователя из сессии или создать нового
    """
    # Проверяем, есть ли user_id в сессии
    if 'user_id' in session:
        # Пытаемся получить пользователя из базы
        user = User.query.get(session['user_id'])
        
        # Если пользователь существует, возвращаем
        if user:
            return user
        
        # Если не существует (база удалена), очищаем сессию
        session.pop('user_id', None)
    
    # Создаем нового пользователя
    user = User()
    db.session.add(user)
    db.session.commit()
    session['user_id'] = user.user_id
    
    # Инициализируем данные для нового пользователя
    init_user_data(user)
    
    return user


def init_user_data(user):
    """
    Создать начальные данные для нового пользователя
    """
    # Создаем достижения
    for template in ACHIEVEMENT_TEMPLATES:
        achievement = Achievement(
            name=template['name'],
            icon=template['icon'],
            description=template['description'],
            user_id=user.user_id
        )
        db.session.add(achievement)
    
    # Создаем скины
    for template in SKIN_TEMPLATES:
        skin = Skin(
            name=template['name'],
            description=template['description'],
            base_cost=template['base_cost'],
            colors=template['colors'],
            user_id=user.user_id
        )
        
        # Стандартный скин сразу куплен и активен
        if template['base_cost'] == 0:
            skin.acquired_at = db.func.now()
            skin.is_active = True
        
        db.session.add(skin)
    
    db.session.commit()
