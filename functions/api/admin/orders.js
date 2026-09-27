export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    if (url.searchParams.get('key') !== 'MEIN_ADMIN_PASSWORT_123') {
        return new Response("Zugriff verweigert", { status: 401 });
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
    const { key, orderId, status } = await context.request.json();
    if (key !== 'MEIN_ADMIN_PASSWORT_123') {
        return new Response("Zugriff verweigert", { status: 401 });
    }

    await context.env.DB.prepare(
        "UPDATE orders SET status = ? WHERE id = ?"
    ).bind(status, orderId).run();

    return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
    });
}