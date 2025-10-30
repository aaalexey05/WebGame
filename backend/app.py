"""
Main file application
"""
from flask import Flask, render_template
from config import Config
from models import db
from routes import register_routes

# Создаем приложение
app = Flask(__name__)
app.config.from_object(Config)

# Инициализируем базу данных
db.init_app(app)

# Регистрируем все роуты
register_routes(app)


# HTML страница
@app.route('/')
def index():
    return render_template('index.html')

# Создание таблиц при запуске
with app.app_context():
    db.create_all()


if __name__ == '__main__':
    app.run(debug=True)