function parseCookie(cookieString, key) {
    if (!cookieString) return null;
    const match = cookieString.match(new RegExp('(^| )' + key + '=([^;]+)'));
    return match ? match[2] : null;
}

async function checkAdminAuth(context) {
    const { request, env } = context;
    const cookieHeader = request.headers.get('Cookie') || '';
    const authHeader = request.headers.get('Authorization') || '';
    let sessionId = parseCookie(cookieHeader, 'session_id');
    if (!sessionId && authHeader.startsWith('Bearer ')) {
        sessionId = authHeader.substring(7).trim();
    }
    if (!sessionId) return false;
    const user = await env.DB.prepare("SELECT is_admin FROM users WHERE session_id = ?").bind(sessionId).first();
    return user && user.is_admin === 1;
}

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
    const isAdmin = await checkAdminAuth(context);
    if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert" }), { status: 401, headers: corsHeaders });
    }
    const { results } = await context.env.DB.prepare("SELECT * FROM promo_codes").all();
    return new Response(JSON.stringify(results), { headers: corsHeaders });
}

export async function onRequestPost(context) {
    const isAdmin = await checkAdminAuth(context);
    if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert" }), { status: 401, headers: corsHeaders });
    }
    const { code, type, value } = await context.request.json();
    if (!code || !type || value === undefined) {
        return new Response(JSON.stringify({ error: "Fehlende Felder" }), { status: 400, headers: corsHeaders });
    }
    const cleanCode = code.trim().toUpperCase();
    const storedValue = type === 'fixed' ? Math.round(parseFloat(value) * 100) : parseFloat(value);

    await context.env.DB.prepare(
        "INSERT OR REPLACE INTO promo_codes (code, type, value) VALUES (?, ?, ?)"
    ).bind(cleanCode, type, storedValue).run();

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}

export async function onRequestDelete(context) {
    const isAdmin = await checkAdminAuth(context);
    if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert" }), { status: 401, headers: corsHeaders });
    }
    const url = new URL(context.request.url);
    const code = url.searchParams.get('code');
    if (!code) {
        return new Response(JSON.stringify({ error: "Code fehlt" }), { status: 400, headers: corsHeaders });
    }
    await context.env.DB.prepare("DELETE FROM promo_codes WHERE code = ?").bind(code).run();
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}