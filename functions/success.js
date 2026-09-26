import Stripe from 'stripe';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const paymentIntentId = url.searchParams.get('payment_intent');

  if (!paymentIntentId) {
    return new Response("Keine Zahlungs-ID übergeben.", { status: 400 });
  }

  try {
    const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return new Response("Die Zahlung wurde noch nicht abgeschlossen.", { status: 400 });
    }

    const kundeName = paymentIntent.shipping?.name || '';
    const begruessungText = kundeName ? `Danke, ${kundeName}!` : "Danke für deine Bestellung!";
    const gesamtBetrag = (paymentIntent.amount / 100).toFixed(2);
    const waehrung = paymentIntent.currency.toUpperCase();
    let items = [];
        if (paymentIntent.metadata) {
            Object.keys(paymentIntent.metadata)
            .filter(key => key.startsWith('item_'))
            .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
            .forEach(key => {
                try {
                    items.push(JSON.parse(paymentIntent.metadata[key]));
                } catch (e) {
                    console.error("Fehler beim Parsen von", key, e);
                }
            });
        }

    const artikelListeHtml = items.map(item => {
      const variante = item.farbe || '';
      const einzelPreis = (item.price / 100).toFixed(2);
      const gesamtZeilenPreis = ((item.price * item.quantity) / 100).toFixed(2);

      return `
      <div class="item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
          <div class="item-details" style="display: flex; flex-direction: column; text-align: left;">
              <strong style="color: #000000; font-size: 15px;">${item.name}</strong>
              <small style="color: #8792a2; margin-top: 2px;">${variante}</small>
          </div>
          
          <div class="item-price" style="display: flex; flex-direction: column; align-items: flex-end; text-align: right;">
              <strong style="color: #000000; font-size: 16px; white-space: nowrap;">
                  ${gesamtZeilenPreis} CHF
              </strong>
              <span style="color: #8792a2; font-size: 13px; white-space: nowrap; margin-bottom: 2px;">
                  ${item.quantity}x ${einzelPreis} CHF
              </span>
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
        <meta name="apple-mobile-web-app-title" content="Fabio3D">
        <title>Danke für deinen Einkauf!</title>
        <link rel="icon" type="image/png" href="/favicon/favicon-96x96.png" sizes="96x96"/>
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg"/>
        <link rel="shortcut icon" href="/favicon/favicon.ico"/>
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png"/>
        <link rel="manifest" href="/favicon/site.webmanifest"/>
        <style>
            body { font-family: sans-serif; background: #f4f6f8; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .card { background: #fff; padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); max-width: 400px; width: 90%; }
            h1 { text-align: center; font-size: 22px; }
            .btn { display: block; text-align: center; background: #d40202; color: white; padding: 12px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: bold; }
            .icon {
              display: flex;
              justify-content: center;
              align-items: center;
              width: 56px;
              height: 56px;
              background-color: #e3faf2;
              font-size: 24px;
              font-weight: bold;
              border-radius: 50%;
              margin: 0 auto 24px auto;
          }
          .icon img { width: 56px; height: 56px; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">
                <img src="../images/success.png" alt="Erfolg">
            </div>
            <h1>${begruessungText}</h1>
            <p style="text-align: center; color: #8792a2;">Deine Zahlung war erfolgreich.</p>
            
            <div style="margin-top: 20px;">
                ${artikelListeHtml}
                <div style="display: flex; justify-content: space-between; color: #8792a2; font-size: 13px; white-space: nowrap; margin-bottom: 2px;">
                  <span>Versand</span>
                  <span>5.70 ${waehrung}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 10px;">
                    <span>Gesamt</span>
                    <span>${gesamtBetrag} ${waehrung}</span>
                </div>
            </div>
            
            <a href="/" class="btn">Zurück zur Startseite</a>
        </div>
        <script>
            localStorage.removeItem('fabio3d_cart');
            localStorage.removeItem('cart');
        </script>
    </body>
    </html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    return new Response("Fehler: " + error.message, { status: 500 });
  }
}