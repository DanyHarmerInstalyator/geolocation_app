// app.js
import { CONFIG } from './config.js';

class GeolocationApp {
    constructor() {
        this.user = null;
        this.history = [];
        this.currentPhoto = null;
        this.currentPosition = null;
        this.watchId = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.checkAuth();
        this.startGeolocation();
    }

    initializeElements() {
        // Элементы DOM
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
            navAdmin: document.getElementById('navAdmin')
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

    // Авторизация через OAuth
    authorize() {
        const authUrl = `https://hdl.bitrix24.ru/oauth/authorize/?client_id=${CONFIG.CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}`;
        window.location.href = authUrl;
    }

    checkAuth() {
        const hash = window.location.hash;
        if (hash) {
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            if (accessToken) {
                localStorage.setItem('b24_token', accessToken);
                window.history.pushState('', '', window.location.pathname);
                this.getUserInfo(accessToken);
                return;
            }
        }

        const token = localStorage.getItem('b24_token');
        if (token) {
            this.getUserInfo(token);
        } else {
            this.showAuthSection();
        }
    }

    async getUserInfo(token) {
        try {
            const response = await fetch(`${CONFIG.REST_URL}user.current`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    auth: token
                })
            });

            const data = await response.json();
            if (data.result) {
                this.user = data.result;
                this.showGeoSendSection();
                this.updateUserInfo();
                this.loadHistory();
            } else {
                throw new Error('Не удалось получить данные пользователя');
            }
        } catch (error) {
            console.error('Ошибка получения данных пользователя:', error);
            this.showAuthSection();
        }
    }

    updateUserInfo() {
        this.elements.userName.textContent = this.user.NAME || this.user.LOGIN || 'Пользователь';
        if (this.user.PERSONAL_PHOTO) {
            this.elements.userAvatar.src = this.user.PERSONAL_PHOTO;
        }
        this.elements.userInfo.classList.remove('hidden');
    }

    // Геолокация
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
        this.elements.geoStatus.querySelector('.dot').classList.add('active');
        this.elements.geoCoords.classList.remove('hidden');
        this.elements.lat.textContent = this.currentPosition.lat.toFixed(6);
        this.elements.lng.textContent = this.currentPosition.lng.toFixed(6);
        
        this.elements.sendGeoBtn.disabled = false;
    }

    handleGeoError(error) {
        console.error('Ошибка геолокации:', error);
        this.elements.geoStatusText.textContent = '❌ Ошибка определения местоположения';
        this.elements.sendGeoBtn.disabled = true;
        
        // Предложить ввести координаты вручную
        if (error.code === 1) {
            this.showManualCoordsInput();
        }
    }

    showManualCoordsInput() {
        // Можно добавить модальное окно для ручного ввода координат
        console.log('Предложить ручной ввод координат');
    }

    // Загрузка фото
    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Проверка размера (максимум 5MB)
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
        reader.readAsDataURL(file);
    }

    removePhoto() {
        this.currentPhoto = null;
        this.elements.photoPreview.classList.add('hidden');
        this.elements.previewImg.src = '';
    }

    // Отправка геолокации
    async sendGeolocation() {
        if (!this.currentPosition) {
            this.showStatus('❌ Местоположение не определено', 'error');
            return;
        }

        const comment = this.elements.comment.value.trim() || 'Отправка геолокации';
        const timestamp = new Date().toLocaleString('ru-RU');

        this.elements.sendGeoBtn.disabled = true;
        this.showStatus('⏳ Отправка...', 'loading');

        try {
            const token = localStorage.getItem('b24_token');
            
            // Формируем сообщение
            let messageText = `📍 Геолокация от ${this.user.NAME || this.user.LOGIN}\n`;
            messageText += `🕐 Время: ${timestamp}\n`;
            messageText += `📌 Координаты: ${this.currentPosition.lat}, ${this.currentPosition.lng}\n`;
            messageText += `💬 Комментарий: ${comment}\n`;
            messageText += `🔗 Карта: https://www.openstreetmap.org/?mlat=${this.currentPosition.lat}&mlon=${this.currentPosition.lng}&zoom=15`;

            // Отправляем сообщение в чат
            const messageData = {
                auth: token,
                CHAT_ID: CONFIG.CHAT_ID,
                MESSAGE: messageText
            };

            // Если есть фото, добавляем как вложение
            if (this.currentPhoto) {
                // Сжимаем фото перед отправкой
                const compressedPhoto = await this.compressImage(this.currentPhoto, 800, 800);
                messageData.FILES = {
                    'photo.jpg': compressedPhoto
                };
            }

            const response = await fetch(`${CONFIG.REST_URL}im.message.add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messageData)
            });

            const data = await response.json();

            if (data.result) {
                this.showStatus('✅ Геолокация успешно отправлена!', 'success');
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
            console.error('Ошибка отправки:', error);
            this.showStatus(`❌ Ошибка: ${error.message}`, 'error');
        } finally {
            this.elements.sendGeoBtn.disabled = false;
        }
    }

    // Сжатие изображения
    compressImage(dataUrl, maxWidth, maxHeight) {
        return new Promise((resolve) => {
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
                
                // Конвертируем в base64 с сжатием
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = dataUrl;
        });
    }

    // История
    saveToHistory(item) {
        const history = JSON.parse(localStorage.getItem('geolocation_history') || '[]');
        history.unshift(item);
        localStorage.setItem('geolocation_history', JSON.stringify(history));
    }

    loadHistory() {
        const history = JSON.parse(localStorage.getItem('geolocation_history') || '[]');
        this.renderHistory(history);
    }

    renderHistory(history) {
        const list = this.elements.historyList;
        if (history.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">История отправок пуста</p>';
            return;
        }

        list.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="time">${item.time}</div>
                <div class="content">
                    <div class="comment">${item.comment}</div>
                    <div class="coords">📍 ${item.coords.lat.toFixed(6)}, ${item.coords.lng.toFixed(6)}</div>
                    ${item.photo ? `<img src="${item.photo}" alt="Фото" class="photo">` : ''}
                </div>
            </div>
        `).join('');
    }

    // Навигация
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

    // Отображение статуса
    showStatus(message, type) {
        const status = this.elements.sendStatus;
        status.textContent = message;
        status.className = 'send-status ' + type;
        status.classList.remove('hidden');
        
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                status.classList.add('hidden');
            }, 5000);
        }
    }

    // Переключение секций
    showAuthSection() {
        this.elements.authSection.classList.remove('hidden');
        this.elements.geoSendSection.classList.add('hidden');
        this.elements.historySection.classList.add('hidden');
        this.elements.userInfo.classList.add('hidden');
    }

    showGeoSendSection() {
        this.elements.authSection.classList.add('hidden');
        this.elements.geoSendSection.classList.remove('hidden');
        this.elements.historySection.classList.add('hidden');
    }

    // Выход
    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('b24_token');
            localStorage.removeItem('geolocation_history');
            this.user = null;
            this.currentPosition = null;
            this.showAuthSection();
            this.elements.sendGeoBtn.disabled = true;
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new GeolocationApp();
});