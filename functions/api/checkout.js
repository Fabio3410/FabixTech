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

        const lineItems = cart.map(item => {
            const produktBeschreibung = item.farbe ? `Farbe: ${item.farbe}` : '';

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

        const session = await stripe.checkout.sessions.create({
            payment_method_types: [
                'card',
                'twint'
            ],
            line_items: lineItems,
            mode: 'payment',
            allow_promotion_codes: true,
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
