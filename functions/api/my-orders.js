function parseCookie(cookieString, key) {
    if (!cookieString) return null;
    const match = cookieString.match(new RegExp('(^| )' + key + '=([^;]+)'));
    return match ? match[2] : null;
}

export async function onRequestGet(context) {
    const { request, env } = context;

    const cookieHeader = request.headers.get('Cookie') || '';
    const authHeader = request.headers.get('Authorization') || '';

    let sessionId = parseCookie(cookieHeader, 'session_id');
    if (!sessionId && authHeader.startsWith('Bearer ')) {
        sessionId = authHeader.substring(7).trim();
    }

    if (!sessionId) {
        return new Response(JSON.stringify({ error: "Nicht angemeldet" }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    const user = await env.DB.prepare("SELECT email FROM users WHERE session_id = ?").bind(sessionId).first();
    if (!user) {
        return new Response(JSON.stringify({ error: "Ungültige Session" }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    const { results: orders } = await env.DB.prepare(
        "SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC"
    ).bind(user.email).all();

    for (let order of orders) {
        const { results: items } = await env.DB.prepare(
            "SELECT * FROM order_items WHERE order_id = ?"
        ).bind(order.id).all();
        order.items = items;
    }

    return new Response(JSON.stringify(orders), {
        headers: { 'Content-Type': 'application/json' }
    });
}