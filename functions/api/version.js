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

export async function onRequestGet(context) {
    const { env } = context;
    try {
        const numRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'version_number'").first();
        const stageRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'version_stage'").first();

        const versionNumber = numRow ? numRow.value : '1.0.0';
        const versionStage = stageRow ? stageRow.value : '';

        let formattedText = `Version ${versionNumber}`;
        if (versionStage) {
            formattedText += ` ${versionStage}`;
        }

        return new Response(JSON.stringify({ 
            versionNumber, 
            versionStage, 
            formattedText 
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ formattedText: "Version 1.0.0" }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost(context) {
    const isAdmin = await checkAdminAuth(context);
    if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert" }), { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { versionNumber, versionStage } = await context.request.json();

    await context.env.DB.prepare(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('version_number', ?)"
    ).bind(versionNumber || '1.0.0').run();

    await context.env.DB.prepare(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('version_stage', ?)"
    ).bind(versionStage || '').run();

    return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
    });
}