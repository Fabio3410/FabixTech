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
    const { cartIds } = await context.request.json();

    if (!cartIds || !Array.isArray(cartIds) || cartIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Der Warenkorb ist leer.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const produktMengen = {};
    cartIds.forEach(id => {
      produktMengen[id] = (produktMengen[id] || 0) + 1;
    });

    const stripeLineItems = [];

    for (const [id, quantity] of Object.entries(produktMengen)) {
      const produkt = PRODUKT_DATENBANK[id];
      
      if (!produkt) {
        return new Response(JSON.stringify({ error: `Produkt "${id}" wurde nicht gefunden.` }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      stripeLineItems.push({
        price_data: {
          currency: 'chf',
          product_data: { name: produkt.name },
          unit_amount: produkt.preisInRappen,
        },
        quantity: quantity,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'twint'],
      line_items: stripeLineItems,
      mode: 'payment',
      success_url: `${new URL(context.request.url).origin}/erfolg.html`,
      cancel_url: `${new URL(context.request.url).origin}/index.html`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}