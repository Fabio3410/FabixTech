export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');

    if (!productId) {
        return new Response(JSON.stringify({ error: "Produkt-ID fehlt" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { results: reviews } = await env.DB.prepare(
            "SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC"
        ).bind(productId).all();

        const total = reviews.length;
        let sum = 0;
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        reviews.forEach(r => {
            sum += r.rating;
            if (breakdown[r.rating] !== undefined) {
                breakdown[r.rating]++;
            }
        });

        const average = total > 0 ? sum / total : 0;

        return new Response(JSON.stringify({
            average,
            total,
            breakdown,
            reviews
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const data = await request.json();
        const { productId, user_email, customer_name, rating, title, comment, pros, cons } = data;

        if (!productId || !user_email || !rating || !title) {
            return new Response(JSON.stringify({ error: "Pflichtfelder fehlen" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const hasBought = await env.DB.prepare(`
            SELECT oi.id FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.customer_email = ? AND (oi.product_name LIKE ? OR oi.order_id = ?)
        `).bind(user_email, `%${productId}%`, productId).first();

        if (!hasBought) {
            return new Response(JSON.stringify({ error: "Du kannst dieses Produkt nur bewerten, wenn du es gekauft hast." }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await env.DB.prepare(`
            INSERT INTO reviews (product_id, user_email, customer_name, rating, title, comment, pros, cons)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            productId,
            user_email,
            customer_name || 'Kunde',
            parseInt(rating),
            title,
            comment || '',
            pros || '',
            cons || ''
        ).run();

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}