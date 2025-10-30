"""
Сервис для проверки и разблокировки достижений
"""
from models import Achievement, Upgrade, db

def check_and_unlock_achievements(user):
    """
        Проверить и разблокировать достижения для пользователя

        Returns:
            list: Список разблокированных достижений (в формате словаря dict)
    """
    # Получаем незаблокированные достижения
    archievements = Achievement.query.filter_by(
        user_id = user.user_id,
        is_unlocked = False
    ).all()

    if not archievements:
        return []
    
    # Получаем статистику пользователя
    upgrades = Upgrade.query.filter_by(user_id=user.user_id).all()
    total_production = sum(u.current_production for u in upgrades)
    has_upgrades = any(u.level > 0 for u in upgrades)

    unlocked = []

    for achievement in archievements:
        should_unlock = False

        # Логика разблокировки достижений
        if achievement.name == 'Первый клик' and user.score >= 1:
            should_unlock = True
        elif achievement.name == 'Сотня кликов' and user.score >= 100:
            should_unlock = True
        elif achievement.name == 'Первое улучшение' and has_upgrades:
            should_unlock = True
        elif achievement.name == 'Тысяча очков' and user.score >= 1000:
            should_unlock = True
        elif achievement.name == 'Автоматизация' and total_production >= 10:
            should_unlock = True
        elif achievement.name == 'Миллионер' and user.score >= 1_000_000:
            should_unlock = True

        if should_unlock:
            achievement.unlock()
            unlocked.append(achievement.to_dict())
    
    if unlocked:
        db.session.commit()

    return unlocked