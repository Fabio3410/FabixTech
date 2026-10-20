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
    return user && user.is_admin === 1;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet({ env }) {
    try {
        const { results: sections } = await env.DB.prepare("SELECT * FROM shop_sections WHERE is_active = 1 ORDER BY sort_order ASC").all();
        const { results: mappings } = await env.DB.prepare("SELECT * FROM section_products").all();

        const formatted = sections.map(sec => ({
            id: sec.id,
            title: sec.title,
            description: sec.description,
            sortOrder: sec.sort_order,
            productIds: mappings.filter(m => m.section_id === sec.id).map(m => m.product_base_id)
        }));

        return new Response(JSON.stringify(formatted), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestPost(context) {
    if (!await checkAdminAuth(context)) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert" }), { status: 401, headers: corsHeaders });
    }

    const { request, env } = context;
    try {
        const data = await request.json();

        if (data.action === 'toggle_product_status') {
            await env.DB.prepare("UPDATE products SET is_active = ? WHERE base_id = ?")
                .bind(data.isActive ? 1 : 0, data.baseId).run();
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        const res = await env.DB.prepare(`
            INSERT INTO shop_sections (title, description, sort_order, is_active)
            VALUES (?, ?, ?, 1)
        `).bind(data.title, data.description || '', data.sortOrder || 0).run();

        const sectionId = res.meta.last_row_id;

        if (data.productIds && Array.isArray(data.productIds)) {
            const stmts = data.productIds.map(baseId => 
                env.DB.prepare("INSERT INTO section_products (section_id, product_base_id) VALUES (?, ?)")
                    .bind(sectionId, baseId)
            );
            if (stmts.length > 0) await env.DB.batch(stmts);
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestPut(context) {
    if (!await checkAdminAuth(context)) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert" }), { status: 401, headers: corsHeaders });
    }

    const { request, env } = context;
    try {
        const data = await request.json();

        await env.DB.prepare(`
            UPDATE shop_sections SET title = ?, description = ?, is_active = ? WHERE id = ?
        `).bind(data.title, data.description || '', data.isActive ? 1 : 0, data.id).run();

        await env.DB.prepare("DELETE FROM section_products WHERE section_id = ?").bind(data.id).run();

        if (data.productIds && Array.isArray(data.productIds) && data.productIds.length > 0) {
            const stmts = data.productIds.map(baseId => 
                env.DB.prepare("INSERT INTO section_products (section_id, product_base_id) VALUES (?, ?)")
                    .bind(data.id, baseId)
            );
            await env.DB.batch(stmts);
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestDelete(context) {
    if (!await checkAdminAuth(context)) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert" }), { status: 401, headers: corsHeaders });
    }

    const { request, env } = context;
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        await env.DB.prepare("DELETE FROM section_products WHERE section_id = ?").bind(id).run();
        await env.DB.prepare("DELETE FROM shop_sections WHERE id = ?").bind(id).run();

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}