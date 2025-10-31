from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON
import uuid
from datetime import datetime
from sqlalchemy.sql import func


db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(36), unique=True, nullable=False)
    score = db.Column(db.Integer, default=0)
    last_update = db.Column(db.DateTime(timezone=True), default=datetime.now())
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    
    # Relationships 
    achievements = db.relationship('Achievement', backref='user', lazy=True, cascade="all, delete-orphan")
    upgrades = db.relationship('Upgrade', backref='user', lazy=True, cascade="all, delete-orphan")
    skins = db.relationship('Skin', backref='user', lazy=True, cascade="all, delete-orphan")

    def __init__(self):
        self.username = str(uuid.uuid4())
        self.last_update = datetime.now()

    def apply_auto_production(self, per_second):
        """Применить автопроизводство за прошедшее время"""
        if per_second > 0 and self.last_update:
            time_passed = (datetime.now() - self.last_update).total_seconds()
            earned = int(per_second * time_passed)
            self.score += earned
        self.last_update = datetime.now()
        return self.score

    def __repr__(self):
        return f'<User: {self.username}, Score: {self.score}>'


class Achievement(db.Model):
    __tablename__ = 'achievements'

    achievement_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    icon = db.Column(db.String(255))  # Эмодзи: '🏆', '⭐', '🎯'
    is_unlocked = db.Column(db.Boolean, default=False)
    achieved_at = db.Column(db.DateTime(timezone=True), nullable=True)  # NULL пока не получено
    
    # Foreign Key
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)

    def unlock(self):
        """Метод для разблокировки достижения"""
        if not self.is_unlocked:
            self.is_unlocked = True
            self.achieved_at = datetime.now()

    def to_dict(self):
        return {
            'achievement_id': self.achievement_id,
            'name': self.name,
            'description': self.description,
            'icon': self.icon,
            'is_unlocked': self.is_unlocked,
            'achieved_at': self.achieved_at.isoformat() if self.achieved_at else None
        }

    def __repr__(self):
        status = "Unlocked" if self.is_unlocked else "Locked"
        return f'<Achievement: {self.name} ({status})>'


class Upgrade(db.Model):
    __tablename__ = 'upgrades'

    upgrade_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    base_cost = db.Column(db.Integer, nullable=False)  # Начальная цена
    base_production = db.Column(db.Integer, nullable=False)  # Производство за 1 уровень
    
    level = db.Column(db.Integer, default=0)  # Количество купленных улучшений
    cost_multiplier = db.Column(db.Float, default=1.15)  # Коэффициент роста цены (15%)
    
    purchased_at = db.Column(db.DateTime(timezone=True), nullable=True)  # Время первой покупки
    # Foreign Key
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)

    def __init__(self, **kwargs):
        """Инициализация с гарантией значений по умолчанию"""
        super().__init__(**kwargs)
        if self.level is None:
            self.level = 0
        if self.cost_multiplier is None:
            self.cost_multiplier = 1.15

    @property
    def current_cost(self):
        """Текущая цена улучшения на основе уровня"""
        return int(self.base_cost * (self.cost_multiplier ** self.level))
    
    @property
    def current_production(self):
        """Текущая производительность"""
        return self.base_production * self.level

    def purchase(self, user):
        """Покупка улучшения"""
        cost = self.current_cost
        if user.score >= cost:
            user.score -= cost
            self.level += 1
            if self.purchased_at is None:
                self.purchased_at = datetime.now()
            return True
        return False

    def to_dict(self):
        return {
            'upgrade_id': self.upgrade_id,
            'name': self.name,
            'description': self.description,
            'base_cost': self.base_cost,
            'current_cost': self.current_cost,
            'base_production': self.base_production,
            'current_production': self.current_production,
            'level': self.level,
            'purchased_at': self.purchased_at.isoformat() if self.purchased_at else None
        }

    def __repr__(self):
        return f'<Upgrade: {self.name} (Level {self.level})>'


class Skin(db.Model):
    __tablename__ = 'skins'

    skin_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    base_cost = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=False)
    colors = db.Column(JSON, nullable=False)
    acquired_at = db.Column(db.DateTime(timezone=True), nullable=True)  # NULL пока не куплен
    
    # Foreign Key
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)

    def activate(self):
        """Активировать этот скин и деактивировать остальные"""
        # Деактивировать все скины пользователя
        Skin.query.filter_by(user_id=self.user_id).update({'is_active': False})
        self.is_active = True

    def purchase(self, user):
        """Покупка скина"""
        if user.score >= self.base_cost:
            user.score -= self.base_cost
            self.acquired_at = datetime.now()
            return True
        return False

    def to_dict(self):
        """Преобразование объекта Skin в словарь для JSON-сериализации"""
        return {
            'skin_id': self.skin_id,
            'name': self.name,
            'description': self.description,
            'base_cost': self.base_cost,
            'is_active': self.is_active,
            'is_owned': self.acquired_at is not None,
            'colors': self.colors,
            'acquired_at': self.acquired_at.isoformat() if self.acquired_at else None,
        }

    def __repr__(self):
        status = "Active" if self.is_active else "Inactive"
        return f'<Skin: {self.name} ({status})>'