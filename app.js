
// app.js
import { CONFIG } from './config.js';
import { HistoryExporter } from './exporter.js';
 
class GeolocationApp {
    constructor() {
        this.user = null;
        this.currentPhoto = null;
        this.currentPosition = null;
        this.watchId = null;
        this.isAuthorized = false;
        this.exporter = new HistoryExporter();
 
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
            userAvatarSmall: document.getElementById('userAvatarSmall'),
 
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
            exportExcelBtn: document.getElementById('exportExcelBtn'), 
            exportCSVBtn: document.getElementById('exportCSVBtn'), 
        };
    }
 
    initializeEventListeners() {
        // Проверяем наличие элементов перед добавлением слушателей
        if (this.elements.loginBtn) {
            this.elements.loginBtn.addEventListener('click', () => this.login());
        }
        if (this.elements.registerBtn) {
            this.elements.registerBtn.addEventListener('click', () => this.register());
        }
        if (this.elements.sendGeoBtn) {
            this.elements.sendGeoBtn.addEventListener('click', () => this.sendGeolocation());
        }
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', () => this.logout());
        }
        if (this.elements.photoInput) {
            this.elements.photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }
        if (this.elements.removePhotoBtn) {
            this.elements.removePhotoBtn.addEventListener('click', () => this.removePhoto());
        }
        if (this.elements.navSend) {
            this.elements.navSend.addEventListener('click', () => this.switchTab('send'));
        }
        if (this.elements.navHistory) {
            this.elements.navHistory.addEventListener('click', () => this.switchTab('history'));
        }
        if (this.elements.navAdmin) {
            this.elements.navAdmin.addEventListener('click', () => this.openAdminPanel());
        }
        if (this.elements.switchToRegister) {
            this.elements.switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchForm('register');
            });
        }
           if (this.elements.exportExcelBtn) {
        this.elements.exportExcelBtn.addEventListener('click', () => {
            this.exportHistory('excel');
        });
    }
        if (this.elements.switchToLogin) {
            this.elements.switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchForm('login');
                
            });
        }
    }
    
 // ==================== ЭКСПОРТ ИСТОРИИ ====================

