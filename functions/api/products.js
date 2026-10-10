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
        const { results: products } = await env.DB.prepare(
            "SELECT * FROM products ORDER BY sort_order ASC, created_at DESC"
        ).all();
        const { results: variants } = await env.DB.prepare("SELECT * FROM product_variants").all();

        const formattedProducts = products.map(p => {
            const productVariants = variants
                .filter(v => v.product_base_id === p.base_id)
                .map(v => ({
                    id: v.id,
                    name: v.name,
                    price: v.price,
                    stock: v.stock || 0,
                    images: v.images ? v.images.split(',').map(img => img.trim()) : []
                }));

            return {
                baseId: p.base_id,
                title: p.title,
                category: p.category,
                creator: p.creator,
                link: p.link,
                material: p.material,
                quality: p.quality,
                infill: p.infill,
                longDescription: p.long_description,
                sortOrder: p.sort_order || 0,
                variants: productVariants
            };
        });

        return new Response(JSON.stringify(formattedProducts), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestPost({ request, env }) {
    try {
        const data = await request.json();

        if (data.action === 'reorder') {
            if (!data.orderedIds || !Array.isArray(data.orderedIds)) {
                return new Response(JSON.stringify({ error: "orderedIds muss ein Array sein" }), { status: 400, headers: corsHeaders });
            }

            const statements = data.orderedIds.map((baseId, index) => {
                return env.DB.prepare("UPDATE products SET sort_order = ? WHERE base_id = ?")
                    .bind(index + 1, baseId);
            });

            await env.DB.batch(statements);

            return new Response(JSON.stringify({ success: true, message: "Reihenfolge gespeichert!" }), {
                headers: corsHeaders
            });
        }

        await env.DB.prepare(`
            INSERT INTO products (base_id, title, category, creator, link, material, quality, infill, long_description, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 999)
        `).bind(
            data.baseId,
            data.title,
            data.category,
            data.creator || '',
            data.link || '',
            data.material || '',
            data.quality || '',
            data.infill || '',
            data.longDescription || ''
        ).run();

        if (data.variants && data.variants.length > 0) {
            const statements = data.variants.map(v => {
                const imageStr = Array.isArray(v.images) ? v.images.join(', ') : v.images;
                return env.DB.prepare(`
                    INSERT INTO product_variants (id, product_base_id, name, price, images, stock)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).bind(v.id, data.baseId, v.name, parseFloat(v.price), imageStr, parseInt(v.stock) || 0);
            });

            await env.DB.batch(statements);
        }

        return new Response(JSON.stringify({ success: true, message: "Produkt erfolgreich gespeichert!" }), {
            status: 201,
            headers: corsHeaders
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestPut({ request, env }) {
    try {
        const data = await request.json();

        await env.DB.prepare(`
            UPDATE products 
            SET title = ?, category = ?, creator = ?, link = ?, material = ?, quality = ?, infill = ?, long_description = ?
            WHERE base_id = ?
        `).bind(
            data.title, data.category, data.creator || '', data.link || '',
            data.material || '', data.quality || '', data.infill || '', data.longDescription || '',
            data.baseId
        ).run();

        await env.DB.prepare("DELETE FROM product_variants WHERE product_base_id = ?").bind(data.baseId).run();

        if (data.variants && data.variants.length > 0) {
            const statements = data.variants.map(v => {
                const imageStr = Array.isArray(v.images) ? v.images.join(', ') : v.images;
                return env.DB.prepare(`
                    INSERT INTO product_variants (id, product_base_id, name, price, images, stock)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).bind(v.id, data.baseId, v.name, parseFloat(v.price), imageStr, parseInt(v.stock) || 0);
            });
            await env.DB.batch(statements);
        }

        return new Response(JSON.stringify({ success: true, message: "Produkt erfolgreich aktualisiert!" }), {
            headers: corsHeaders
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestDelete({ request, env }) {
    try {
        const url = new URL(request.url);
        const baseId = url.searchParams.get('id');

        if (!baseId) {
            return new Response(JSON.stringify({ error: "Produkt ID fehlt" }), { status: 400, headers: corsHeaders });
        }

        await env.DB.prepare("DELETE FROM product_variants WHERE product_base_id = ?").bind(baseId).run();
        await env.DB.prepare("DELETE FROM products WHERE base_id = ?").bind(baseId).run();

        return new Response(JSON.stringify({ success: true, message: "Produkt gelöscht!" }), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}