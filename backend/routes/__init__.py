"""
Регистрация всех Blueprint'ов для маршрутов приложения.
"""
from routes.user_routes import user_bp
from routes.skin_routes import skin_bp
from routes.upgrade_routes import upgrade_bp
from routes.achievement_routes import achievement_bp


def register_routes(app):
    """
        Регистрация всех роутеров в приложении
        Args: 
            app: Flask application
    """
    app.register_blueprint(user_bp)
    app.register_blueprint(skin_bp)
    app.register_blueprint(upgrade_bp)
    app.register_blueprint(achievement_bp)