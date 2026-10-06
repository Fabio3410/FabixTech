export async function onRequestGet({ env }) {
    const corsHeaders = { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

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
            const res = await env.DB.prepare("SELECT COUNT(*) as totalOrders, SUM(total_price) as revenue FROM orders").first();
            if (res) {
                totalOrders = res.totalOrders || 0;
                revenue = res.revenue || 0;
            }
        } catch (e) {
            console.warn("Tabelle 'orders' existiert noch nicht.");
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