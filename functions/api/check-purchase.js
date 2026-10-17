export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const productId = url.searchParams.get('productId');

    if (!email || !productId) {
        return new Response(JSON.stringify({ hasBought: false }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const hasBought = await env.DB.prepare(`
            SELECT oi.id FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.customer_email = ? AND (oi.product_name LIKE ? OR oi.order_id = ?)
        `).bind(email, `%${productId}%`, productId).first();

        return new Response(JSON.stringify({ hasBought: Boolean(hasBought) }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ hasBought: false }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}