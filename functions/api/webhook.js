import Stripe from 'stripe';

export async function onRequestPost(context) {
    const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);
    const signature = context.request.headers.get('stripe-signature');
    const body = await context.request.text();

    let event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, context.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error("Webhook Signatur-Fehler:", err.message);
        return new Response('Webhook Error', { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            expand: ['data.price.product']
        });

        for (const item of lineItems.data) {
            const productId = item.price.product.metadata.id;
            const gekaufteMenge = item.quantity;

            console.log(`Webhook verarbeitet Produkt-ID: ${productId}, Menge: ${gekaufteMenge}`);

            if (productId) {
                const aktuellerBestandRaw = await context.env.INVENTORY.get(productId);
                const aktuellerBestand = parseInt(aktuellerBestandRaw || "0");
                const neuerBestand = Math.max(0, aktuellerBestand - gekaufteMenge);
                await context.env.INVENTORY.put(productId, neuerBestand.toString());
                console.log(`Bestand für ${productId} erfolgreich aktualisiert von ${aktuellerBestand} auf ${neuerBestand}.`);
            } else {
                console.warn("Warnung: Keine Produkt-ID in den Stripe-Metadaten gefunden!");
            }
        }
    }

    return new Response(JSON.stringify({ received: true }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
