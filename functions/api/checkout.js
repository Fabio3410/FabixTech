import Stripe from 'stripe';

export async function onRequestPost(context) {
    try {
        const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);
        const { cart } = await context.request.json();
        
        for (const item of cart) {
            const productId = item.id;
            const kundenMenge = item.quantity;

            if (!productId) continue;
            const result = await context.env.DB.prepare(
                "SELECT stock FROM inventory WHERE id = ?"
            ).bind(productId).first();
            
            const aktuellerBestand = result ? parseInt(result.stock) : 0;

            if (aktuellerBestand < kundenMenge) {
                return new Response(JSON.stringify({ 
                    error: `Das Produkt "${item.name}" ist leider nicht mehr in deiner ausgwählten Anzahl verfügbar.` 
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
                    },
                    unit_amount: item.price,
                },
                quantity: item.quantity,
            };
        });

        const sessionMetadata = {};
        cart.forEach(item => {
            if (item.id) {
                sessionMetadata[`prod_${item.id}`] = item.quantity.toString();
            }
        });

        const session = await stripe.checkout.sessions.create({
            ui_mode: 'embedded',
            payment_method_types: ['card', 'twint'],
            line_items: lineItems,
            mode: 'payment',
            allow_promotion_codes: true,
            metadata: sessionMetadata,
            shipping_address_collection: { allowed_countries: ['CH'] },
            shipping_options: [{ shipping_rate: 'shr_1UDTIdHRWCYHtDl0fMHuhs0U' }],
            return_url: 'https://fabio3d.pages.dev/success?session_id={CHECKOUT_SESSION_ID}',
        });

        return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
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