exportHistory(format = 'excel') {
    if (!this.isAuthorized || !this.user) {
        this.showStatus('❌ Необходимо авторизоваться', 'error');
        return;
    }

    // Передаём пользователя в экспортер
    this.exporter.setUser(this.user);

    let result;
    if (format === 'excel') {
        result = this.exporter.exportToExcel();
    } else if (format === 'csv') {
        result = this.exporter.exportToCSV();
    }

    if (result) {
        this.showStatus(`✅ История экспортирована в ${format.toUpperCase()}!`, 'success');
    }
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
        const name = this.elements.registerName?.value?.trim() || '';
        const email = this.elements.registerEmail?.value?.trim() || '';
        const password = this.elements.registerPassword?.value?.trim() || '';
 
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
        const name = this.elements.loginName?.value?.trim() || '';
        const password = this.elements.loginPassword?.value?.trim() || '';
 
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
            if (loginForm) loginForm.classList.add('hidden');
            if (registerForm) registerForm.classList.remove('hidden');
        } else {
            if (loginForm) loginForm.classList.remove('hidden');
            if (registerForm) registerForm.classList.add('hidden');
        }
    }
 
    updateUserInfo() {
        if (!this.user) return;
 
        if (this.elements.userName) {
            this.elements.userName.textContent = this.user.name;
        }
        if (this.elements.userDisplay) {
            this.elements.userDisplay.textContent = this.user.name;
        }
 
        const initials = this.user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const avatarData = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%232c3e7a"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial"%3E${initials}%3C/text%3E%3C/svg%3E`;
 
        if (this.elements.userAvatar) {
            this.elements.userAvatar.src = avatarData;
        }
        if (this.elements.userAvatarSmall) {
            this.elements.userAvatarSmall.src = avatarData;
        }
 
        if (this.elements.userInfo) {
            this.elements.userInfo.classList.remove('hidden');
        }
    }
 
    // ==================== ГЕОЛОКАЦИЯ ====================
 
    startGeolocation() {
        if (!navigator.geolocation) {
            if (this.elements.geoStatusText) {
                this.elements.geoStatusText.textContent = '❌ Геолокация не поддерживается';
            }
            return;
        }
 
        if (this.elements.geoStatusText) {
            this.elements.geoStatusText.textContent = '📍 Определение местоположения...';
        }
 
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
 
        if (this.elements.geoStatusText) {
            this.elements.geoStatusText.textContent = '✅ Местоположение определено';
        }
        const dot = this.elements.geoStatus?.querySelector('.dot');
        if (dot) dot.classList.add('active');
        if (this.elements.geoCoords) {
            this.elements.geoCoords.classList.remove('hidden');
        }
        if (this.elements.lat) {
            this.elements.lat.textContent = this.currentPosition.lat.toFixed(6);
        }
        if (this.elements.lng) {
            this.elements.lng.textContent = this.currentPosition.lng.toFixed(6);
        }
 
        if (this.elements.sendGeoBtn) {
            this.elements.sendGeoBtn.disabled = false;
        }
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
 
        if (this.elements.geoStatusText) {
            this.elements.geoStatusText.textContent = message;
        }
        if (this.elements.sendGeoBtn) {
            this.elements.sendGeoBtn.disabled = true;
        }
    }
 
    // ==================== ФОТО ====================
 
    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
 
        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение');
            if (this.elements.photoInput) {
                this.elements.photoInput.value = '';
            }
            return;
        }
 
        if (file.size > 5 * 1024 * 1024) {
            alert('Файл слишком большой. Максимальный размер 5MB');
            if (this.elements.photoInput) {
                this.elements.photoInput.value = '';
            }
            return;
        }
 
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentPhoto = e.target.result;
            if (this.elements.previewImg) {
                this.elements.previewImg.src = this.currentPhoto;
            }
            if (this.elements.photoPreview) {
                this.elements.photoPreview.classList.remove('hidden');
            }
            if (this.elements.photoInput) {
                this.elements.photoInput.value = '';
            }
        };
        reader.onerror = () => {
            alert('Ошибка чтения файла');
            if (this.elements.photoInput) {
                this.elements.photoInput.value = '';
            }
        };
        reader.readAsDataURL(file);
    }
 
    removePhoto() {
        this.currentPhoto = null;
        if (this.elements.photoPreview) {
            this.elements.photoPreview.classList.add('hidden');
        }
        if (this.elements.previewImg) {
            this.elements.previewImg.src = '';
        }
    }
 
    // ==================== ОТПРАВКА ====================

    // ==================== ОТПРАВКА ====================

    async sendGeolocation() {
        if (!this.currentPosition) {
            this.showStatus('❌ Местоположение не определено', 'error');
            return;
        }

        const comment = this.elements.comment?.value?.trim() || 'Отправка геолокации';
        const timestamp = new Date().toLocaleString('ru-RU');
        const lat = this.currentPosition.lat;
        const lng = this.currentPosition.lng;

        if (this.elements.sendGeoBtn) {
            this.elements.sendGeoBtn.disabled = true;
        }
        this.showStatus('⏳ Отправка...', 'loading');

        // ВАЖНО: для истории используем СЖАТУЮ версию фото, а не оригинал с камеры.
        // Оригинал с iPhone может весить 5-10 МБ в base64 — этого достаточно,
        // чтобы мгновенно выбить квоту localStorage, особенно в PWA
        // (добавлено на "Домой"), где лимит гораздо жёстче, чем в обычном Safari.
        let photoForHistory = null;
        let sentWithPhoto = false;
        let messageId = null;
        let sendOk = false;

        try {
            const userName = this.user?.name || 'Пользователь';
            const yandexMapsUrl = `https://yandex.ru/maps/?pt=${lng},${lat}&z=17&l=map`;

            let messageText = `📍 Геолокация от ${userName}\n`;
            messageText += `🕐 Время: ${timestamp}\n`;
            messageText += `📌 Координаты: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n`;
            messageText += `💬 Комментарий: ${comment}\n`;
            messageText += `🗺️ Яндекс.Карты: ${yandexMapsUrl}`;

            // ====== ОТПРАВКА ФОТО ======
            if (this.currentPhoto) {
                try {
                    const compressedPhoto = await this.compressImage(this.currentPhoto, 800, 800);
                    photoForHistory = compressedPhoto; // именно сжатую версию кладём в историю
                    const base64Only = compressedPhoto.split(',')[1];

                    if (base64Only && base64Only.length > 0) {
                        const uploadResponse = await fetch(`${CONFIG.REST_URL}im.v2.File.upload`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                dialogId: CONFIG.CHAT_ID,
                                fields: {
                                    name: `geo_${Date.now()}.jpg`,
                                    content: base64Only,
                                    message: messageText,
                                },
                            }),
                        });
                        const uploadData = await uploadResponse.json();
                        console.log('📥 Ответ im.v2.File.upload:', uploadData);

                        if (uploadData.result) {
                            sendOk = true;
                            sentWithPhoto = true;
                            messageId = uploadData.result;
                        } else {
                            console.warn('⚠️ Загрузка фото не удалась:', uploadData.error_description || uploadData.error);
                            this.showStatus('⚠️ Фото не отправилось, пробую без фото', 'loading');
                        }
                    }
                } catch (photoError) {
                    console.error('❌ Ошибка обработки/отправки фото:', photoError);
                    this.showStatus('⚠️ Фото не удалось обработать, отправляю без фото', 'loading');
                }
            }

            // ====== ОТПРАВКА СООБЩЕНИЯ (если фото не отправилось) ======
            if (!sendOk) {
                let retries = 3;
                let attempt = 0;
                let messageSent = false;

                while (attempt < retries && !messageSent) {
                    try {
                        const response = await fetch(`${CONFIG.REST_URL}im.message.add`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                DIALOG_ID: CONFIG.CHAT_ID, // параметр называется DIALOG_ID
                                MESSAGE: messageText,
                            }),
                        });

                        const data = await response.json();
                        console.log('📥 Ответ im.message.add:', data);

                        if (data.error === 'QUERY_LIMIT_EXCEEDED' || data.error?.includes('quota')) {
                            console.warn(`⚠️ Превышен лимит запросов к API. Попытка ${attempt + 1} из ${retries}. Ждём 2 сек...`);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            attempt++;
                            continue;
                        }

                        if (data.error) {
                            throw new Error(data.error_description || data.error);
                        }

                        messageSent = true;
                        sendOk = true;
                        messageId = data.result;
                    } catch (fetchError) {
                        console.error('❌ Ошибка при отправке:', fetchError);
                        if (fetchError.message?.includes('quota') || fetchError.message?.includes('QUERY_LIMIT')) {
                            attempt++;
                            if (attempt < retries) {
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                continue;
                            }
                        }
                        throw fetchError;
                    }
                }

                if (!messageSent) {
                    console.warn('⚠️ Не удалось отправить после всех попыток');
                    sendOk = false;
                }
            }

            // ====== СОХРАНЯЕМ ИСТОРИЮ ======
            if (sendOk || messageId) {
                this.showStatus(
                    sentWithPhoto ? '✅ Геолокация и фото отправлены!' : '✅ Геолокация отправлена!',
                    'success'
                );
                if (this.elements.comment) {
                    this.elements.comment.value = '';
                }

                this.saveToHistory({
                    time: timestamp,
                    comment: comment,
                    coords: this.currentPosition,
                    photo: sentWithPhoto ? photoForHistory : null,
                    sentWithPhoto: sentWithPhoto,
                    messageId: messageId,
                    status: 'success',
                });

                this.removePhoto();
                this.loadHistory();
            } else {
                if (sentWithPhoto) {
                    this.saveToHistory({
                        time: timestamp,
                        comment: comment + ' (фото отправлено, сообщение нет)',
                        coords: this.currentPosition,
                        photo: photoForHistory,
                        sentWithPhoto: true,
                        status: 'partial',
                    });
                    this.removePhoto();
                    this.loadHistory();
                    this.showStatus('⚠️ Фото отправлено, но сообщение не дошло', 'error');
                } else {
                    throw new Error('Не удалось отправить сообщение');
                }
            }
        } catch (error) {
            console.error('❌ Ошибка:', error);
            this.showStatus(`❌ Ошибка: ${error.message}`, 'error');

            this.saveToHistory({
                time: timestamp,
                comment: comment + ' (ошибка отправки)',
                coords: this.currentPosition,
                photo: photoForHistory,
                error: error.message,
                status: 'error',
            });
            this.loadHistory();
        } finally {
            if (this.elements.sendGeoBtn) {
                this.elements.sendGeoBtn.disabled = false;
            }
        }
    }

    // ==================== ИСТОРИЯ (с защитой от переполнения квоты) ====================

    saveToHistory(item) {
        const history = JSON.parse(localStorage.getItem('geolocation_history') || '[]');
        history.unshift({
            ...item,
            userId: this.user?.id,
            userName: this.user?.name,
        });
        if (history.length > 100) history.pop();

        this.safeSetHistory(history);
    }

    // Пытается сохранить историю; если квота localStorage переполнена (типично для
    // iOS Safari / PWA на "Домой"), последовательно вырезает фото из самых старых
    // записей и повторяет попытку, пока запись не поместится или фото не кончатся.
    safeSetHistory(history) {
        let attempt = [...history];
        for (let i = 0; i < attempt.length + 1; i++) {
            try {
                localStorage.setItem('geolocation_history', JSON.stringify(attempt));
                return true;
            } catch (e) {
                const isQuotaError =
                    e && (e.name === 'QuotaExceededError' || e.code === 22 || /quota/i.test(e.message || ''));
                if (!isQuotaError) {
                    console.error('❌ Ошибка записи истории (не квота):', e);
                    return false;
                }
                // Ищем самую старую запись с фото и вырезаем его, освобождая место
                const idxWithPhoto = [...attempt].reverse().findIndex(it => it.photo);
                if (idxWithPhoto === -1) {
                    // Фото удалять больше неоткуда — режем размер истории
                    if (attempt.length <= 1) {
                        console.error('❌ Не удалось сохранить историю: квота переполнена даже без фото');
                        return false;
                    }
                    attempt = attempt.slice(0, Math.max(1, Math.floor(attempt.length / 2)));
                    continue;
                }
                const realIdx = attempt.length - 1 - idxWithPhoto;
                attempt[realIdx] = { ...attempt[realIdx], photo: null, photoRemoved: true };
                console.warn('⚠️ localStorage переполнен — убрано фото из старой записи истории');
            }
        }
        return false;
    }

    loadHistory() {
        const history = JSON.parse(localStorage.getItem('geolocation_history') || '[]');
        const userHistory = history.filter(item => item.userId === this.user?.id);
        this.renderHistory(userHistory);
    }

 
    compressImage(dataUrl, maxWidth, maxHeight) {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
 
                    // Сохраняем пропорции
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }
 
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
 
                    // Конвертируем в JPEG с качеством 0.7
                    const compressed = canvas.toDataURL('image/jpeg', 0.7);
                    console.log(`📸 Сжато: ${img.width}x${img.height} → ${width}x${height}, размер: ${Math.round(compressed.length / 1024)}KB`);
                    resolve(compressed);
                };
                img.onerror = () => {
                    console.error('❌ Ошибка загрузки изображения для сжатия');
                    reject(new Error('Ошибка загрузки изображения'));
                };
                img.src = dataUrl;
            } catch (error) {
                console.error('❌ Ошибка сжатия:', error);
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
        list.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.2);padding:20px;">История отправок пуста</p>';
        return;
    }

    list.innerHTML = history.map(item => {
        const lat = item.coords?.lat;
        const lng = item.coords?.lng;
        const mapLink = lat && lng ?
            `https://yandex.ru/maps/?pt=${lng},${lat}&z=17&l=map` :
            '#';

        // Статус отправки
        let statusBadge = '';
        if (item.status === 'success') {
            statusBadge = ' <span style="color:#4ade80;font-size:11px;">✓</span>';
        } else if (item.status === 'partial') {
            statusBadge = ' <span style="color:#fbbf24;font-size:11px;">⚠</span>';
        } else if (item.status === 'error') {
            statusBadge = ' <span style="color:#f87171;font-size:11px;">✗</span>';
        }

        return `
            <div class="history-item">
                <div class="time">${item.time || 'Время не указано'}</div>
                <div class="content">
                    <div class="comment">${item.comment || 'Без комментария'}${statusBadge}</div>
                    <div class="coords">
                        📍 ${lat && lng ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Координаты не указаны'}
                        ${lat && lng ? ` <a href="${mapLink}" target="_blank" style="color:#FF7300;text-decoration:none;">🗺️ Яндекс.Карты</a>` : ''}
                    </div>
                    ${item.photo ? `<img src="${item.photo}" alt="Фото" class="photo" loading="lazy">` : ''}
                    ${item.error ? `<div style="color:#f87171;font-size:12px;margin-top:4px;">⚠️ ${item.error}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}
 
    // ==================== НАВИГАЦИЯ ====================
 
    switchTab(tab) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
 
        if (tab === 'send') {
            if (this.elements.navSend) {
                this.elements.navSend.classList.add('active');
            }
            if (this.elements.geoSendSection) {
                this.elements.geoSendSection.classList.remove('hidden');
            }
            if (this.elements.historySection) {
                this.elements.historySection.classList.add('hidden');
            }
        } else if (tab === 'history') {
            if (this.elements.navHistory) {
                this.elements.navHistory.classList.add('active');
            }
            if (this.elements.geoSendSection) {
                this.elements.geoSendSection.classList.add('hidden');
            }
            if (this.elements.historySection) {
                this.elements.historySection.classList.remove('hidden');
            }
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
        if (this.elements.authSection) {
            this.elements.authSection.classList.remove('hidden');
        }
        if (this.elements.geoSendSection) {
            this.elements.geoSendSection.classList.add('hidden');
        }
        if (this.elements.historySection) {
            this.elements.historySection.classList.add('hidden');
        }
        if (this.elements.userInfo) {
            this.elements.userInfo.classList.add('hidden');
        }
        if (this.elements.sendGeoBtn) {
            this.elements.sendGeoBtn.disabled = true;
        }
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    }
 
    showGeoSendSection() {
        if (this.elements.authSection) {
            this.elements.authSection.classList.add('hidden');
        }
        if (this.elements.geoSendSection) {
            this.elements.geoSendSection.classList.remove('hidden');
        }
        if (this.elements.historySection) {
            this.elements.historySection.classList.add('hidden');
        }
        if (this.elements.navSend) {
            this.elements.navSend.classList.add('active');
        }
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