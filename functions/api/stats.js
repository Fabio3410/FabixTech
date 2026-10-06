export async function onRequestGet({ env }) {
    const corsHeaders = { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        const prodCount = await env.DB.prepare("SELECT COUNT(*) as count FROM products").first();
        const orderStats = await env.DB.prepare("SELECT COUNT(*) as totalOrders, SUM(total_price) as revenue FROM orders").first();
        const pendingRequests = await env.DB.prepare("SELECT COUNT(*) as count FROM custom_requests WHERE status = 'Offen'").first();

        return new Response(JSON.stringify({
            productsCount: prodCount ? prodCount.count : 0,
            totalOrders: orderStats ? orderStats.totalOrders : 0,
            revenue: orderStats && orderStats.revenue ? orderStats.revenue : 0,
            pendingRequests: pendingRequests ? pendingRequests.count : 0
        }), { headers: corsHeaders });
    
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}