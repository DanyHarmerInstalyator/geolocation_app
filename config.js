// config.js
export const CONFIG = {
    // OAuth параметры
    CLIENT_ID: 'local.67c8f3b7f4d9e8.12345678',
    REDIRECT_URI: window.location.origin + '/index.html',
    
    // REST API URL
    REST_URL: 'https://hdl.bitrix24.ru/rest/1673/z328ka0pgwjkzgf5/',
    
    
    CHAT_ID: 51255, 
    
    // Настройки геолокации
    GEOLOCATION: {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    }
};