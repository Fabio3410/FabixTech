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
        sessionId = authHeader.substring(7);
    }

    if (!sessionId) {
        return false;
    }

    const user = await env.DB.prepare(`
        SELECT users.is_admin 
        FROM sessions 
        JOIN users ON sessions.user_id = users.id 
        WHERE sessions.id = ?
    `).bind(sessionId).first();

    return user && user.is_admin === 1;
}

export async function onRequestGet(context) {
    const isAdmin = await checkAdminAuth(context);
    if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert" }), { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { results: orders } = await context.env.DB.prepare(
        "SELECT * FROM orders ORDER BY created_at DESC"
    ).all();

    for (let order of orders) {
        const { results: items } = await context.env.DB.prepare(
            "SELECT * FROM order_items WHERE order_id = ?"
        ).bind(order.id).all();
        order.items = items;
    }

    return new Response(JSON.stringify(orders), {
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