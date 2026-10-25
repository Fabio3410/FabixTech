import Stripe from 'stripe';
import { EmailMessage } from "cloudflare:email";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const paymentIntentId = url.searchParams.get('payment_intent');
  const freeOrderId = url.searchParams.get('free_order_id');

  if (!paymentIntentId && !freeOrderId) {
    return new Response("Keine Zahlungs-ID übergeben.", { status: 400 });
  }

  try {
    let kundeName = "";
    let kundeEmail = "";
    let gesamtBetrag = "0.00";
    let waehrung = "CHF";
    let promoCode = "Keiner";
    let rabattWert = 0;
    let shippingCost = 5.90;
    let items = [];
    let generatedGiftCards = [];
    let orderId = freeOrderId || "";

    try {
        await context.env.DB.prepare("ALTER TABLE gift_cards ADD COLUMN order_id TEXT").run();
    } catch (e) {}

    if (freeOrderId) {
        const order = await context.env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(freeOrderId).first();
        if (!order) {
            return new Response("Bestellung nicht gefunden.", { status: 404 });
        }

        kundeName = order.customer_name;
        kundeEmail = order.customer_email;
        gesamtBetrag = Number(order.total_amount).toFixed(2);
        rabattWert = Number(order.discount_amount || 0);
        promoCode = order.promo_code || 'Keiner';
        shippingCost = 0.00;

        const orderItems = await context.env.DB.prepare("SELECT * FROM order_items WHERE order_id = ?").bind(freeOrderId).all();
        items = (orderItems.results || []).map(i => ({
            name: i.product_name,
            farbe: i.variant,
            quantity: i.quantity,
            price: i.price
        }));

        const gcResults = await context.env.DB.prepare(
            "SELECT code, initial_balance as value FROM gift_cards WHERE order_id = ?"
        ).bind(freeOrderId).all();
        if (gcResults && gcResults.results) {
            generatedGiftCards = gcResults.results;
        }

    } else {
        const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
          return new Response("Die Zahlung wurde noch nicht abgeschlossen.", { status: 400 });
        }

        kundeName = paymentIntent.metadata?.customer_name || paymentIntent.shipping?.name || '';
        kundeEmail = paymentIntent.metadata?.customer_email || paymentIntent.receipt_email || paymentIntent.customer_details?.email || 'Keine E-Mail';
        gesamtBetrag = (paymentIntent.amount / 100).toFixed(2);
        waehrung = paymentIntent.currency.toUpperCase();
        promoCode = paymentIntent.metadata?.promoCode || 'Keiner';
        const usedGiftCard = paymentIntent.metadata?.usedGiftCard;
        rabattWert = parseFloat(paymentIntent.metadata?.rabatt || '0.00');

        const isOnlyDigital = paymentIntent.metadata?.isOnlyDigital === 'true';
        shippingCost = isOnlyDigital ? 0.00 : 5.90;

        if (paymentIntent.metadata) {
            Object.keys(paymentIntent.metadata)
            .filter(key => key.startsWith('item_'))
            .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
            .forEach(key => {
                try {
                    items.push(JSON.parse(paymentIntent.metadata[key]));
                } catch (e) {}
            });
        }

        const existingOrder = await context.env.DB.prepare(
            "SELECT id FROM orders WHERE payment_intent_id = ?"
        ).bind(paymentIntentId).first();

        if (!existingOrder) {
            orderId = "ORD-" + Date.now();
            const shipping = paymentIntent.shipping;
            const addressStr = paymentIntent.metadata?.shipping_address || (shipping?.address 
                ? `${shipping.address.line1 || ''}, ${shipping.address.postal_code || ''} ${shipping.address.city || ''}, ${shipping.address.country || ''}`
                : 'Keine Adresse');
            
            const shippingNote = paymentIntent.metadata?.shipping_note || '';

            await context.env.DB.prepare(`
                INSERT INTO orders (id, payment_intent_id, customer_name, customer_email, shipping_address, shipping_note, total_amount, discount_amount, promo_code, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'offen')
            `).bind(
                orderId,
                paymentIntentId,
                kundeName || 'Unbekannt',
                kundeEmail,
                addressStr,
                shippingNote,
                parseFloat(gesamtBetrag),
                rabattWert,
                promoCode
            ).run();

            if (usedGiftCard && rabattWert > 0) {
                await context.env.DB.prepare(`
                    UPDATE gift_cards 
                    SET current_balance = MAX(0, current_balance - ?),
                        is_active = CASE WHEN (current_balance - ?) <= 0 THEN 0 ELSE 1 END
                    WHERE code = ?
                `).bind(rabattWert, rabattWert, usedGiftCard).run();
            }

            for (const item of items) {
                await context.env.DB.prepare(`
                    INSERT INTO order_items (order_id, product_name, variant, quantity, price)
                    VALUES (?, ?, ?, ?, ?)
                `).bind(
                    orderId,
                    item.name,
                    item.farbe || 'Standard',
                    item.quantity,
                    item.price
                ).run();

                const isGiftCardItem = item.isGiftCard || item.id?.toLowerCase().includes('gift') || item.id?.toLowerCase().includes('gutschein') || item.name.toLowerCase().includes('gutschein');
                
                if (isGiftCardItem) {
                    for (let q = 0; q < item.quantity; q++) {
                        let giftCode = '';
                        let isUnique = false;
                        let maxAttempts = 10;

                        while (!isUnique && maxAttempts > 0) {
                            const randomPart = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
                            giftCode = `FABIO-${randomPart.substring(0,4)}-${randomPart.substring(4,8)}`;

                            const existing = await context.env.DB.prepare(
                                "SELECT code FROM gift_cards WHERE code = ?"
                            ).bind(giftCode).first();

                            if (!existing) {
                                isUnique = true;
                            } else {
                                maxAttempts--;
                            }
                        }

                        const cardValue = parseFloat(item.price);

                        try {
                            await context.env.DB.prepare(`
                                INSERT INTO gift_cards (code, initial_balance, current_balance, purchased_by, order_id)
                                VALUES (?, ?, ?, ?, ?)
                            `).bind(giftCode, cardValue, cardValue, kundeEmail, orderId).run();

                            generatedGiftCards.push({
                                code: giftCode,
                                value: cardValue,
                                title: item.name
                            });
                        } catch (gcErr) {
                            console.error("Fehler beim Erstellen der Geschenkkarte:", gcErr);
                        }
                    }
                }
            }

            for (const item of items) {
                const isGiftCardItem = item.isGiftCard || item.id?.toLowerCase().includes('gift') || item.id?.toLowerCase().includes('gutschein') || item.name.toLowerCase().includes('gutschein');
                if (item.id && item.quantity && !isGiftCardItem) {
                    await context.env.DB.prepare(
                        "UPDATE product_variants SET stock = stock - ? WHERE id = ?"
                    ).bind(item.quantity, item.id).run();
                }
            }
        } else {
            orderId = existingOrder.id;
            const gcResults = await context.env.DB.prepare(
                "SELECT code, initial_balance as value FROM gift_cards WHERE order_id = ?"
            ).bind(orderId).all();
            if (gcResults && gcResults.results) {
                generatedGiftCards = gcResults.results;
            }
        }
    }

    const begruessungText = kundeName ? `Danke, ${kundeName}!` : "Danke für deine Bestellung!";

    let rabattHtml = '';
    if (rabattWert > 0 && promoCode && promoCode !== 'Keiner') {
      rabattHtml = `
      <div style="display: flex; justify-content: space-between; color: #16a34a; font-weight: 600; font-size: 13px; margin-bottom: 6px;">
          <span>Rabatt (${promoCode})</span>
          <span>-${rabattWert.toFixed(2)} ${waehrung}</span>
      </div>`;
    }

    const artikelListeHtml = items.map(item => {
        const variante = item.farbe || '';
        const einzelPreis = Number(item.price).toFixed(2);
        const gesamtZeilenPreis = (Number(item.price) * Number(item.quantity)).toFixed(2);

        return `
        <div class="item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
            <div class="item-details" style="display: flex; flex-direction: column; text-align: left;">
                <strong style="color: var(--text-main); font-size: 15px;">${item.name}</strong>
                <small style="color: var(--text-muted); margin-top: 2px;">${variante}</small>
            </div>
            
            <div class="item-price" style="display: flex; flex-direction: column; align-items: flex-end; text-align: right;">
                <strong style="color: var(--text-main); font-size: 16px; white-space: nowrap;">
                    ${gesamtZeilenPreis} CHF
                </strong>
                <span style="color: var(--text-muted); font-size: 13px; white-space: nowrap; margin-bottom: 2px;">
                    ${item.quantity}x ${einzelPreis} CHF
                </span>
            </div>
        </div>
        `;
    }).join('');

    let giftCardCardsHtml = '';
    if (generatedGiftCards.length > 0) {
        giftCardCardsHtml = generatedGiftCards.map(gc => `
            <div class="gift-card-box">
                <div class="gift-card-brand">FABIO<span>3D</span></div>
                <div class="gift-card-subtitle">DIGITALER GESCHENKGUTSCHEIN</div>
                
                <div class="gift-card-code-wrapper">
                    <span class="gift-card-code">${gc.code}</span>
                </div>
                
                <div class="gift-card-amount">Wert: CHF ${Number(gc.value).toFixed(2)}</div>
                <div class="gift-card-footer-text">Einlösbar im Checkout auf fabixtech.ch</div>
            </div>
        `).join('') + `
            <div class="no-print" style="text-align: center; margin-bottom: 20px;">
                <button onclick="window.print()" class="btn-print">
                    Gutschein als PDF / Papier drucken
                </button>
            </div>
        `;
    }

    const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Danke für deinen Einkauf!</title>
        <link rel="canonical" href="https://fabixtech.ch/" />
        <link rel="icon" type="image/png" href="/favicon/favicon-96x96.png" sizes="96x96"/>
        <script>
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
        </script>
        <style>
            :root {
                --bg-body: #f4f6f8;
                --bg-card: #ffffff;
                --text-main: #0f172a;
                --text-muted: #64748b;
                --border-color: #e2e8f0;
                --icon-bg: #e3faf2;
                --gc-bg: #ffffff;
                --gc-text: #0f172a;
                --gc-border: #d40202;
            }

            html[data-theme="dark"] {
                --bg-body: #0f172a;
                --bg-card: #1e293b;
                --text-main: #f8fafc;
                --text-muted: #94a3b8;
                --border-color: #334155;
                --icon-bg: #068d0d;
                --gc-bg: #0f172a;
                --gc-text: #ffffff;
                --gc-border: #d40202;
            }

            body { 
                font-family: 'Inter', sans-serif; 
                background: var(--bg-body); 
                color: var(--text-main); 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                margin: 0; 
                padding: 20px 0;
            }

            .card { 
                background: var(--bg-card); 
                padding: 30px; 
                border-radius: 16px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
                border: 1px solid var(--border-color);
                max-width: 440px; 
                width: 90%; 
            }

            h1 { text-align: center; font-size: 22px; color: var(--text-main); }
            .btn { display: block; text-align: center; background: #d40202; color: white; padding: 12px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: bold; }
            .btn-print { background: var(--bg-body); color: var(--text-main); border: 1px solid var(--border-color); padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
            .btn-print:hover { border-color: #d40202; color: #d40202; }

            .icon { display: flex; justify-content: center; align-items: center; width: 56px; height: 56px; background-color: var(--icon-bg); border-radius: 50%; margin: 0 auto 24px auto; }
            .icon img { width: 56px; height: 56px; }

            .gift-card-box {
                background: var(--gc-bg);
                color: var(--gc-text);
                padding: 24px;
                border-radius: 16px;
                text-align: center;
                margin: 20px 0;
                border: 2px solid var(--gc-border);
                box-shadow: 0 8px 20px rgba(0,0,0,0.06);
            }
            .gift-card-brand { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: var(--gc-text); }
            .gift-card-brand span { color: #d40202; }
            .gift-card-subtitle { font-size: 11px; color: var(--text-muted); letter-spacing: 1.5px; margin: 4px 0 16px 0; font-weight: bold; }
            .gift-card-code-wrapper { background: rgba(212, 2, 2, 0.08); padding: 12px; border-radius: 8px; border: 1px dashed #d40202; margin: 12px 0; }
            .gift-card-code { font-size: 22px; font-weight: 900; letter-spacing: 3px; color: #d40202; }
            .gift-card-amount { font-size: 16px; font-weight: bold; margin-top: 10px; }
            .gift-card-footer-text { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

            @media print {
                body { background: #ffffff !important; color: #000000 !important; display: block !important; padding: 0 !important; margin: 0 !important; }
                .card { box-shadow: none !important; border: none !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
                .no-print, .icon, h1, p, .btn, .item, .item-price, button { display: none !important; }
                .gift-card-box { 
                    border: 2px solid #000000 !important; 
                    background: #ffffff !important; 
                    color: #000000 !important; 
                    width: 100% !important; 
                    max-width: 450px !important;
                    margin: 10px auto !important; 
                    padding: 25px !important; 
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
                .gift-card-brand { color: #000000 !important; font-size: 24px !important; }
                .gift-card-code-wrapper { border: 2px dashed #000000 !important; background: #f8fafc !important; }
                .gift-card-code { color: #000000 !important; font-size: 22px !important; }
                @page { margin: 15mm; size: auto; }
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon no-print"><img src="../images/success.png" alt="Erfolg"></div>
            <h1 class="no-print">${begruessungText}</h1>
            <p class="no-print" style="text-align: center; color: var(--text-muted);">Deine Bestellung war erfolgreich.</p>
            
            ${giftCardCardsHtml}

            <div class="no-print" style="margin-top: 20px;">
                ${artikelListeHtml}
                <div style="display: flex; justify-content: space-between; color: var(--text-muted); font-size: 13px; margin-bottom: 2px;">
                  <span>Versand</span>
                  <span>${shippingCost.toFixed(2)} ${waehrung}</span>
                </div>
                ${rabattHtml}
                <div style="display: flex; justify-content: space-between; font-weight: bold; color: var(--text-main); margin-top: 10px;">
                    <span>Gesamt</span>
                    <span>${gesamtBetrag} ${waehrung}</span>
                </div>
            </div>
            
            <a href="/" class="btn no-print">Zurück zur Startseite</a>
        </div>
        <script>
            localStorage.removeItem('fabixtech_cart');
            localStorage.removeItem('cart');
        </script>
    </body>
    </html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error) {
    return new Response("Fehler: " + error.message, { status: 500 });
  }
}