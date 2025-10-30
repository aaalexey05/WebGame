// =======================
// КОНФИГУРАЦИЯ API
// =======================
const API_BASE = '/api';

// =======================
// СОСТОЯНИЕ ИГРЫ
// =======================
let gameState = {
    score: 0,
    clickPower: 1,
    perSecond: 0,
    upgrades: [],
    achievements: [],
    skins: [],
    activeSkin: null
};

let pendingClicks = 0;  // Накопленные клики
let isSendingClicks = false;  // Флаг отправки

// =======================
// ШАБЛОНЫ ДАННЫХ (для отображения)
// =======================
const upgradesData = [
    {
        id: 'cursor',
        name: 'Курсор',
        icon: '👆',
        description: 'Автоматически кликает 1 раз в секунду',
        baseCost: 15,
        baseProduction: 1
    },
    {
        id: 'grandma',
        name: 'Бабушка',
        icon: '👵',
        description: 'Печет печеньки и приносит 5 очков в секунду',
        baseCost: 100,
        baseProduction: 5
    },
    {
        id: 'farm',
        name: 'Ферма',
        icon: '🌾',
        description: 'Выращивает ресурсы: 20 очков в секунду',
        baseCost: 500,
        baseProduction: 20
    },
    {
        id: 'factory',
        name: 'Фабрика',
        icon: '🏭',
        description: 'Производит товары: 50 очков в секунду',
        baseCost: 2000,
        baseProduction: 50
    },
    {
        id: 'mine',
        name: 'Шахта',
        icon: '⛏️',
        description: 'Добывает ресурсы: 100 очков в секунду',
        baseCost: 5000,
        baseProduction: 100
    },
    {
        id: 'bank',
        name: 'Банк',
        icon: '🏦',
        description: 'Инвестирует деньги: 200 очков в секунду',
        baseCost: 10000,
        baseProduction: 200
    }
];

// =======================
// ИНИЦИАЛИЗАЦИЯ 
// =======================
async function initGame() {
    try {
        // Загружаем состояние с сервера
        const response = await fetch(`${API_BASE}/user/state`);
        const data = await response.json();
        
        // Обновляем состояние
        gameState.score = data.score;
        gameState.perSecond = data.per_second || 0;
        gameState.upgrades = data.upgrades || [];
        gameState.achievements = data.achievements || [];
        gameState.skins = data.skins || [];
        gameState.activeSkin = data.active_skin;
        
        // Применяем активный скин
        if (gameState.activeSkin) {
            applySkin(gameState.activeSkin.colors);
        }
        
        // Отрисовываем интерфейс
        renderShop();
        renderSkins();
        renderAchievements();
        updateDisplay();
        
        // Запускаем игровой цикл
        startGameLoop();
        
    } catch (error) {
        console.error('Error loading game:', error);
        showNotification('Ошибка загрузки игры', 'error');
    }
}

// =======================
// ИГРОВОЙ ЦИКЛ
// =======================
function startGameLoop() {
    // Визуальное автопроизводство (только UI)
    setInterval(visualAutoProduction, 1000);
    
    // Отправка кликов батчами каждые 5 секунд
    setInterval(flushPendingClicks, 5000);
    
    // Синхронизация с сервером каждую минуту
    setInterval(syncWithServer, 60000);
    
    // Сохранение при закрытии страницы
    window.addEventListener('beforeunload', saveBeforeExit);
}

// =======================
// ВИЗУАЛЬНОЕ АВТОПРОИЗВОДСТВО
// =======================
function visualAutoProduction() {
    // Локально показываем прирост для плавности UI
    if (gameState.perSecond > 0) {
        gameState.score += gameState.perSecond;
        updateDisplay();
    }
}

