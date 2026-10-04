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

    if (!sessionId) {
        return false;
    }

    const user = await env.DB.prepare(`
        SELECT is_admin 
        FROM users 
        WHERE session_id = ?
    `).bind(sessionId).first();

    return user && user.is_admin === 1;
}

export async function onRequestPost(context) {
    const isAdmin = await checkAdminAuth(context);
    if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert" }), { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    const { orderId, status, trackingNumber } = await context.request.json();

    if (status) {
        await context.env.DB.prepare(
            "UPDATE orders SET status = ? WHERE id = ?"
        ).bind(status, orderId).run();
    }

    if (trackingNumber !== undefined) {
        await context.env.DB.prepare(
            "UPDATE orders SET tracking_number = ? WHERE id = ?"
        ).bind(trackingNumber, orderId).run();
    }

    return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
export async function onRequestPost(context) {
    const isAdmin = await checkAdminAuth(context);
    if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert" }), { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { orderId, status } = await context.request.json();

    await context.env.DB.prepare(
        "UPDATE orders SET status = ? WHERE id = ?"
    ).bind(status, orderId).run();

    return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
    });
}