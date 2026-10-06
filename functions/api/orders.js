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

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
    const isAdmin = await checkAdminAuth(context);
    if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert" }), { 
            status: 401,
            headers: corsHeaders
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
        headers: corsHeaders
    });
}

async function handleUpdateOrder(context) {
    const isAdmin = await checkAdminAuth(context);
    if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert" }), { 
            status: 401,
            headers: corsHeaders
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
        headers: corsHeaders
    });
}

export async function onRequestPost(context) {
    return handleUpdateOrder(context);
}

export async function onRequestPut(context) {
    return handleUpdateOrder(context);
}