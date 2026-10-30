function parseCookie(cookieHeader, name) {
    if (!cookieHeader) return null;
    const matches = cookieHeader.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return matches ? decodeURIComponent(matches[1]) : null;
}

async function verifyAdmin(request, env) {
    const cookieHeader = request.headers.get('Cookie') || '';
    const authHeader = request.headers.get('Authorization') || '';

    let sessionId = parseCookie(cookieHeader, 'session_id');
    if (!sessionId && authHeader.startsWith('Bearer ')) {
        sessionId = authHeader.substring(7).trim();
    }

    if (!sessionId) return false;

    try {
        const user = await env.DB.prepare(
            "SELECT is_admin FROM users WHERE session_id = ?"
        ).bind(sessionId).first();

        return user && (user.is_admin === 1 || user.is_admin === true);
    } catch (e) {
        return false;
    }
}

export async function onRequestGet({ request, env }) {
    const isAdmin = await verifyAdmin(request, env);
    if (!isAdmin) {
        return new Response(JSON.stringify({ status: 'error', message: 'Zugriff verweigert. Admin-Rechte erforderlich.' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const [
            giftCards,
            orderItems,
            orders,
            productVariants,
            products,
            promoCodes,
            reviews,
            sectionProducts,
            sessions,
            settings,
            shopSections,
            sqliteSequence,
            stockNotifications,
            users
        ] = await Promise.all([
            env.DB.prepare("SELECT * FROM gift_cards").all().catch(() => ({ results: [] })),
            env.DB.prepare("SELECT * FROM order_items").all().catch(() => ({ results: [] })),
            env.DB.prepare("SELECT * FROM orders").all().catch(() => ({ results: [] })),
            env.DB.prepare("SELECT * FROM product_variants").all().catch(() => ({ results: [] })),
            env.DB.prepare("SELECT * FROM products").all().catch(() => ({ results: [] })),
            env.DB.prepare("SELECT * FROM promo_codes").all().catch(() => ({ results: [] })),
            env.DB.prepare("SELECT * FROM reviews").all().catch(() => ({ results: [] })),
            env.DB.prepare("SELECT * FROM section_products").all().catch(() => ({ results: [] })),
            env.DB.prepare("SELECT * FROM sessions").all().catch(() => ({ results: [] })),
            env.DB.prepare("SELECT * FROM settings").all().catch(() => ({ results: [] })),
            env.DB.prepare("SELECT * FROM shop_sections").all().catch(() => ({ results: [] })),
            env.DB.prepare("SELECT * FROM sqlite_sequence").all().catch(() => ({ results: [] })),
            env.DB.prepare("SELECT * FROM stock_notifications").all().catch(() => ({ results: [] })),
            env.DB.prepare("SELECT * FROM users").all().catch(() => ({ results: [] }))
        ]);

        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                version: "1.0",
                exported_by: "FabixTech Admin Backup System"
            },
            data: {
                gift_cards: giftCards.results,
                order_items: orderItems.results,
                orders: orders.results,
                product_variants: productVariants.results,
                products: products.results,
                promo_codes: promoCodes.results,
                reviews: reviews.results,
                section_products: sectionProducts.results,
                sessions: sessions.results,
                settings: settings.results,
                shop_sections: shopSections.results,
                sqlite_sequence: sqliteSequence.results,
                stock_notifications: stockNotifications.results,
                users: users.results
            }
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const fileName = `fabixtech-complete-backup-${new Date().toISOString().split('T')[0]}.json`;

        return new Response(jsonString, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Cache-Control': 'no-store'
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ status: 'error', message: 'Backup-Erstellung fehlgeschlagen: ' + err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}