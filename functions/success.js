import Stripe from 'stripe';
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return new Response("Keine Session-ID übergeben.", { status: 400 });
  }

  try {
    const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    const kundeName = session.customer_details?.name || "Kunde";
    const gesamtBetrag = (session.amount_total / 100).toFixed(2);
    const waehrung = session.currency.toUpperCase();
    const gekaufteArtikel = session.line_items.data;

    const artikelListeHtml = gekaufteArtikel.map(item => `
      <div class="item">
          <span class="item-name">${item.description} <span class="qty">x${item.quantity}</span></span>
          <span class="item-price">${(item.amount_total / 100).toFixed(2)} ${waehrung}</span>
      </div>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Danke für deinen Einkauf!</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #f4f6f8;
                color: #1a1f36;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
            }
            .card {
                background: #ffffff;
                padding: 30px;
                border-radius: 16px;
                box-shadow: 0 50px 100px -20px rgba(50, 50, 93, 0.12), 0 30px 60px -30px rgba(0, 0, 0, 0.15);
                max-width: 400px;
                width: 90%;
            }
            .icon {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 56px;
                height: 56px;
                background-color: #e3faf2;
                color: #00d48a;
                font-size: 24px;
                border-radius: 50%;
                margin: 0 auto 20px auto;
            }
            h1 { font-size: 22px; text-align: center; margin: 0 0 10px 0; }
            p { color: #697386; font-size: 14px; text-align: center; margin: 0 0 20px 0; }
            .summary { border-top: 1px solid #e3e8ee; border-bottom: 1px solid #e3e8ee; padding: 15px 0; }
            .item { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px; }
            .item-name { color: #4f566b; }
            .qty { color: #8792a2; font-size: 12px; }
            .total { display: flex; justify-content: space-between; font-weight: 600; margin-top: 15px; padding-top: 15px; border-top: 1px dashed #e3e8ee; }
            .btn { display: block; text-align: center; background-color: #635bff; color: white; text-decoration: none; padding: 12px; border-radius: 8px; font-weight: 600; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">✓</div>
            <h1>Danke, ${kundeName}!</h1>
            <p>Deine Zahlung war erfolgreich.</p>
            <div class="summary">
                ${artikelListeHtml}
                <div class="total">
                    <span>Gesamt</span>
                    <span>${gesamtBetrag} ${waehrung}</span>
                </div>
            </div>
            <a href="/" class="btn">Zurück zum Shop</a>
        </div>
    </body>
    </html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    return new Response("Fehler beim Laden der Bestelldaten: " + error.message, { status: 500 });
  }
}
