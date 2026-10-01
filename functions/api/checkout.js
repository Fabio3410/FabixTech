import Stripe from 'stripe';

const PROMO_CODES = {
    'RABATT10': { type: 'percent', value: 10 }, // 10% Rabatt
    'SPARE5': { type: 'fixed', value: 500 },    // 5 Franken Rabatt
    'VIP20': { type: 'percent', value: 20 }     // 20% Rabatt
};

export async function onRequestPost(context) {
    try {
        const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);
        const { cart, promoCode, shippingAddress } = await context.request.json();
        
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
        
        let itemsSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let rabattRappen = 0;
        let angewendeterCode = null;

        if (promoCode && promoCode.trim() !== '') {
            const cleanCode = promoCode.trim().toUpperCase();
            const promo = PROMO_CODES[cleanCode];

            if (!promo) {
                return new Response(JSON.stringify({ 
                    error: 'Der eingegebene Aktionscode ist ungültig.' 
                }), { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (promo.type === 'percent') {
                rabattRappen = Math.round((itemsSubtotal * promo.value) / 100);
            } else if (promo.type === 'fixed') {
                rabattRappen = promo.value;
            }

            if (rabattRappen > itemsSubtotal) {
                rabattRappen = itemsSubtotal;
            }

            angewendeterCode = cleanCode;
        }

        const versandkostenRappen = 590;
        const totalAmount = (itemsSubtotal - rabattRappen) + versandkostenRappen;

        const formattedAddress = shippingAddress 
            ? `${shippingAddress.street}, ${shippingAddress.zip} ${shippingAddress.city}, CH`
            : '';

        const sessionMetadata = {
            promoCode: angewendeterCode || 'Keiner',
            rabatt: `${(rabattRappen / 100).toFixed(2)} CHF`,
            customer_name: shippingAddress?.name || '',
            customer_email: shippingAddress?.email || '',
            shipping_address: formattedAddress
        };

        cart.forEach((item, index) => {
            sessionMetadata[`item_${index}`] = JSON.stringify({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                farbe: item.farbe || ''
            });
        });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency: 'chf',
            automatic_payment_methods: { enabled: true },
            metadata: sessionMetadata,
            shipping: shippingAddress ? {
                name: shippingAddress.name,
                address: {
                    line1: shippingAddress.street,
                    postal_code: shippingAddress.zip,
                    city: shippingAddress.city,
                    country: 'CH'
                }
            } : undefined
        });

        return new Response(JSON.stringify({ 
            clientSecret: paymentIntent.client_secret,
            subtotal: itemsSubtotal / 100,
            discount: rabattRappen / 100,
            shipping: versandkostenRappen / 100,
            total: totalAmount / 100,
            appliedCode: angewendeterCode
        }), {
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