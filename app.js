// app.js
import { CONFIG } from './config.js';

class GeolocationApp {
    constructor() {
        this.user = null;
        this.currentPhoto = null;
        this.currentPosition = null;
        this.watchId = null;
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

            loginBtn: document.getElementById('loginBtn'),
            registerBtn: document.getElementById('registerBtn'),
            sendGeoBtn: document.getElementById('sendGeoBtn'),
            logoutBtn: document.getElementById('logoutBtn'),

            userName: document.getElementById('userName'),
            userDisplay: document.getElementById('userDisplay'),
            userAvatar: document.getElementById('userAvatar'),

            loginName: document.getElementById('loginName'),
            loginPassword: document.getElementById('loginPassword'),
            registerName: document.getElementById('registerName'),
            registerEmail: document.getElementById('registerEmail'),
            registerPassword: document.getElementById('registerPassword'),

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
            switchToRegister: document.getElementById('switchToRegister'),
            switchToLogin: document.getElementById('switchToLogin'),
        };
    }

    initializeEventListeners() {
        this.elements.loginBtn.addEventListener('click', () => this.login());
        this.elements.registerBtn.addEventListener('click', () => this.register());
        this.elements.sendGeoBtn.addEventListener('click', () => this.sendGeolocation());
        this.elements.logoutBtn.addEventListener('click', () => this.logout());
        this.elements.photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        this.elements.removePhotoBtn.addEventListener('click', () => this.removePhoto());
        this.elements.navSend.addEventListener('click', () => this.switchTab('send'));
        this.elements.navHistory.addEventListener('click', () => this.switchTab('history'));
        this.elements.navAdmin.addEventListener('click', () => this.openAdminPanel());
        this.elements.switchToRegister.addEventListener('click', () => this.switchForm('register'));
        this.elements.switchToLogin.addEventListener('click', () => this.switchForm('login'));
    }

    // ==================== АВТОРИЗАЦИЯ ====================

    checkAuth() {
        console.log('🔍 Проверка авторизации...');
        
        const userData = localStorage.getItem('geolocation_user');
        if (userData) {
            try {
                this.user = JSON.parse(userData);
                this.isAuthorized = true;
                this.showGeoSendSection();
                this.updateUserInfo();
                this.loadHistory();
                this.startGeolocation();
                this.showStatus(`✅ Добро пожаловать, ${this.user.name}!`, 'success');
                return;
            } catch (e) {
                console.error('Ошибка чтения пользователя:', e);
            }
        }
        
        this.showAuthSection();
    }

    // Регистрация
    register() {
        const name = this.elements.registerName.value.trim();
        const email = this.elements.registerEmail.value.trim();
        const password = this.elements.registerPassword.value.trim();

        if (!name || !email || !password) {
            this.showStatus('❌ Заполните все поля', 'error');
            return;
        }

        if (password.length < 4) {
            this.showStatus('❌ Пароль должен быть минимум 4 символа', 'error');
            return;
        }

        // Проверка, не занят ли пользователь
        const users = JSON.parse(localStorage.getItem('geolocation_users') || '[]');
        if (users.find(u => u.email === email)) {
            this.showStatus('❌ Пользователь с таким email уже зарегистрирован', 'error');
            return;
        }

        // Сохраняем пользователя
        const newUser = {
            id: Date.now(),
            name: name,
            email: email,
            password: password,
            registeredAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('geolocation_users', JSON.stringify(users));

        // Автоматический вход
        this.user = newUser;
        this.isAuthorized = true;
        localStorage.setItem('geolocation_user', JSON.stringify(newUser));

        this.showStatus('✅ Регистрация успешна!', 'success');
        this.showGeoSendSection();
        this.updateUserInfo();
        this.loadHistory();
        this.startGeolocation();
    }

    // Вход
    login() {
        const name = this.elements.loginName.value.trim();
        const password = this.elements.loginPassword.value.trim();

        if (!name || !password) {
            this.showStatus('❌ Введите имя и пароль', 'error');
            return;
        }

        const users = JSON.parse(localStorage.getItem('geolocation_users') || '[]');
        const user = users.find(u => 
            (u.name.toLowerCase() === name.toLowerCase() || u.email.toLowerCase() === name.toLowerCase()) &&
            u.password === password
        );

        if (!user) {
            this.showStatus('❌ Неверное имя или пароль', 'error');
            return;
        }

        this.user = user;
        this.isAuthorized = true;
        localStorage.setItem('geolocation_user', JSON.stringify(user));

        this.showStatus('✅ Вход выполнен!', 'success');
        this.showGeoSendSection();
        this.updateUserInfo();
        this.loadHistory();
        this.startGeolocation();
    }

    // Переключение между формами
    switchForm(form) {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (form === 'register') {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        } else {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        }
    }

    updateUserInfo() {
        if (!this.user) return;
        
        this.elements.userName.textContent = this.user.name;
        this.elements.userDisplay.textContent = this.user.name;
        
        const initials = this.user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        this.elements.userAvatar.src = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%232c3e7a"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial"%3E${initials}%3C/text%3E%3C/svg%3E`;
        
        this.elements.userInfo?.classList.remove('hidden');
    }

    // ==================== ГЕОЛОКАЦИЯ ====================

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

    // ==================== ФОТО ====================

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

    // ==================== ОТПРАВКА ====================

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
            const userName = this.user?.name || 'Пользователь';
            const yandexMapsUrl = `https://yandex.ru/maps/?pt=${lng},${lat}&z=17&l=map`;

            let messageText = `📍 Геолокация от ${userName}\n`;
            messageText += `🕐 Время: ${timestamp}\n`;
            messageText += `📌 Координаты: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n`;
            messageText += `💬 Комментарий: ${comment}\n`;
            messageText += `🗺️ Яндекс.Карты: ${yandexMapsUrl}`;

            const messageData = {
                CHAT_ID: CONFIG.CHAT_ID || null,
                MESSAGE: messageText
            };

            if (this.currentPhoto) {
                const compressedPhoto = await this.compressImage(this.currentPhoto, 800, 800);
                const base64Only = compressedPhoto.split(',')[1];
                messageData.FILES = {
                    n1: ['photo.jpg', base64Only]
                };
            }

            console.log('📤 Отправка:', messageData);

            const response = await fetch(`${CONFIG.REST_URL}im.message.add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messageData)
            });

            const data = await response.json();

            if (data.result) {
                this.showStatus('✅ Геолокация отправлена!', 'success');
                this.elements.comment.value = '';
                this.removePhoto();

                this.saveToHistory({
                    time: timestamp,
                    comment: comment,
                    coords: this.currentPosition,
                    photo: this.currentPhoto
                });
                this.loadHistory();
            } else {
                throw new Error(data.error_description || 'Ошибка отправки');
            }
        } catch (error) {
            console.error('❌ Ошибка:', error);
            this.showStatus(`❌ Ошибка: ${error.message}`, 'error');
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

    // ==================== ИСТОРИЯ ====================

    saveToHistory(item) {
        const history = JSON.parse(localStorage.getItem('geolocation_history') || '[]');
        history.unshift({
            ...item,
            userId: this.user?.id,
            userName: this.user?.name
        });
        if (history.length > 100) history.pop();
        localStorage.setItem('geolocation_history', JSON.stringify(history));
    }

    loadHistory() {
        const history = JSON.parse(localStorage.getItem('geolocation_history') || '[]');
        const userHistory = history.filter(item => item.userId === this.user?.id);
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

    // ==================== НАВИГАЦИЯ ====================

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
        if (this.elements.userInfo) this.elements.userInfo.classList.add('hidden');
        this.elements.sendGeoBtn.disabled = true;
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
            localStorage.removeItem('geolocation_user');
            this.user = null;
            this.isAuthorized = false;
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