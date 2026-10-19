import Stripe from 'stripe';

function parseCookie(cookieString, key) {
    if (!cookieString) return null;
    const match = cookieString.match(new RegExp('(^| )' + key + '=([^;]+)'));
    return match ? match[2] : null;
}

export async function onRequestPost(context) {
    try {
        const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);
        const { cart, promoCode, shippingAddress } = await context.request.json();
        const cookieHeader = context.request.headers.get('Cookie') || '';
        const authHeader = context.request.headers.get('Authorization') || '';

        let sessionId = parseCookie(cookieHeader, 'session_id');
        if (!sessionId && authHeader.startsWith('Bearer ')) {
            sessionId = authHeader.substring(7).trim();
        }

        let customerEmail = shippingAddress?.email || '';
        if (sessionId) {
            const user = await context.env.DB.prepare("SELECT email FROM users WHERE session_id = ?").bind(sessionId).first();
            if (user && user.email) customerEmail = user.email;
        }

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return new Response(JSON.stringify({ error: 'Dein Warenkorb ist leer.' }), { status: 400 });
        }

        let verifiedCart = [];
        let itemsSubtotalRappen = 0;
        let hasOnlyGiftCards = true;

        for (const item of cart) {
            const variantId = item.id;
            const kundenMenge = parseInt(item.quantity) || 1;
            if (!variantId) continue;

            const result = await context.env.DB.prepare("SELECT stock, price FROM product_variants WHERE id = ?").bind(variantId).first();
            if (!result) return new Response(JSON.stringify({ error: `Produkt nicht gefunden.` }), { status: 400 });

            const aktuellerBestand = parseInt(result.stock) || 0;
            const echterPreisFranken = parseFloat(result.price) || 0;
            const echterPreisRappen = Math.round(echterPreisFranken * 100);

            if (aktuellerBestand < kundenMenge) {
                return new Response(JSON.stringify({ error: `Produkt "${item.name}" ausverkauft.` }), { status: 400 });
            }

            itemsSubtotalRappen += echterPreisRappen * kundenMenge;

            const isGiftCardItem = variantId.toLowerCase().includes('gift') || variantId.toLowerCase().includes('gutschein') || item.name.toLowerCase().includes('gutschein');
            if (!isGiftCardItem) hasOnlyGiftCards = false;

            verifiedCart.push({
                id: variantId,
                name: item.name,
                quantity: kundenMenge,
                price: echterPreisFranken,
                farbe: item.farbe || item.variant || 'Standard',
                isGiftCard: isGiftCardItem
            });
        }
        
        let rabattRappen = 0;
        let angewendeterCode = null;
        let usedGiftCardCode = null;

        const versandkostenRappen = hasOnlyGiftCards ? 0 : 590;
        const bruttoGesamtRappen = itemsSubtotalRappen + versandkostenRappen;

        if (promoCode && promoCode.trim() !== '') {
            const cleanCode = promoCode.trim().toUpperCase();
            
            const giftCard = await context.env.DB.prepare(
                "SELECT * FROM gift_cards WHERE code = ? AND is_active = 1 AND current_balance > 0"
            ).bind(cleanCode).first();

            if (giftCard) {
                const giftCardBalanceRappen = Math.round(giftCard.current_balance * 100);
                rabattRappen = Math.min(bruttoGesamtRappen, giftCardBalanceRappen);
                angewendeterCode = cleanCode;
                usedGiftCardCode = cleanCode;
            } else {
                const promo = await context.env.DB.prepare("SELECT * FROM promo_codes WHERE code = ?").bind(cleanCode).first();
                if (!promo) return new Response(JSON.stringify({ error: 'Code ungültig.' }), { status: 400 });

                if (promo.type === 'percent') {
                    rabattRappen = Math.round((itemsSubtotalRappen * promo.value) / 100);
                } else if (promo.type === 'fixed') {
                    rabattRappen = Math.round(promo.value * 100);
                }
                rabattRappen = Math.min(bruttoGesamtRappen, rabattRappen);
                angewendeterCode = cleanCode;
            }
        }

        let totalAmountRappen = bruttoGesamtRappen - rabattRappen;
        
        if (totalAmountRappen > 0 && totalAmountRappen < 100) {
            totalAmountRappen = 100;
        }

        const formattedAddress = shippingAddress 
            ? `${shippingAddress.street}, ${shippingAddress.zip} ${shippingAddress.city}, CH`
            : '';

        const sessionMetadata = {
            promoCode: angewendeterCode || 'Keiner',
            usedGiftCard: usedGiftCardCode || '',
            rabatt: `${(rabattRappen / 100).toFixed(2)} CHF`,
            customer_name: shippingAddress?.name || '',
            customer_email: customerEmail,
            shipping_address: formattedAddress,
            shipping_note: shippingAddress?.shipping_note || '',
            isOnlyDigital: hasOnlyGiftCards ? 'true' : 'false'
        };

        verifiedCart.forEach((item, index) => {
            sessionMetadata[`item_${index}`] = JSON.stringify({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                farbe: item.farbe,
                isGiftCard: item.isGiftCard
            });
        });

        if (totalAmountRappen === 0) {
            return new Response(JSON.stringify({ 
                freeOrder: true,
                subtotal: itemsSubtotalRappen / 100,
                discount: rabattRappen / 100,
                shipping: versandkostenRappen / 100,
                total: 0,
                appliedCode: angewendeterCode
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmountRappen,
            currency: 'chf',
            automatic_payment_methods: { enabled: true },
            metadata: sessionMetadata,
            shipping: shippingAddress && !hasOnlyGiftCards ? {
                name: shippingAddress.name,
                address: { line1: shippingAddress.street, postal_code: shippingAddress.zip, city: shippingAddress.city, country: 'CH' }
            } : undefined
        });

        return new Response(JSON.stringify({ 
            clientSecret: paymentIntent.client_secret,
            subtotal: itemsSubtotalRappen / 100,
            discount: rabattRappen / 100,
            shipping: versandkostenRappen / 100,
            total: totalAmountRappen / 100,
            appliedCode: angewendeterCode
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error("Stripe Fehler:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}