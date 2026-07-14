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
            return {
                price_data: {
                    currency: 'chf',
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: item.price,
                },
                quantity: item.quantity,
            };
        });

        const session = await stripe.checkout.sessions.create({
          automatic_payment_methods: {
            enabled: true,
            },
            line_items: lineItems,
            mode: 'payment',
            allow_promotion_codes: true,
            success_url: `${new URL(context.request.url).origin}/?success=true`,
            cancel_url: `${new URL(context.request.url).origin}/?canceled=true`,
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
