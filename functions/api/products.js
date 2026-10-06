export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json'
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (request.method === 'GET' && url.pathname === '/api/products') {
            try {
                const { results: products } = await env.DB.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
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
                        variants: productVariants
                    };
                });

                return new Response(JSON.stringify(formattedProducts), { headers: corsHeaders });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (request.method === 'POST' && url.pathname === '/api/products') {
            try {
                const data = await request.json();

                await env.DB.prepare(`
                    INSERT INTO products (base_id, title, category, creator, link, material, quality, infill, long_description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                        `).bind(v.id, data.baseId, v.name, parseFloat(v.price), imageStr, parseInt(v.stock) || 10);
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

        if (request.method === 'PUT' && url.pathname === '/api/products') {
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

        return new Response("Not Found", { status: 404, headers: corsHeaders });
    }
};