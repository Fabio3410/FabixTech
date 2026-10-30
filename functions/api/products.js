import { EmailMessage } from "cloudflare:email";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

async function verifyAdmin(request, env) {
    const cookieHeader = request.headers.get('Cookie') || '';
    const authHeader = request.headers.get('Authorization') || '';

    let sessionId = null;
    const match = cookieHeader.match(/(?:^|; )session_id=([^;]*)/);
    if (match) {
        sessionId = decodeURIComponent(match[1]);
    } else if (authHeader.startsWith('Bearer ')) {
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

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const includeInactive = url.searchParams.get('all') === 'true';

        const sql = includeInactive 
            ? "SELECT * FROM products ORDER BY sort_order ASC, created_at DESC" 
            : "SELECT * FROM products WHERE is_active = 1 OR is_active IS NULL ORDER BY sort_order ASC, created_at DESC";

        const { results: products } = await env.DB.prepare(sql).all();
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

            let creatorLinks = [];
            try {
                if (p.creator_links) {
                    creatorLinks = JSON.parse(p.creator_links);
                } else if (p.creator || p.link) {
                    creatorLinks = [{ name: p.creator || 'Ersteller', url: p.link || '' }];
                }
            } catch (e) {
                creatorLinks = [{ name: p.creator || 'Ersteller', url: p.link || '' }];
            }

            return {
                baseId: p.base_id,
                title: p.title,
                category: p.category,
                creator: p.creator,
                link: p.link,
                creatorLinks: creatorLinks,
                material: p.material,
                quality: p.quality,
                infill: p.infill,
                longDescription: p.long_description,
                isCustom: p.is_custom === 1 || p.is_custom === true,
                sortOrder: p.sort_order || 0,
                isActive: p.is_active !== 0,
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

        if (data.action === 'subscribe_stock') {
            const { variantId, email } = data;
            if (!variantId || !email || !email.includes('@')) {
                return new Response(JSON.stringify({ error: "Ungültige E-Mail-Adresse." }), { status: 400, headers: corsHeaders });
            }

            const existing = await env.DB.prepare(
                "SELECT id FROM stock_notifications WHERE variant_id = ? AND email = ?"
            ).bind(variantId, email).first();

            if (!existing) {
                await env.DB.prepare(
                    "INSERT INTO stock_notifications (variant_id, email) VALUES (?, ?)"
                ).bind(variantId, email).run();
            }

            return new Response(JSON.stringify({ success: true, message: "Erfolgreich benachrichtigt!" }), { headers: corsHeaders });
        }

        const isAdmin = await verifyAdmin(request, env);
        if (!isAdmin) {
            return new Response(JSON.stringify({ error: "Nicht autorisiert. Admin-Rechte erforderlich." }), { status: 403, headers: corsHeaders });
        }

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

        const creatorLinksStr = JSON.stringify(data.creatorLinks || []);
        const isCustomVal = data.isCustom ? 1 : 0;

        await env.DB.prepare(`
            INSERT INTO products (base_id, title, category, creator, link, creator_links, material, quality, infill, long_description, is_custom, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 999)
        `).bind(
            data.baseId, data.title, data.category, data.creator || '', data.link || '', creatorLinksStr,
            data.material || '', data.quality || '', data.infill || '', data.longDescription || '', 
            isCustomVal
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

        return new Response(JSON.stringify({ success: true, message: "Produkt erfolgreich gespeichert!" }), { status: 201, headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestPut({ request, env }) {
    try {
        const isAdmin = await verifyAdmin(request, env);
        if (!isAdmin) {
            return new Response(JSON.stringify({ error: "Nicht autorisiert. Admin-Rechte erforderlich." }), { status: 403, headers: corsHeaders });
        }

        const data = await request.json();

        if (data.variants && data.variants.length > 0) {
            for (const v of data.variants) {
                const oldVariant = await env.DB.prepare("SELECT stock FROM product_variants WHERE id = ?").bind(v.id).first();
                const oldStock = oldVariant ? parseInt(oldVariant.stock) : 0;
                const newStock = parseInt(v.stock) || 0;

                if (oldStock <= 0 && newStock > 0) {
                    const { results: subs } = await env.DB.prepare(
                        "SELECT email FROM stock_notifications WHERE variant_id = ?"
                    ).bind(v.id).all();

                    if (subs && subs.length > 0) {
                        const prodInfo = await env.DB.prepare("SELECT title FROM products WHERE base_id = ?").bind(data.baseId).first();
                        const prodTitle = prodInfo ? prodInfo.title : "Produkt";
                        const variantName = v.name;

                        const senderEmail = "info@fabixtech.ch";

                        for (const sub of subs) {
                            try {
                                const htmlContent = `
                                    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                                        <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px;">
                                            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 800;">FABIO<span style="color: #d40202;">3D</span></h2>
                                            <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Dein gewünschtes Produkt ist wieder da!</p>
                                        </div>
                                        <p style="font-size: 15px; color: #334155;">Hallo,</p>
                                        <p style="font-size: 14px; color: #475569; line-height: 1.5;">gute Nachrichten! Das Produkt <strong>${prodTitle} (${variantName})</strong> ist ab sofort wieder auf Lager und kann im Shop bestellt werden.</p>
                                        <div style="text-align: center; margin: 30px 0;">
                                            <a href="https://fabixtech.ch/product.html?id=${data.baseId}" style="background-color: #d40202; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">Jetzt ansehen & bestellen</a>
                                        </div>
                                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                                        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">Du erhältst diese E-Mail, weil du dich für die Benachrichtigung angemeldet hast.</p>
                                    </div>
                                `;

                                const rawEmail = [
                                    "From: FabixTech <" + senderEmail + ">",
                                    "To: " + sub.email,
                                    "Subject: Wieder verfügbar: " + prodTitle + " (" + variantName + ") | FabixTech",
                                    "MIME-Version: 1.0",
                                    "Content-Type: text/html; charset=utf-8",
                                    "",
                                    htmlContent
                                ].join("\r\n");

                                const emailMsg = new EmailMessage(senderEmail, sub.email, rawEmail);
                                await env.SEB_EMAIL.send(emailMsg);
                            } catch (mailErr) {
                                console.error("Fehler beim Senden der Benachrichtigungs-Mail an", sub.email, mailErr);
                            }
                        }

                        await env.DB.prepare("DELETE FROM stock_notifications WHERE variant_id = ?").bind(v.id).run();
                    }
                }
            }
        }

const creatorLinksStr = JSON.stringify(data.creatorLinks || []);
        const isCustomVal = data.isCustom ? 1 : 0;

        await env.DB.prepare(`
            UPDATE products 
            SET title = ?, category = ?, creator = ?, link = ?, creator_links = ?, material = ?, quality = ?, infill = ?, long_description = ?, is_custom = ?
            WHERE base_id = ?
        `).bind(
            data.title, data.category, data.creator || '', data.link || '', creatorLinksStr,
            data.material || '', data.quality || '', data.infill || '', data.longDescription || '', 
            isCustomVal,
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

        return new Response(JSON.stringify({ success: true, message: "Produkt erfolgreich aktualisiert!" }), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestDelete({ request, env }) {
    try {
        const isAdmin = await verifyAdmin(request, env);
        if (!isAdmin) {
            return new Response(JSON.stringify({ error: "Nicht autorisiert. Admin-Rechte erforderlich." }), { status: 403, headers: corsHeaders });
        }

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