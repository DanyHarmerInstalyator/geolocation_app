// config.js
export const CONFIG = {
    // OAuth параметры из Битрикс24
    CLIENT_ID: 'local.6a7d854ea95905.96844738',
    
    // URL для редиректа после авторизации
    REDIRECT_URI: 'https://danyharmerinstalyator.github.io/geolocation_app/index.html',
    
    // REST API URL
    REST_URL: 'https://hdl.bitrix24.ru/rest/1673/z328ka0pgwjkzgf5/',
    
    // ID чата
    CHAT_ID: 51255,
    
    // Настройки геолокации
    GEOLOCATION: {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    }
};