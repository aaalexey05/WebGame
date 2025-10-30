import os

class Config:
    """Базовая конфигурация приложения"""

    # База данных
    basedir = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'clicker_game.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Секретный ключ для сессий
    SECRET_KEY = "supersecretkey"
