// /backend/static/js/game.js

const API_BASE = '/api';

let gameState = {
    score: 0,
    clickPower: 1,
    perSecond: 0,
    upgrades: [],
    achievements: [],
    skins: [],
    activeSkin: null
};

let pendingClicks = 0;
let isSendingClicks = false;

const upgradesData = [
    { id: 'cursor', name: 'Курсор', icon: '👆', description: 'Автоматически кликает 1 раз в секунду', baseCost: 15, baseProduction: 1 },
    { id: 'grandma', name: 'Бабушка', icon: '👵', description: 'Печет печеньки и приносит 5 очков в секунду', baseCost: 100, baseProduction: 5 },
    { id: 'farm', name: 'Ферма', icon: '🌾', description: 'Выращивает ресурсы: 20 очков в секунду', baseCost: 500, baseProduction: 20 },
    { id: 'factory', name: 'Фабрика', icon: '🏭', description: 'Производит товары: 50 очков в секунду', baseCost: 2000, baseProduction: 50 },
    { id: 'mine', name: 'Шахта', icon: '⛏️', description: 'Добывает ресурсы: 100 очков в секунду', baseCost: 5000, baseProduction: 100 },
    { id: 'bank', name: 'Банк', icon: '🏦', description: 'Инвестирует деньги: 200 очков в секунду', baseCost: 10000, baseProduction: 200 }
];

async function initGame() {
    try {
        const response = await fetch(`${API_BASE}/user/state`);
        if (!response.ok) throw new Error('Network response was not ok.');
        const data = await response.json();
        
        updateGameState(data);
        if (gameState.activeSkin) {
            applySkin(gameState.activeSkin.colors);
        }
        
        renderAll();
        startGameLoop();
    } catch (error) {
        console.error('Error loading game:', error);
        showNotification('Ошибка загрузки игры', 'error');
    }
}

function startGameLoop() {
    setInterval(visualAutoProduction, 1000);
    setInterval(flushPendingClicks, 5000);
}

function visualAutoProduction() {
    if (gameState.perSecond > 0) {
        gameState.score += gameState.perSecond;
        updateDisplay();
    }
}

const character = document.getElementById('character');

function addCharacterJump() {
    if (!character.classList.contains('happy')) {
        character.classList.add('happy');
        
        // Один раз удалить класс после окончания анимации
        character.addEventListener('animationend', () => {
            character.classList.remove('happy');
        }, { once: true });
    }
}

document.getElementById('clickButton').addEventListener('click', (e) => {
    gameState.score += gameState.clickPower;
    pendingClicks += gameState.clickPower;
    updateDisplay();

    addCharacterJump();

    createParticle(e.clientX, e.clientY, `+${gameState.clickPower}`);
});

async function flushPendingClicks() {
    if (pendingClicks === 0 || isSendingClicks) return;
    
    isSendingClicks = true;
    const clicksToSend = pendingClicks;
    pendingClicks = 0;
    
    try {
        const response = await fetch(`${API_BASE}/user/click`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({clickPower: clicksToSend})
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Server error');
        
        updateGameState(data);
        updateDisplay();
        
        if (data.unlocked_achievements?.length > 0) {
            data.unlocked_achievements.forEach(ach => showNotification(`🎉 ${ach.name}!`, 'success'));
            await syncAchievements();
        }
    } catch (error) {
        console.error('Error flushing clicks:', error);
        pendingClicks += clicksToSend;
    } finally {
        isSendingClicks = false;
    }
}

async function buyUpgrade(upgradeName) {
    await flushPendingClicks();
    try {
        const response = await fetch(`${API_BASE}/upgrades/buy`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: upgradeName})
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Server error on purchase');

        updateGameState(data);
        updateDisplay();
        showNotification(`✅ Куплено: ${upgradeName}!`, 'success');
        
        if (data.unlocked_achievements?.length > 0) {
            data.unlocked_achievements.forEach(ach => showNotification(`🎉 ${ach.name}!`, 'success'));
            await syncAchievements();
        }
    } catch (error) {
        console.error('Error buying upgrade:', error);
        showNotification(`❌ ${error.message}`, 'error');
    }
}

