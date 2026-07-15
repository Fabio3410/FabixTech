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
      expand: ['line_items', 'line_items.data.price.product'],
    });

    const kundeName = session.customer_details?.name || "Kunde";
    const gesamtBetrag = (session.amount_total / 100).toFixed(2);
    const waehrung = session.currency.toUpperCase();
    const artikelListeHtml = session.line_items.data.map(item => {
        const farbe = item.price.product.description || '';
        const einzelPreis = (item.amount_total / 100 / item.quantity).toFixed(2);

        return `
        <div class="item" style="display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            <div class="item-details">
                <strong style="color: #4f566b; display: block;">${item.description}</strong>
                <small style="color: #8792a2;">${farbe}</small>
            </div>
            <div class="item-price" style="text-align: right;">
                <span style="color: #8792a2; font-size: 12px;">${item.quantity}x ${einzelPreis} ${waehrung}</span>
                <br>
                <strong>${(item.amount_total / 100).toFixed(2)} ${waehrung}</strong>
            </div>
        </div>
        `;
    }).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Danke für deinen Einkauf!</title>
        <style>
            body { font-family: sans-serif; background: #f4f6f8; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .card { background: #fff; padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); max-width: 400px; width: 90%; }
            h1 { text-align: center; font-size: 22px; }
            .btn { display: block; text-align: center; background: #635bff; color: white; padding: 12px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Danke, ${kundeName}!</h1>
            <p style="text-align: center; color: #697386;">Deine Zahlung war erfolgreich.</p>
            
            <div style="margin-top: 20px;">
                ${artikelListeHtml}
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 10px;">
                    <span>Gesamt</span>
                    <span>${gesamtBetrag} ${waehrung}</span>
                </div>
            </div>
            
            <a href="/" class="btn">Zurück zur Startseite</a>
        </div>
    </body>
    </html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    return new Response("Fehler: " + error.message, { status: 500 });
  }
}
