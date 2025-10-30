"""
Шаблоны игровых данных
"""

# Шаблоны улучшений
UPGRADE_TEMPLATES = [
    {
        'name': 'Курсор',
        'icon': '👆',
        'description': 'Автоматически кликает 1 раз в секунду',
        'baseCost': 15,
        'baseProduction': 1,
    },
    {
        'name': 'Бабушка',
        'icon': '👵',
        'description': 'Печет печеньки и приносит по 5 очков в секунду',
        'baseCost': 100,
        'baseProduction': 5,
    },
    {
        'name': 'Ферма',
        'icon': '🌾',
        'description': 'Выращивает ресурсы, принося по 20 очков в секунду',
        'baseCost': 500,
        'baseProduction': 20,
    },
    {
        'name': 'Фабрика',
        'icon': '🏭',
        'description': 'Производит товары: 50 очков в секунду',
        'baseCost': 2000,
        'baseProduction': 50,
    },
    {
        'name': 'Шахта',
        'icon': '⛏️',
        'description': 'Добывает ресурсы: 100 очков в секунду',
        'baseCost': 5000,
        'baseProduction': 100,
    },
    {
        'name': 'Банк',
        'icon': '🏦',
        'description': 'Инвестирует деньги: 200 очков в секунду',
        'baseCost': 10000,
        'baseProduction': 200,
    },
]

# Шаблоны достижений
ACHIEVEMENT_TEMPLATES = [
    {
        'name': 'Первый клик',
        'icon': '🎯',
        'description': 'Сделайте ваш первый клик'
    },
    {
        'name': 'Сотня кликов',
        'icon': '💯',
        'description': 'Наберите 100 очков'
    },
    {
        'name': 'Первое улучшение',
        'icon': '⬆️',
        'description': 'Купите первое улучшение'
    },
    {
        'name': 'Тысяча очков',
        'icon': '🌟',
        'description': 'Наберите 1000 очков'
    },
    {
        'name': 'Автоматизация',
        'icon': '🤖',
        'description': 'Достигните 10 очков в секунду'
    },
    {
        'name': 'Миллионер',
        'icon': '💰',
        'description': 'Наберите 1,000,000 очков'
    },
]

# Шаблоны скинов
SKIN_TEMPLATES = [
    {
        'name': 'Стандартный',
        'description': 'Классический вид игры',
        'base_cost': 0,
        'colors': {
            'primary': '#667eea',
            'secondary': '#764ba2',
            'button': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'character': '#FFD700'
        }
    },
    {
        'name': 'Океан',
        'description': 'Морская тематика',
        'base_cost': 1000,
        'colors': {
            'primary': '#00c6ff',
            'secondary': '#0072ff',
            'button': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'character': '#4FC3F7'
        }
    },
    {
        'name': 'Лес',
        'description': 'Природная свежесть',
        'base_cost': 2000,
        'colors': {
            'primary': '#56ab2f',
            'secondary': '#a8e063',
            'button': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            'character': '#8BC34A'
        }
    },
    {
        'name': 'Закат',
        'description': 'Теплые вечерние цвета',
        'base_cost': 3000,
        'colors': {
            'primary': '#ff6a00',
            'secondary': '#ee0979',
            'button': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'character': '#FF7043'
        }
    },
    {
        'name': 'Космос',
        'description': 'Звездное небо',
        'base_cost': 5000,
        'colors': {
            'primary': '#0f2027',
            'secondary': '#2c5364',
            'button': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'character': '#9C27B0'
        }
    }
]