// =======================
// ОБРАБОТЧИК КЛИКА (БАТЧИНГ)
// =======================
document.getElementById('clickButton').addEventListener('click', function(e) {
    // Локальное обновление для мгновенного отклика
    gameState.score += gameState.clickPower;
    pendingClicks += gameState.clickPower;  // Накапливаем
    updateDisplay();
    
    // Анимация персонажа
    const character = document.getElementById('character');
    character.classList.add('happy');
    setTimeout(() => character.classList.remove('happy'), 500);
    
    // Визуальный эффект
    createParticle(e.clientX, e.clientY, `+${gameState.clickPower}`);
});

// =======================
// ОТПРАВКА НАКОПЛЕННЫХ КЛИКОВ
// =======================
async function flushPendingClicks() {
    if (pendingClicks === 0 || isSendingClicks) return;
    
    isSendingClicks = true;
    const clicksToSend = pendingClicks;
    pendingClicks = 0;  // Сбрасываем счетчик
    
    try {
        const response = await fetch(`${API_BASE}/user/click`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({clickPower: clicksToSend})
        });
        
        const data = await response.json();
        
        // Синхронизируем score с сервером (он уже с автопроизводством)
        gameState.score = data.score;
        gameState.perSecond = data.per_second || gameState.perSecond;
        updateDisplay();
        
        // Проверяем разблокированные достижения
        if (data.unlocked_achievements && data.unlocked_achievements.length > 0) {
            data.unlocked_achievements.forEach(achievement => {
                showNotification(`🎉 ${achievement.name}!`, 'success');
            });
            
            // Обновляем только достижения
            await syncAchievements();
        }
        
    } catch (error) {
        console.error('Error flushing clicks:', error);
        // Если ошибка, возвращаем клики обратно
        pendingClicks += clicksToSend;
    } finally {
        isSendingClicks = false;
    }
}

// =======================
// ПОКУПКА УЛУЧШЕНИЯ
// =======================
async function buyUpgrade(upgradeName) {
    // Отправляем накопленные клики перед покупкой
    await flushPendingClicks();
    
    try {
        const response = await fetch(`${API_BASE}/upgrades/buy`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: upgradeName})
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Обновляем состояние с сервера
            gameState.score = data.score || data.user_score;
            gameState.perSecond = data.per_second || gameState.perSecond;
            
            // Обновляем улучшение в массиве
            const existingIndex = gameState.upgrades.findIndex(u => u.name === upgradeName);
            if (existingIndex >= 0) {
                gameState.upgrades[existingIndex] = data.upgrade;
            } else {
                gameState.upgrades.push(data.upgrade);
            }
            
            renderShop();
            updateDisplay();
            
            showNotification(`✅ Куплено: ${upgradeName}!`, 'success');
            
            // Проверяем разблокированные достижения
            if (data.unlocked_achievements && data.unlocked_achievements.length > 0) {
                data.unlocked_achievements.forEach(achievement => {
                    showNotification(`🎉 ${achievement.name}!`, 'success');
                });
                await syncAchievements();
            }
        } else {
            showNotification('❌ ' + (data.error || 'Недостаточно очков'), 'error');
        }
        
    } catch (error) {
        console.error('Error buying upgrade:', error);
        showNotification('❌ Ошибка покупки', 'error');
    }
}

// =======================
// СИНХРОНИЗАЦИЯ С СЕРВЕРОМ
// =======================
async function syncWithServer() {
    try {
        const response = await fetch(`${API_BASE}/user/state`);
        const data = await response.json();
        
        // Обновляем состояние с сервера (сервер - источник истины)
        gameState.score = data.score;
        gameState.perSecond = data.per_second || 0;
        gameState.upgrades = data.upgrades || [];
        gameState.achievements = data.achievements || [];
        gameState.skins = data.skins || [];
        
        updateDisplay();
        renderShop();
        renderAchievements();
        
    } catch (error) {
        console.error('Sync error:', error);
    }
}

