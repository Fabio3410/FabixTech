import Stripe from 'stripe';

const PRODUKT_DATENBANK = {
  'gelenkschlange_gruen': { name: 'Gelenkschlange (Grün)', preisInRappen: 149 },
  'gelenkschlange_gelb': { name: 'Gelenkschlange (Gelb)', preisInRappen: 149 },
  'gelenkschlange_schwarz': { name: 'Gelenkschlange (Schwarz)', preisInRappen: 149 },
  'spiral_cone_fidget_schwarz_rot': { name: 'Spiral Cone Fidget (Schwarz/Rot)', preisInRappen: 195 },
  'gandalf_the_white_staff': { name: 'Gandalf The White Staff', preisInRappen: 3995 }
};
export async function onRequestPost(context) {
    try {
        const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);
        const { cart } = await context.request.json();

        // 3. Hier deine Line-Items für Stripe erstellen (Diesen Teil aus deinem alten Netlify-Code kopieren!)
        const lineItems = cart.map(item => {
            return {
                price_data: {
                    currency: 'chf', // oder deine Währung
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: item.price, // Preis ist bereits in Rappen/Cent!
                },
                quantity: item.quantity,
            };
        });

        // 4. Stripe Checkout Session erstellen (Pfade für Success/Cancel evtl. anpassen)
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card, twint'],
            line_items: lineItems,
            mode: 'payment',
            allow_promotion_codes: true,
            success_url: `${new URL(context.request.url).origin}/?success=true`,
            cancel_url: `${new URL(context.request.url).origin}/?canceled=true`,
        });

        // 5. Erfolgreiche Antwort mit der Stripe-Zahlungs-URL zurückgeben
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
