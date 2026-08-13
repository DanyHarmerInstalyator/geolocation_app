// app.js
import { CONFIG } from './config.js';

class GeolocationApp {
    constructor() {
        this.user = null;
        this.currentPhoto = null;
        this.currentPosition = null;
        this.watchId = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.domain = null;
        this.isAuthorized = false;

        this.initializeElements();
        this.initializeEventListeners();
        this.checkAuth();
    }

    initializeElements() {
        this.elements = {
            authSection: document.getElementById('authSection'),
            geoSendSection: document.getElementById('geoSendSection'),
            historySection: document.getElementById('historySection'),

            authBtn: document.getElementById('authBtn'),
            sendGeoBtn: document.getElementById('sendGeoBtn'),
            logoutBtn: document.getElementById('logoutBtn'),

            userInfo: document.getElementById('userInfo'),
            userName: document.getElementById('userName'),
            userAvatar: document.getElementById('userAvatar'),

            comment: document.getElementById('comment'),
            photoInput: document.getElementById('photoInput'),
            photoPreview: document.getElementById('photoPreview'),
            previewImg: document.getElementById('previewImg'),
            removePhotoBtn: document.getElementById('removePhotoBtn'),

            geoStatus: document.getElementById('geoStatus'),
            geoStatusText: document.getElementById('geoStatusText'),
            geoCoords: document.getElementById('geoCoords'),
            lat: document.getElementById('lat'),
            lng: document.getElementById('lng'),

            sendStatus: document.getElementById('sendStatus'),
            historyList: document.getElementById('historyList'),

            navSend: document.getElementById('navSend'),
            navHistory: document.getElementById('navHistory'),
            navAdmin: document.getElementById('navAdmin'),
        };
    }

    initializeEventListeners() {
        this.elements.authBtn.addEventListener('click', () => this.authorize());
        this.elements.sendGeoBtn.addEventListener('click', () => this.sendGeolocation());
        this.elements.logoutBtn.addEventListener('click', () => this.logout());
        this.elements.photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        this.elements.removePhotoBtn.addEventListener('click', () => this.removePhoto());
        this.elements.navSend.addEventListener('click', () => this.switchTab('send'));
        this.elements.navHistory.addEventListener('click', () => this.switchTab('history'));
        this.elements.navAdmin.addEventListener('click', () => this.openAdminPanel());
    }

    // 🔑 Авторизация через OAuth.
    // ВАЖНО: пуш-подтверждение входа с телефона — это не кастомная deep-link-схема,
    // а встроенный механизм самого портала Битрикс24. Он срабатывает сам,
    // когда пользователь заходит на стандартную страницу авторизации в браузере,
    // если у него включено подтверждение входа через мобильное приложение.
    // Схемы вида bitrix24://oauth/authorize/ не существует — такая ссылка
    // просто открывает приложение "в пустоту", без передачи ему контекста
    // авторизации, поэтому оно ничего не показывает и ничего не подтверждает.
    authorize() {
        const authUrl =
            `https://hdl.bitrix24.ru/oauth/authorize/` +
            `?client_id=${CONFIG.CLIENT_ID}` +
            `&response_type=code` +
            `&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}`;

        console.log('🔑 Переход на авторизацию:', authUrl);
        window.location.href = authUrl;
    }

    // Проверка авторизации
    checkAuth() {
        console.log('🔍 Проверка авторизации...');

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
            console.log('✅ Получен code:', code);
            window.history.replaceState({}, document.title, window.location.pathname);
            this.exchangeCodeForToken(code);
            return;
        }

        const token = localStorage.getItem('b24_token');
        const domain = localStorage.getItem('b24_domain');
        const refreshToken = localStorage.getItem('b24_refresh_token');

        if (token && domain) {
            console.log('💾 Восстанавливаем сессию из localStorage');
            this.accessToken = token;
            this.domain = domain;
            this.refreshToken = refreshToken;
            this.isAuthorized = true;
            this.showGeoSendSection();
            this.getUserInfo();
            return;
        }

