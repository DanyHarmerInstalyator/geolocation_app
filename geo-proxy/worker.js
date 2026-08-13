// worker.js
function corsHeaders(env) {
    return {
        'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400', // кэшируем CORS на сутки
    };
}

function json(data, status, env) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(env),
        },
    });
}

function errorResponse(message, details, status = 400, env) {
    return json({ 
        error: message, 
        error_description: details?.error_description || details?.error || details,
        details 
    }, status, env);
}

async function handleOAuthToken(request, env) {
    try {
        const { code, redirect_uri } = await request.json();

        if (!code) {
            return errorResponse('code_is_required', 'Authorization code is required', 400, env);
        }

        if (!redirect_uri) {
            return errorResponse('redirect_uri_is_required', 'Redirect URI is required', 400, env);
        }

        const resp = await fetch('https://hdl.bitrix24.ru/oauth/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: env.CLIENT_ID,
                client_secret: env.CLIENT_SECRET,
                code,
                redirect_uri,
            }),
        });

        const data = await resp.json();

        if (!data.access_token) {
            console.error('Token exchange failed:', data);
            return errorResponse('token_exchange_failed', data, 400, env);
        }

        // Возвращаем только то, что нужно клиенту
        return json({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            domain: data.domain,
            member_id: data.member_id,
            expires_in: data.expires_in,
            status: 'success'
        }, 200, env);

    } catch (error) {
        console.error('OAuth token error:', error);
        return errorResponse('internal_error', error.message, 500, env);
    }
}

async function handleRefreshToken(request, env) {
    try {
        const { refresh_token } = await request.json();
        
        if (!refresh_token) {
            return errorResponse('refresh_token_required', 'Refresh token is required', 400, env);
        }

        const resp = await fetch('https://hdl.bitrix24.ru/oauth/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: env.CLIENT_ID,
                client_secret: env.CLIENT_SECRET,
                refresh_token,
            }),
        });

        const data = await resp.json();
        
        if (!data.access_token) {
            console.error('Refresh failed:', data);
            return errorResponse('refresh_failed', data, 400, env);
        }

        return json({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            domain: data.domain,
            member_id: data.member_id,
            expires_in: data.expires_in,
            status: 'success'
        }, 200, env);

    } catch (error) {
        console.error('Refresh token error:', error);
        return errorResponse('internal_error', error.message, 500, env);
    }
}

async function handleRest(request, env, method) {
    try {
        const body = await request.json().catch(() => ({}));
        const { params = {}, auth } = body;

        let url;
        let fetchBody;

        // Проверяем, есть ли у нас OAuth-сессия пользователя
        if (auth && auth.domain && auth.access_token) {
            // Запрос от имени реального пользователя через OAuth
            url = `https://${auth.domain}/rest/${method}.json`;
            fetchBody = JSON.stringify({ ...params, auth: auth.access_token });
            console.log(`🔐 OAuth запрос: ${method} для пользователя ${auth.domain}`);
        } else {
            // Fallback через вебхук (ключ известен только воркеру)
            if (!env.WEBHOOK_URL) {
                console.error('WEBHOOK_URL not configured');
                return errorResponse('webhook_not_configured', 'WEBHOOK_URL is not set in environment', 500, env);
            }
            url = `${env.WEBHOOK_URL}${method}.json`;
            fetchBody = JSON.stringify(params);
            console.log(`🔧 Вебхук запрос: ${method}`);
        }

        // Делаем запрос с таймаутом
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: fetchBody,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const data = await resp.json();
            
            // Если токен истек, возвращаем специальный код для клиента
            if (data.error === 'expired_token' || data.error === 'invalid_token') {
                return json({ 
                    error: 'token_expired',
                    error_description: 'Access token expired, please refresh',
                    result: null
                }, 401, env);
            }

            return json(data, resp.status, env);

        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                console.error(`⏱️ Таймаут запроса: ${method}`);
                return errorResponse('request_timeout', `Request to ${method} timed out`, 504, env);
            }
            throw fetchError;
        }

    } catch (error) {
        console.error(`❌ REST запрос ошибка (${method}):`, error);
        return errorResponse('internal_error', error.message, 500, env);
    }
}

// Health check для мониторинга
async function handleHealthCheck(env) {
    return json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        config: {
            hasClientId: !!env.CLIENT_ID,
            hasWebhookUrl: !!env.WEBHOOK_URL,
            allowedOrigin: env.ALLOWED_ORIGIN || '*'
        }
    }, 200, env);
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const method = request.method;

        console.log(`📨 ${method} ${url.pathname}`);

        // Обработка preflight (CORS)
        if (method === 'OPTIONS') {
            return new Response(null, { 
                status: 204,
                headers: corsHeaders(env) 
            });
        }

        try {
            // Health check для мониторинга
            if (method === 'GET' && url.pathname === '/health') {
                return await handleHealthCheck(env);
            }

            // Только POST запросы для API
            if (method !== 'POST') {
                return errorResponse('method_not_allowed', 'Only POST requests are allowed', 405, env);
            }

            // Обмен code на token
            if (url.pathname === '/api/oauth/token') {
                return await handleOAuthToken(request, env);
            }

            // Обновление refresh_token
            if (url.pathname === '/api/oauth/refresh') {
                return await handleRefreshToken(request, env);
            }

            // REST прокси (любой метод)
            const restMatch = url.pathname.match(/^\/api\/rest\/(.+)$/);
            if (restMatch) {
                return await handleRest(request, env, restMatch[1]);
            }

            // 404 для неизвестных путей
            return errorResponse('not_found', `Endpoint ${url.pathname} not found`, 404, env);

        } catch (err) {
            console.error('💥 Unhandled error:', err);
            return errorResponse('internal_error', err.message, 500, env);
        }
    },
};