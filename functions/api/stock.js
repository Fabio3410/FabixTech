export async function onRequestPost({ request, env }) {
    const corsHeaders = { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        const { variantId, stock } = await request.json();
        await env.DB.prepare("UPDATE product_variants SET stock = ? WHERE id = ?").bind(parseInt(stock), variantId).run();
        
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}