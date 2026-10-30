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
    return user && (user.is_admin === 1 || user.is_admin === true);
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const corsHeaders = { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    const isAdmin = await checkAdminAuth(context);
    if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Zugriff verweigert. Admin-Rechte erforderlich." }), { 
            status: 403, 
            headers: corsHeaders 
        });
    }

    try {
        const { variantId, stock } = await request.json();
        const newStock = parseInt(stock) || 0;

        const oldVariant = await env.DB.prepare("SELECT stock, product_base_id, name FROM product_variants WHERE id = ?").bind(variantId).first();
        const oldStock = oldVariant ? parseInt(oldVariant.stock) : 0;

        await env.DB.prepare("UPDATE product_variants SET stock = ? WHERE id = ?").bind(newStock, variantId).run();

        if (oldStock <= 0 && newStock > 0 && oldVariant) {
            const { results: subs } = await env.DB.prepare(
                "SELECT email FROM stock_notifications WHERE variant_id = ?"
            ).bind(variantId).all();

            if (subs && subs.length > 0) {
                const prodInfo = await env.DB.prepare("SELECT title, base_id FROM products WHERE base_id = ?").bind(oldVariant.product_base_id).first();
                const prodTitle = prodInfo ? prodInfo.title : "Produkt";
                const variantName = oldVariant.name;
                const baseId = oldVariant.product_base_id;

                for (const sub of subs) {
                    try {
                        const htmlContent = `
                            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                                <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px;">
                                    <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 800;">Fabix<span style="color: #d40202;">Tech</span></h2>
                                    <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Dein gewünschtes Produkt ist wieder da!</p>
                                </div>
                                <p style="font-size: 15px; color: #334155;">Hallo,</p>
                                <p style="font-size: 14px; color: #475569; line-height: 1.5;">gute Nachrichten! Das Produkt <strong>${prodTitle} (${variantName})</strong> ist wieder auf Lager.</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="https://fabixtech.ch/product.html?id=${baseId}" style="background-color: #d40202; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">Jetzt ansehen</a>
                                </div>
                                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">Dies ist eine einmalige automatisch versendete E-Mail. Bitte antworte nicht darauf.</p>
                            </div>
                        `;

                        await env.EMAIL_SERVICE.fetch(new Request("https://internal/", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                recipient: sub.email,
                                subject: "Wieder verfügbar: " + prodTitle + " (" + variantName + ") | FabixTech",
                                message: htmlContent
                            })
                        }));
                        
                    } catch (mailErr) {
                        console.error("Fehler beim Senden der Benachrichtigungs-Mail an", sub.email, mailErr);
                    }
                }

                await env.DB.prepare("DELETE FROM stock_notifications WHERE variant_id = ?").bind(variantId).run();
            }
        }
        
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}