async function buySkin(skinId) {
    await flushPendingClicks();
    try {
        const response = await fetch(`${API_BASE}/skins/buy`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({skin_id: skinId})
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Ошибка при покупке скина');
        
        updateGameState(data);
        updateDisplay();
        showNotification('✅ Скин куплен!', 'success');
    } catch (error) {
        console.error('Error buying skin:', error.message);
        showNotification(`❌ ${error.message}`, 'error');
    }
}

async function activateSkin(skinId) {
    try {
        const response = await fetch(`${API_BASE}/skins/activate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({skin_id: skinId})
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Ошибка активации');

        gameState.activeSkin = data.skin;
        applySkin(data.skin.colors);

        gameState.skins.forEach(s => { s.is_active = (s.skin_id === skinId); });
        
        renderSkins();
        showNotification('✅ Скин активирован!', 'success');
    } catch (error) {
        console.error('Error activating skin:', error.message);
        showNotification(`❌ ${error.message}`, 'error');
    }
}

function updateGameState(data) {
    if (data.score !== undefined) gameState.score = data.score;
    if (data.user_score !== undefined) gameState.score = data.user_score;
    if (data.per_second !== undefined) gameState.perSecond = data.per_second;
    if (data.upgrades) gameState.upgrades = data.upgrades;
    if (data.achievements) {
        gameState.achievements = Array.isArray(data.achievements) ? data.achievements : [];
    }
    if (data.skins) gameState.skins = data.skins;
    if (data.upgrade) {
        const index = gameState.upgrades.findIndex(u => u.name === data.upgrade.name);
        if (index >= 0) gameState.upgrades[index] = data.upgrade;
        else gameState.upgrades.push(data.upgrade);
    }
    if (data.skin) {
        const index = gameState.skins.findIndex(s => s.skin_id === data.skin.skin_id);
        if (index >= 0) gameState.skins[index] = data.skin;
        else gameState.skins.push(data.skin);
    }
}

function renderAll() {
    renderShop();
    renderSkins();
    renderAchievements();
    updateDisplay();
}

function updateDisplay() {
    document.getElementById('score').textContent = formatNumber(gameState.score);
    document.getElementById('perSecond').textContent = formatNumber(gameState.perSecond);
    renderShop();
    renderSkins();
    renderAchievements();
}

function renderShop() {
    const shopContainer = document.getElementById('shopItems');
    shopContainer.innerHTML = '';
    upgradesData.forEach(template => {
        const userUpgrade = gameState.upgrades.find(u => u.name === template.name) || {};
        const level = userUpgrade.level || 0;
        const currentCost = userUpgrade.current_cost || template.baseCost;
        const production = userUpgrade.current_production || 0;
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
                <div style="margin-top: 10px; font-size: 14px; color: #667eea;">Производство: ${production}/сек</div>
            </div>
            <button class="shop-item-button" onclick="buyUpgrade('${template.name}')" ${!canAfford ? 'disabled' : ''}>Купить</button>`;
        shopContainer.appendChild(item);
    });
}

function renderSkins() {
    const container = document.getElementById('skinsContainer');
    container.innerHTML = '';
    if (!gameState.skins) return;
    gameState.skins.forEach(skin => {
        const item = document.createElement('div');
        item.className = 'shop-item skin';
        if (skin.is_owned) item.classList.add('owned');
        if (skin.is_active) item.classList.add('active');
        
        let buttonHtml;
        if (skin.is_active) {
            buttonHtml = `<button class="shop-item-button" disabled>Активен</button>`;
        } else if (skin.is_owned) {
            buttonHtml = `<button class="shop-item-button" onclick="activateSkin(${skin.skin_id})">Применить</button>`;
        } else {
            const canAfford = gameState.score >= skin.base_cost;
            buttonHtml = `<button class="shop-item-button" onclick="buySkin(${skin.skin_id})" ${!canAfford ? 'disabled' : ''}>Купить</button>`;
        }

        item.innerHTML = `
            <div class="shop-item-icon">🎨</div>
            <div class="shop-item-info">
                <div class="shop-item-name">${skin.name}</div>
                <div class="shop-item-description">${skin.description}</div>
                <div class="shop-item-stats">
                    ${skin.is_owned ? `<span style="color: #4CAF50; font-weight: bold;">✓ Куплен</span>` : `<span class="shop-item-cost">${formatNumber(skin.base_cost)}</span>`}
                </div>
            </div>
            ${buttonHtml}`;
        container.appendChild(item);
    });
}

async function syncAchievements() {
    try {
        const response = await fetch(`${API_BASE}/achievements/`);
        if (!response.ok) return;
        const achievementsData = await response.json()
        if (Array.isArray(achievementsData)) {
            gameState.achievements = achievementsData;
            renderAchievements();
        } else {
            console.warn('Achievements data is not array: ', achievementsData);
        }
    } catch (error) { 
            console.error('Error syncing achievements:', error);
    }
}

function renderAchievements() {
    const container = document.getElementById('achievementsContainer');
    container.innerHTML = '';

    if (!Array.isArray(gameState.achievements)) return;
    
    gameState.achievements.forEach(achievement => {
        const item = document.createElement('div');
        item.className = `achievement-item ${achievement.is_unlocked ? 'unlocked' : 'locked'}`;
        item.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
            <div class="achievement-status ${achievement.is_unlocked ? 'unlocked' : 'locked'}">
                ${achievement.is_unlocked ? '✓ Разблокировано' : '🔒 Заблокировано'}
            </div>`;
        container.appendChild(item);
    });
}

function applySkin(colors) {
    document.body.style.background = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`;
    const header = document.querySelector('.header');
    if (header) header.style.background = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`;
    const clickButton = document.querySelector('.click-button');
    if (clickButton) clickButton.style.background = colors.button;
    const character = document.querySelector('.char-body');
    if (character) character.setAttribute('fill', colors.character);
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const tabMap = { game: { btn: 0, content: 'gameTab' }, shop: { btn: 1, content: 'shopTab' }, achievements: { btn: 2, content: 'achievementsTab' } };
    if (tabMap[tabName]) {
        document.querySelectorAll('.tab-btn')[tabMap[tabName].btn].classList.add('active');
        document.getElementById(tabMap[tabName].content).classList.add('active');
    }
}

function createParticle(x, y, text) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.textContent = text;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    document.getElementById('particlesContainer').appendChild(particle);
    setTimeout(() => particle.remove(), 1000);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return Math.floor(num).toLocaleString();
}

window.addEventListener('DOMContentLoaded', initGame);
