// config.js
export const CONFIG = {
    // OAuth параметры
    CLIENT_ID: 'local.6a7d854ea95905.96844738',
    CLIENT_SECRET: 'XEHeFKQuXEGMk2j0iz6ozlmUO0NKNDhpPSOubfYUMp3OLv1bds',
    
    // URL для редиректа после авторизации
    REDIRECT_URI: 'https://danyharmerinstalyator.github.io/geolocation_app/index.html',
    
    // REST API URL (вебхук)
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