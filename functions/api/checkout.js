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
                    error: `Das Produkt "${item.name}" ist leider nicht mehr in deiner ausgewählten Anzahl verfügbar.` 
                }), { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        
        let totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const versandkostenRappen = 570; // 5.70 CHF
        totalAmount += versandkostenRappen;

        const sessionMetadata = {};
        cart.forEach((item, index) => {
            sessionMetadata[`item_${index}`] = JSON.stringify({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                farbe: item.farbe || ''
            });
        });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency: 'chf',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: sessionMetadata,
        });

        return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
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