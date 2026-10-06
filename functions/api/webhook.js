import Stripe from 'stripe';

export async function onRequestPost(context) {
    const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);
    const signature = context.request.headers.get('stripe-signature');
    const body = await context.request.text();

    let event;
    try {
        event = await stripe.webhooks.constructEventAsync(body, signature, context.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error("Webhook Signatur-Fehler:", err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const metadata = session.metadata || {};

        for (const key in metadata) {
            if (key.startsWith('prod_')) {
                const productId = key.replace('prod_', '');
                const gekaufteMenge = parseInt(metadata[key] || "0");

                if (productId && gekaufteMenge > 0) {
                    const result = await context.env.DB.prepare(
                        "SELECT stock FROM inventory WHERE id = ?"
                    ).bind(productId).first();
                    
                    const aktuellerBestand = result ? parseInt(result.stock) : 0;
                    const neuerBestand = Math.max(0, aktuellerBestand - gekaufteMenge);
                    await context.env.DB.prepare(
                        "UPDATE inventory SET stock = ? WHERE id = ?"
                    ).bind(neuerBestand, productId).run();

                    console.log(`D1 Erfolg: ${productId} von ${aktuellerBestand} auf ${neuerBestand} gesetzt.`);
                }
            }
        }
    }

    return new Response(JSON.stringify({ received: true }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
