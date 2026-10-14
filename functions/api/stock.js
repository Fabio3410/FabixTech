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
    return user && (user.is_admin === 1 || user.is_admin === true);
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const corsHeaders = { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    const isAdmin = await checkAdminAuth(context);
    if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert. Admin-Rechte erforderlich." }), { 
            status: 403, 
            headers: corsHeaders 
        });
    }

    try {
        const { variantId, stock } = await request.json();
        await env.DB.prepare("UPDATE product_variants SET stock = ? WHERE id = ?").bind(parseInt(stock), variantId).run();
        
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}