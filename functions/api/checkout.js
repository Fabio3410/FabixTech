import Stripe from 'stripe';

export async function onRequestPost(context) {
    try {
        const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);
        const { cart } = await context.request.json();
        for (const item of cart) {
            const productId = item.id;
            const kundenMenge = item.quantity;

            if (!productId) continue;

            const aktuellerBestandRaw = await context.env.INVENTORY.get(productId);
            const aktuellerBestand = parseInt(aktuellerBestandRaw || "0");
            if (aktuellerBestand < kundenMenge) {
                return new Response(JSON.stringify({ 
                    error: `Entschuldigung, das Produkt "${item.name}" ist leider nicht mehr in der gewünschten Menge verfügbar.` 
                }), { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        const lineItems = cart.map(item => {
            const produktBeschreibung = item.farbe ? `Variante: ${item.farbe}` : '';

            return {
                price_data: {
                    currency: 'chf',
                    product_data: {
                        name: item.name,
                        description: produktBeschreibung,
                        metadata: {
                            id: item.id 
                        },
                    },
                    unit_amount: item.price,
                },
                quantity: item.quantity,
            };
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: [
                'card',
                'twint'
            ],
            line_items: lineItems,
            mode: 'payment',
            allow_promotion_codes: true,
            shipping_address_collection: {
              allowed_countries: ['CH'],
            },
            shipping_options: [
              {
                shipping_rate: 'shr_1TtOw8HRWCYHtDl04j8UrqdP',
              },
            ],
            success_url: 'https://fabio3d.pages.dev/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://fabio3d.pages.dev/failure',
        });

        return new Response(JSON.stringify({ url: session.url }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Stripe Fehler:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
