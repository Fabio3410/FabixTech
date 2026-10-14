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

export async function onRequestGet(context) {
    const { env, request } = context;
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

    if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 Database Binding 'DB' ist nicht konfiguriert." }), { status: 500, headers: corsHeaders });
    }

    try {
        let productsCount = 0;
        let totalOrders = 0;
        let revenue = 0;

        try {
            const res = await env.DB.prepare("SELECT COUNT(*) as count FROM products").first();
            if (res) productsCount = res.count;
        } catch (e) {
            console.warn("Tabelle 'products' konnte nicht abgefragt werden:", e.message);
        }

        try {
            const res = await env.DB.prepare(
                "SELECT COUNT(*) as totalOrders, COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE status != 'Storniert'"
            ).first();
            
            if (res) {
                totalOrders = res.totalOrders || 0;
                revenue = res.revenue || 0;
            }
        } catch (e) {
            try {
                const res = await env.DB.prepare(
                    "SELECT COUNT(*) as totalOrders, COALESCE(SUM(total_amount), 0) as revenue FROM orders"
                ).first();
                if (res) {
                    totalOrders = res.totalOrders || 0;
                    revenue = res.revenue || 0;
                }
            } catch (err2) {
                console.warn("Fehler beim Abfragen der Bestellungen:", err2.message);
            }
        }

        return new Response(JSON.stringify({
            productsCount,
            totalOrders,
            revenue
        }), { headers: corsHeaders });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}