        console.log('❌ Нет данных авторизации');
        this.showAuthSection();
    }

    // Обмен code на access_token — через Worker
    async exchangeCodeForToken(code) {
        console.log('🔄 Обмен code на token...');
        this.showStatus('⏳ Обмен кода на токен...', 'loading');

        try {
            const response = await fetch(`${CONFIG.API_BASE}/api/oauth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    redirect_uri: CONFIG.REDIRECT_URI,
                }),
            });

            const data = await response.json();
            console.log('📥 Ответ обмена:', data);

            if (data.access_token && data.domain) {
                this.accessToken = data.access_token;
                this.refreshToken = data.refresh_token;
                this.domain = data.domain;

                localStorage.setItem('b24_token', data.access_token);
                localStorage.setItem('b24_refresh_token', data.refresh_token || '');
                localStorage.setItem('b24_domain', data.domain);

                window.history.pushState('', '', window.location.pathname);
                await this.getUserInfo();
            } else {
                console.log('⚠️ Не удалось получить токен, пробуем вебхук...');
                await this.getUserViaWebhook();
            }
        } catch (error) {
            console.error('❌ Ошибка обмена:', error);
            await this.getUserViaWebhook();
        }
    }

    // Универсальный вызов REST-метода через Worker
    async callRest(method, params = {}) {
        const body = { params };

        if (this.accessToken && this.domain) {
            body.auth = { domain: this.domain, access_token: this.accessToken };
        }

        const response = await fetch(`${CONFIG.API_BASE}/api/rest/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        return response.json();
    }

    // Получение данных пользователя
    async getUserInfo() {
        console.log('🔄 Получение данных пользователя...');
        this.showStatus('⏳ Загрузка данных пользователя...', 'loading');

        try {
            const data = await this.callRest('user.current');
            console.log('📦 Данные пользователя:', data);

            if (data.result) {
                this.user = data.result;
                this.isAuthorized = true;
                localStorage.setItem('b24_user_id', this.user.ID);
                this.showGeoSendSection();
                this.updateUserInfo();
                this.loadHistory();
                this.startGeolocation();
                this.showStatus(`✅ Добро пожаловать, ${this.user.NAME || this.user.LOGIN || 'Пользователь'}!`, 'success');
                return;
            }

            if (data.error === 'expired_token' && this.refreshToken) {
                console.log('🔄 Обновляем токен...');
                const refreshed = await this.tryRefreshToken();
                if (refreshed) {
                    return this.getUserInfo();
                }
            }

            throw new Error('Не удалось получить данные пользователя');
        } catch (error) {
            console.error('❌ Ошибка:', error);
            await this.getUserViaWebhook();
        }
    }

    async tryRefreshToken() {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/api/oauth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: this.refreshToken }),
            });
            const data = await response.json();
            if (data.access_token) {
                this.accessToken = data.access_token;
                this.refreshToken = data.refresh_token;
                this.domain = data.domain;
                localStorage.setItem('b24_token', data.access_token);
                localStorage.setItem('b24_refresh_token', data.refresh_token || '');
                localStorage.setItem('b24_domain', data.domain);
                return true;
            }
        } catch (e) {
            console.error('❌ Не удалось обновить токен:', e);
        }
        return false;
    }

    // Fallback: получение данных через вебхук
    async getUserViaWebhook() {
        console.log('🔄 Fallback: получение данных через вебхук...');

        this.accessToken = null;
        this.domain = null;

        try {
            const data = await this.callRest('user.current');

            if (data.result) {
                this.user = data.result;
                this.isAuthorized = true;
                localStorage.setItem('b24_user_id', this.user.ID);
                this.showGeoSendSection();
                this.updateUserInfo();
                this.loadHistory();
                this.startGeolocation();
                this.showStatus(`⚠️ Работа через вебхук (пользователь: ${this.user.NAME || this.user.LOGIN})`, 'loading');
                return;
            }

            throw new Error('Не удалось получить данные пользователя');
        } catch (error) {
            console.error('❌ Ошибка fallback:', error);
            localStorage.removeItem('b24_token');
            localStorage.removeItem('b24_refresh_token');
            localStorage.removeItem('b24_domain');
            localStorage.removeItem('b24_user_id');
            this.showAuthSection();
            this.showStatus('❌ Ошибка авторизации. Попробуйте снова.', 'error');
        }
    }

    updateUserInfo() {
        if (!this.user) return;

        const name = this.user.NAME || this.user.LOGIN || this.user.EMAIL || 'Пользователь';
        this.elements.userName.textContent = name;

        const initials = name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
        this.elements.userAvatar.src = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%232c3e7a"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial"%3E${initials}%3C/text%3E%3C/svg%3E`;

        this.elements.userInfo.classList.remove('hidden');
    }

    startGeolocation() {
        if (!navigator.geolocation) {
            this.elements.geoStatusText.textContent = '❌ Геолокация не поддерживается';
            return;
        }

        this.elements.geoStatusText.textContent = '📍 Определение местоположения...';

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handlePosition(position),
            (error) => this.handleGeoError(error),
            CONFIG.GEOLOCATION
        );
    }

    handlePosition(position) {
        this.currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
        };

        this.elements.geoStatusText.textContent = '✅ Местоположение определено';
        const dot = this.elements.geoStatus.querySelector('.dot');
        if (dot) dot.classList.add('active');
        this.elements.geoCoords.classList.remove('hidden');
        this.elements.lat.textContent = this.currentPosition.lat.toFixed(6);
        this.elements.lng.textContent = this.currentPosition.lng.toFixed(6);

        this.elements.sendGeoBtn.disabled = false;
    }

    handleGeoError(error) {
        console.error('❌ Ошибка геолокации:', error);
        let message = '❌ Ошибка определения местоположения';

        switch (error.code) {
            case 1:
                message = '❌ Доступ к геолокации запрещен. Разрешите доступ в настройках браузера.';
                break;
            case 2:
                message = '❌ Информация о местоположении недоступна.';
                break;
            case 3:
                message = '⏱️ Превышено время ожидания геолокации.';
                break;
        }

        this.elements.geoStatusText.textContent = message;
        this.elements.sendGeoBtn.disabled = true;
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение');
            this.elements.photoInput.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Файл слишком большой. Максимальный размер 5MB');
            this.elements.photoInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentPhoto = e.target.result;
            this.elements.previewImg.src = this.currentPhoto;
            this.elements.photoPreview.classList.remove('hidden');
            this.elements.photoInput.value = '';
        };
        reader.onerror = () => {
            alert('Ошибка чтения файла');
            this.elements.photoInput.value = '';
        };
        reader.readAsDataURL(file);
    }

    removePhoto() {
        this.currentPhoto = null;
        this.elements.photoPreview.classList.add('hidden');
        this.elements.previewImg.src = '';
    }

    async sendGeolocation() {
        if (!this.currentPosition) {
            this.showStatus('❌ Местоположение не определено', 'error');
            return;
        }

        const comment = this.elements.comment.value.trim() || 'Отправка геолокации';
        const timestamp = new Date().toLocaleString('ru-RU');
        const lat = this.currentPosition.lat;
        const lng = this.currentPosition.lng;

        this.elements.sendGeoBtn.disabled = true;
        this.showStatus('⏳ Отправка...', 'loading');

        try {
            const userName = this.user?.NAME || this.user?.LOGIN || 'Пользователь';

            // Ссылки на Яндекс.Карты
            const yandexMapsUrl = `https://yandex.ru/maps/?pt=${lng},${lat}&z=17&l=map`;
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            const mapLink = isMobile ? `yandexmaps://maps.yandex.ru/?pt=${lng},${lat}&z=17&l=map` : yandexMapsUrl;

            let messageText = `📍 Геолокация от ${userName}\n`;
            messageText += `🕐 Время: ${timestamp}\n`;
            messageText += `📌 Координаты: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n`;
            messageText += `💬 Комментарий: ${comment}\n`;
            messageText += `🗺️ Яндекс.Карты: ${mapLink}`;

            const messageParams = {
                CHAT_ID: CONFIG.CHAT_ID || null,
                MESSAGE: messageText
            };

            if (this.currentPhoto) {
                const compressedPhoto = await this.compressImage(this.currentPhoto, 800, 800);
                const base64Only = compressedPhoto.split(',')[1];
                messageParams.FILES = {
                    n1: ['photo.jpg', base64Only]
                };
            }

            console.log('📤 Отправка:', messageParams);

            const data = await this.callRest('im.message.add', messageParams);
            console.log('📥 Ответ:', data);

            if (data.result) {
                this.showStatus('✅ Геолокация успешно отправлена в чат!', 'success');
                this.elements.comment.value = '';
                this.removePhoto();

                this.saveToHistory({
                    time: timestamp,
                    comment: comment,
                    coords: this.currentPosition,
                    photo: this.currentPhoto,
                    mapLink: mapLink
                });
                this.loadHistory();
            } else {
                throw new Error(data.error_description || data.error || 'Ошибка отправки');
            }
        } catch (error) {
            console.error('❌ Ошибка:', error);
            this.showStatus(`❌ Ошибка: ${error.message}`, 'error');

            this.saveToHistory({
                time: timestamp,
                comment: comment + ' (не отправлено)',
                coords: this.currentPosition,
                photo: this.currentPhoto,
                error: error.message
            });
        } finally {
            this.elements.sendGeoBtn.disabled = false;
        }
    }

    compressImage(dataUrl, maxWidth, maxHeight) {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
                img.src = dataUrl;
            } catch (error) {
                reject(error);
            }
        });
    }

    saveToHistory(item) {
        const history = JSON.parse(localStorage.getItem('geolocation_history') || '[]');
        history.unshift({
            ...item,
            userId: this.user?.ID,
            userName: this.user?.NAME || this.user?.LOGIN
        });
        if (history.length > 100) history.pop();
        localStorage.setItem('geolocation_history', JSON.stringify(history));
    }

    loadHistory() {
        const history = JSON.parse(localStorage.getItem('geolocation_history') || '[]');
        const userHistory = history.filter(item => item.userId === this.user?.ID);
        this.renderHistory(userHistory);
    }

    renderHistory(history) {
        const list = this.elements.historyList;
        if (!list) return;

        if (history.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">История отправок пуста</p>';
            return;
        }

        list.innerHTML = history.map(item => {
            const lat = item.coords?.lat;
            const lng = item.coords?.lng;
            const mapLink = lat && lng ?
                `https://yandex.ru/maps/?pt=${lng},${lat}&z=17&l=map` :
                '#';

            return `
                <div class="history-item">
                    <div class="time">${item.time || 'Время не указано'}</div>
                    <div class="content">
                        <div class="comment">${item.comment || 'Без комментария'}</div>
                        <div class="coords">
                            📍 ${lat && lng ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Координаты не указаны'}
                            ${lat && lng ? ` <a href="${mapLink}" target="_blank" style="color:#2c3e7a;text-decoration:none;">🗺️ Яндекс.Карты</a>` : ''}
                        </div>
                        ${item.photo ? `<img src="${item.photo}" alt="Фото" class="photo" loading="lazy">` : ''}
                        ${item.error ? `<div style="color:red;font-size:12px;margin-top:4px;">⚠️ ${item.error}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    switchTab(tab) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        if (tab === 'send') {
            this.elements.navSend.classList.add('active');
            this.elements.geoSendSection.classList.remove('hidden');
            this.elements.historySection.classList.add('hidden');
        } else if (tab === 'history') {
            this.elements.navHistory.classList.add('active');
            this.elements.geoSendSection.classList.add('hidden');
            this.elements.historySection.classList.remove('hidden');
            this.loadHistory();
        }
    }

    openAdminPanel() {
        if (!this.isAuthorized) {
            this.showStatus('❌ Необходимо авторизоваться', 'error');
            return;
        }
        window.open('/admin.html', '_blank');
    }

    showStatus(message, type) {
        const status = this.elements.sendStatus;
        if (!status) return;

        status.textContent = message;
        status.className = 'send-status ' + type;
        status.classList.remove('hidden');

        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                status.classList.add('hidden');
            }, 5000);
        }
    }

    showAuthSection() {
        this.elements.authSection.classList.remove('hidden');
        this.elements.geoSendSection.classList.add('hidden');
        this.elements.historySection.classList.add('hidden');
        this.elements.userInfo.classList.add('hidden');
        this.elements.sendGeoBtn.disabled = true;

        const authBtn = this.elements.authBtn;
        authBtn.textContent = '🔑 Войти через Битрикс24';
        authBtn.classList.remove('btn-primary');
        authBtn.classList.add('btn-success');

        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    }

    showGeoSendSection() {
        this.elements.authSection.classList.add('hidden');
        this.elements.geoSendSection.classList.remove('hidden');
        this.elements.historySection.classList.add('hidden');
        this.elements.navSend.classList.add('active');
    }

    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('b24_token');
            localStorage.removeItem('b24_refresh_token');
            localStorage.removeItem('b24_domain');
            localStorage.removeItem('b24_user_id');
            localStorage.removeItem('geolocation_history');

            this.user = null;
            this.isAuthorized = false;
            this.accessToken = null;
            this.refreshToken = null;
            this.domain = null;
            this.currentPosition = null;

            if (this.watchId) {
                navigator.geolocation.clearWatch(this.watchId);
            }

            this.showAuthSection();
            this.showStatus('👋 Вы вышли из системы', 'loading');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GeolocationApp();
});