// =======================
// СИНХРОНИЗАЦИЯ ДОСТИЖЕНИЙ
// =======================
async function syncAchievements() {
    try {
        const response = await fetch(`${API_BASE}/achievements/`);
        gameState.achievements = await response.json();
        renderAchievements();
    } catch (error) {
        console.error('Error syncing achievements:', error);
    }
}

// =======================
// СОХРАНЕНИЕ ПРИ ЗАКРЫТИИ СТРАНИЦЫ
// =======================
function saveBeforeExit(event) {
    // Отправляем накопленные клики синхронно
    if (pendingClicks > 0) {
        navigator.sendBeacon(`${API_BASE}/user/click`, JSON.stringify({
            clickPower: pendingClicks
        }));
    }
}

// =======================
// ПОКУПКА СКИНА
// =======================
async function buySkin(skinId) {
    try {
        const response = await fetch(`${API_BASE}/skins/buy`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({skin_id: skinId})
        });
        
        const data = await response.json();
        
        if (data.success) {
            gameState.score = data.score || data.user_score;
            showNotification('✅ Скин куплен!', 'success');
            
            // Перезагружаем список скинов
            const stateResponse = await fetch(`${API_BASE}/user/state`);
            const stateData = await stateResponse.json();
            gameState.skins = stateData.skins;
            
            renderSkins();
            updateDisplay();
        } else {
            showNotification('❌ ' + data.error, 'error');
        }
        
    } catch (error) {
        console.error('Error buying skin:', error);
    }
}

// =======================
// АКТИВАЦИЯ СКИНА
// =======================
async function activateSkin(skinId) {
    try {
        const response = await fetch(`${API_BASE}/skins/activate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({skin_id: skinId})
        });
        
        const data = await response.json();
        
        if (data.success) {
            gameState.activeSkin = data.skin;
            applySkin(data.skin.colors);
            showNotification('✅ Скин активирован!', 'success');
            
            // Перезагружаем список
            const stateResponse = await fetch(`${API_BASE}/user/state`);
            const stateData = await stateResponse.json();
            gameState.skins = stateData.skins;
            
            renderSkins();
        }
        
    } catch (error) {
        console.error('Error activating skin:', error);
    }
}

// =======================
// ОТРИСОВКА МАГАЗИНА
// =======================
function renderShop() {
    const shopContainer = document.getElementById('shopItems');
    shopContainer.innerHTML = '';
    
    upgradesData.forEach(template => {
        // Находим улучшение пользователя
        const userUpgrade = gameState.upgrades.find(u => u.name === template.name);
        const level = userUpgrade ? userUpgrade.level : 0;
        const currentCost = userUpgrade ? userUpgrade.current_cost : template.baseCost;
        const production = userUpgrade ? userUpgrade.current_production : 0;
        
        // Проверка на достаточность средств
        const canAfford = gameState.score >= currentCost;
        
        const item = document.createElement('div');
        item.className = 'shop-item';
        
        item.innerHTML = `
            <div class="shop-item-icon">${template.icon}</div>
            <div class="shop-item-info">
                <div class="shop-item-name">${template.name}</div>
                <div class="shop-item-description">${template.description}</div>
                <div class="shop-item-stats">
                    <span class="shop-item-cost">${formatNumber(currentCost)}</span>
                    <span class="shop-item-owned">Куплено: ${level}</span>
                </div>
                <div style="margin-top: 10px; font-size: 14px; color: #667eea;">
                    Производство: ${production}/сек
                </div>
            </div>
            <button 
                class="shop-item-button" 
                onclick="buyUpgrade('${template.name}')"
                ${canAfford ? '' : 'disabled'}
            >
                Купить
            </button>
        `;
        
        shopContainer.appendChild(item);
    });
}

// =======================
// ОТРИСОВКА СКИНОВ
// =======================
function renderSkins() {
    const container = document.getElementById('skinsContainer');
    container.innerHTML = '';
    
    gameState.skins.forEach(skin => {
        const item = document.createElement('div');
        item.className = 'shop-item skin';
        
        if (skin.is_owned) {
            item.classList.add('owned');
        }
        if (skin.is_active) {
            item.classList.add('active');
        }
        
        item.innerHTML = `
            <div class="shop-item-icon">🎨</div>
            <div class="shop-item-info">
                <div class="shop-item-name">${skin.name}</div>
                <div class="shop-item-description">${skin.description}</div>
                <div class="shop-item-stats">
                    ${skin.is_owned ? 
                        '<span style="color: #4CAF50; font-weight: bold;">✓ Куплен</span>' : 
                        `<span class="shop-item-cost">${formatNumber(skin.base_cost)}</span>`
                    }
                </div>
            </div>
            ${skin.is_owned ? 
                `<button 
                    class="shop-item-button" 
                    onclick="activateSkin(${skin.skin_id})"
                    ${skin.is_active ? 'disabled' : ''}
                >
                    ${skin.is_active ? 'Активен' : 'Активировать'}
                </button>` :
                `<button 
                    class="shop-item-button" 
                    onclick="buySkin(${skin.skin_id})"
                    ${gameState.score < skin.base_cost ? 'disabled' : ''}
                >
                    Купить
                </button>`
            }
        `;
        
        container.appendChild(item);
    });
}

// =======================
// ПРИМЕНЕНИЕ СКИНА
// =======================
function applySkin(colors) {
    document.body.style.background = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`;
    
    const header = document.querySelector('.header');
    if (header) {
        header.style.background = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`;
    }
    
    const clickButton = document.querySelector('.click-button');
    if (clickButton) {
        clickButton.style.background = colors.button;
    }
    
    const character = document.querySelector('.char-body');
    if (character) {
        character.setAttribute('fill', colors.character);
    }
}

// =======================
// ОТРИСОВКА ДОСТИЖЕНИЙ
// =======================
function renderAchievements() {
    const container = document.getElementById('achievementsContainer');
    container.innerHTML = '';
    
    gameState.achievements.forEach(achievement => {
        const item = document.createElement('div');
        item.className = 'achievement-item';
        
        if (achievement.is_unlocked) {
            item.classList.add('unlocked');
        } else {
            item.classList.add('locked');
        }
        
        item.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
            <div class="achievement-status ${achievement.is_unlocked ? 'unlocked' : 'locked'}">
                ${achievement.is_unlocked ? '✓ Разблокировано' : '🔒 Заблокировано'}
            </div>
        `;
        
        container.appendChild(item);
    });
}

// =======================
// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// =======================
function switchTab(tabName) {
    // Убираем активный класс со всех кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Убираем активный класс со всех контентов
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Активируем нужную кнопку и контент
    if (tabName === 'game') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('gameTab').classList.add('active');
    } else if (tabName === 'shop') {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('shopTab').classList.add('active');
    } else if (tabName === 'achievements') {
        document.querySelectorAll('.tab-btn')[2].classList.add('active');
        document.getElementById('achievementsTab').classList.add('active');
    }
}

// =======================
// ВИЗУАЛЬНЫЕ ЭФФЕКТЫ
// =======================
function createParticle(x, y, text) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.textContent = text;
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    
    document.getElementById('particlesContainer').appendChild(particle);
    
    setTimeout(() => particle.remove(), 1000);
}

// =======================
// УВЕДОМЛЕНИЯ
// =======================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// =======================
// УТИЛИТЫ
// =======================
function formatNumber(num) {
    return Math.floor(num).toLocaleString();
}

function updateDisplay() {
    document.getElementById('score').textContent = formatNumber(gameState.score);
    document.getElementById('perSecond').textContent = formatNumber(gameState.perSecond);
    
    // Обновляем кнопки магазина
    renderShop();
    renderSkins();
}

// =======================
// ЗАПУСК ИГРЫ
// =======================
window.addEventListener('DOMContentLoaded', initGame);