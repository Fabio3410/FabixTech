let cart = JSON.parse(localStorage.getItem('fabio3d_cart')) || [];

function saveCartToStorage() {
    localStorage.setItem('fabio3d_cart', JSON.stringify(cart));
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

function addToCart(id, name, price, variant, maxStock) {
    const selectedVariant = variant || 'Standard';
    const bestehenderArtikel = cart.find(item => item.id === id);
    const stockLimit = parseInt(maxStock) || 0;

    const isGiftCard = (id || '').toLowerCase().includes('gift') || 
                       (id || '').toLowerCase().includes('gutschein') || 
                       (name || '').toLowerCase().includes('gutschein');

    if (isGiftCard) {
        let currentTotalGiftCards = 0;
        cart.forEach(item => {
            const iId = (item.id || '').toLowerCase();
            const iName = (item.name || '').toLowerCase();
            if (iId.includes('gift') || iId.includes('gutschein') || iName.includes('gutschein')) {
                currentTotalGiftCards += (item.quantity || 1);
            }
        });

        if (currentTotalGiftCards >= 5) {
            alert("Du darfst nur 5 Geschenkkarten aufs mal bestellen.");
            return;
        }
    } else {
        if (stockLimit <= 0 && !bestehenderArtikel) {
            alert("Dieses Produkt ist aktuell ausverkauft.");
            return;
        }
        if (bestehenderArtikel && bestehenderArtikel.maxStock && bestehenderArtikel.quantity >= bestehenderArtikel.maxStock) {
            alert(`Es sind nur noch ${bestehenderArtikel.maxStock} Stück von dieser Variante auf Lager.`);
            return;
        }
    }

    if (bestehenderArtikel) {
        if (stockLimit > 0) bestehenderArtikel.maxStock = stockLimit;
        bestehenderArtikel.quantity = (bestehenderArtikel.quantity || 1) + 1;
    } else {
        cart.push({ 
            id, 
            name, 
            price, 
            variant: selectedVariant, 
            quantity: 1, 
            maxStock: isGiftCard ? 5 : stockLimit 
        });
    }

    saveCartToStorage();
    updateCartUI();
    
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) {
        sidebar.classList.add('open');
    }
}

function updateCartUI() {
    const countElement = document.getElementById('cart-count');
    const container = document.getElementById('cart-items-container');
    const subtotalElement = document.getElementById('cart-subtotal');
    const shippingElement = document.getElementById('cart-shipping');
    const totalElement = document.getElementById('cart-total');
    const checkoutButton = document.getElementById('checkout-button');
    const legalCheckbox = document.getElementById('legal-checkbox');
    
    let subtotal = 0;
    let anzahlGesamt = 0;
    let hasOnlyGiftCards = cart.length > 0;
    
    cart.forEach(item => {
        anzahlGesamt += (item.quantity || 1);

        const itemId = (item.id || '').toLowerCase();
        const itemName = (item.name || '').toLowerCase();
        const isGiftCard = itemId.includes('gift') || itemId.includes('gutschein') || itemName.includes('gutschein');
        if (!isGiftCard) {
            hasOnlyGiftCards = false;
        }
    });

    const versandKosten = hasOnlyGiftCards ? 0.00 : 5.90;

    if (countElement) {
        countElement.innerText = anzahlGesamt;
    }

    if (cart.length === 0) {
        if (container) container.innerHTML = '<p class="empty-msg">Dein Warenkorb ist noch leer.</p>';
        if (subtotalElement) subtotalElement.innerText = 'CHF 0.00';
        if (shippingElement) shippingElement.innerText = 'CHF 0.00';
        if (totalElement) totalElement.innerText = 'CHF 0.00';
        if (checkoutButton) checkoutButton.disabled = true;
        return;
    }

    if (container) {
        container.innerHTML = '';

        cart.forEach((item, index) => {
            const sichererPreis = Number(item.price) || 0;
            const menge = Number(item.quantity) || 1;
            const zeilenTotal = sichererPreis * menge;
            subtotal += zeilenTotal;

            const itemRow = document.createElement('div');
            itemRow.classList.add('cart-item');

            itemRow.innerHTML = `
                <div style="display: flex; flex-direction: column; flex-grow: 1; text-align: left; margin-right: 10px;">
                    <span style="font-weight: 500; color: var(--text-main); font-size: 15px;">${item.name || 'Unbekanntes Produkt'}</span>
                    <span style="font-size: 12px; color: #777777; margin-top: 2px;">
                        Variante: ${item.variant || 'Standard'} 
                        <span style="color: #d40202; font-weight: bold; margin-left: 6px;">(x${menge})</span>
                    </span>
                </div>
                <div>
                    <strong style="margin-right: 12px; white-space: nowrap; align-self: center;">CHF ${zeilenTotal.toFixed(2)}</strong><br>
                    <span>
                        <button class="btn-decrease" onclick="decreaseQuantity('${item.id}')" style="background: none; border: none; color: #A9A9A9; font-size: 25px; cursor: pointer;"><img src="/images/remove-icon.svg" alt="minus"></button>
                        <button class="btn-increase" onclick="increaseQuantity('${item.id}')" style="background: none; border: none; color: #A9A9A9; font-size: 25px; cursor: pointer;"><img src="/images/add-icon.svg" alt="plus"></button>
                    </span>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${index})" style="align-self: center;">
                    <img class="dark-invert" src="/images/delete-icon.svg" alt="delete">
                </button>
            `;
            container.appendChild(itemRow);
        });
    }

    if (subtotalElement) {
        subtotalElement.innerText = `CHF ${subtotal.toFixed(2)}`;
    }

    if (shippingElement) {
        shippingElement.innerText = `CHF ${versandKosten.toFixed(2)}`;
    }

    const gesamtsumme = subtotal + versandKosten;
    if (totalElement) {
        totalElement.innerText = `CHF ${gesamtsumme.toFixed(2)}`;
    }

    if (checkoutButton) {
        const isChecked = legalCheckbox ? legalCheckbox.checked : false;
        checkoutButton.disabled = !(cart.length > 0 && isChecked);
    }
}

async function checkout() {
    if (cart.length === 0) {
        alert("Dein Warenkorb ist leer!");
        return;
    }

    const legalCheckbox = document.getElementById('legal-checkbox');
    if (legalCheckbox && !legalCheckbox.checked) {
        alert("Bitte akzeptiere zuerst die AGB und Datenschutzerklärung.");
        return;
    }

    const formattedCart = cart.map(item => ({
        id: item.id, 
        name: item.name,
        price: Math.round(item.price),
        quantity: item.quantity || 1,
        farbe: item.variant || 'Standard'
    }));

    try {
        const token = localStorage.getItem('session_id') || (JSON.parse(localStorage.getItem('user') || '{}')).session_id;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ cart: formattedCart }),
        });

        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        window.location.href = '/checkout';
    } catch (error) {
        console.error("Fehler beim Checkout:", error);
        alert("Es ist ein Fehler aufgetreten.");
    }
}

async function initCheckoutPage(promoCode = null) {
    const form = document.getElementById('payment-form');
    if (!form) return;

    if (typeof cart === 'undefined' || !cart || cart.length === 0) {
        document.querySelector('.checkout-container').innerHTML = '<p>Dein Warenkorb ist leer. <a href="/">Zurück zum Shop</a></p>';
        return;
    }

    const formattedCart = cart.map(item => ({
        id: item.id, 
        name: item.name,
        price: Math.round(item.price),
        quantity: item.quantity || 1,
        farbe: item.variant || 'Standard'
    }));

    try {
        const token = localStorage.getItem('session_id') || (JSON.parse(localStorage.getItem('user') || '{}')).session_id;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ cart: formattedCart, promoCode }),
        });

        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        const itemListContainer = document.getElementById('checkout-item-list');
        const totalPriceContainer = document.getElementById('checkout-total-price');
        const promoMsgContainer = document.getElementById('promo-message');

        if (itemListContainer && totalPriceContainer) {
            let html = cart.map(item => {
                const itemTotal = item.price * (item.quantity || 1);
                return `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <span>${item.quantity || 1}x ${item.name} (${item.variant || 'Standard'})</span>
                            <span>CHF ${itemTotal.toFixed(2)}</span>
                        </div>`;
            }).join('');

            html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span>Versandkosten</span>
                        <span>CHF ${data.shipping.toFixed(2)}</span>
                    </div>`;

            if (data.discount > 0) {
                html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #16a34a; font-weight: 600;">
                            <span>Rabatt (${data.appliedCode})</span>
                            <span>- CHF ${data.discount.toFixed(2)}</span>
                        </div>`;
            }

            itemListContainer.innerHTML = html;
            totalPriceContainer.innerText = `CHF ${data.total.toFixed(2)}`;
        }

        if (promoMsgContainer) {
            if (data.appliedCode) {
                promoMsgContainer.style.color = '#16a34a';
                promoMsgContainer.innerText = `Aktionscode "${data.appliedCode}" wurde angewendet!`;
            } else {
                promoMsgContainer.innerText = '';
            }
        }

        const paymentElementDiv = document.getElementById('payment-element');
        const paymentSectionHeading = paymentElementDiv ? paymentElementDiv.previousElementSibling : null;

        if (data.freeOrder) {
            if (paymentElementDiv) {
                paymentElementDiv.innerHTML = '<div style="background: rgba(22, 163, 74, 0.1); border: 1px solid #16a34a; padding: 12px; border-radius: 8px; color: #16a34a; font-weight: 600; text-align: center;">Dein Gutschein deckt den gesamten Betrag ab! Keine Zahlung erforderlich.</div>';
            }
            if (paymentSectionHeading) paymentSectionHeading.style.display = 'none';

            const submitBtn = document.getElementById('submit-btn');
            if (submitBtn) {
                submitBtn.innerText = 'Kostenlos bestellen';
            }

            form.onsubmit = async (e) => {
                e.preventDefault();
                const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value;
                if (!turnstileToken) {
                    showAlert('Bitte bestätige, dass du kein Bot bist.', 'Fehler');
                    return;
                }

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerText = 'Wird verarbeitet...';
                }

                try {
                    const freeRes = await fetch('/api/checkout', {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({
                            action: 'confirm_free_order',
                            usedGiftCard: data.usedGiftCard,
                            rabattWert: data.discount,
                            items: formattedCart,
                            shippingAddress: {
                                name: document.getElementById('name')?.value || '',
                                email: document.getElementById('email')?.value || '',
                                street: document.getElementById('street')?.value || '',
                                zip: document.getElementById('zip')?.value || '',
                                city: document.getElementById('city')?.value || '',
                                shipping_note: document.getElementById('shipping-note')?.value || ''
                            }
                        })
                    });
                    const freeData = await freeRes.json();
                    if (freeData.success) {
                        localStorage.removeItem('cart');
                        localStorage.removeItem('fabio3d_cart');
                        window.location.href = `/success?free_order_id=${freeData.orderId}`;
                    } else {
                        alert(freeData.error || 'Fehler beim Bestellen.');
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = 'Kostenlos bestellen'; }
                    }
                } catch (err) {
                    console.error(err);
                    alert('Verbindungsfehler.');
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = 'Kostenlos bestellen'; }
                }
            };
            return;
        }

        if (paymentElementDiv) {
            paymentElementDiv.innerHTML = ''; 
        }

        const stripe = Stripe('pk_test_51Tt9xjHRWCYHtDl0BltylAKQKcSZtBqXnkdvoRPHxrWK89UNPaM8dAvbDps7eE7kYkaj2T8yCJEHVpVjoNk6PO9w00CgUpqhlO');
        const isDark = localStorage.getItem('theme') === 'dark';
        const elements = stripe.elements({
            clientSecret: data.clientSecret,
            appearance: {
                theme: isDark ? 'night' : 'stripe',
                variables: { colorPrimary: '#d40202', borderRadius: '8px' }
            }
        });

        const paymentElement = elements.create('payment');
        paymentElement.mount('#payment-element');

        form.onsubmit = async (e) => {
            e.preventDefault();

            const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value;
            if (!turnstileToken) {
                showAlert('Bitte bestätige, dass du kein Bot bist.', 'Fehler');
                return;
            }

            const emailInput = document.getElementById('email');
            const nameInput = document.getElementById('name');
            const streetInput = document.getElementById('street');
            const zipInput = document.getElementById('zip');
            const cityInput = document.getElementById('city');
            const shippingNoteInput = document.getElementById('shipping-note');
            const submitBtn = document.getElementById('submit-btn');

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Wird verarbeitet...';
            }

            const paymentIntentId = data.clientSecret ? data.clientSecret.split('_secret_')[0] : null;

            if (paymentIntentId) {
                try {
                    await fetch('/api/checkout', {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({
                            action: 'update_metadata',
                            paymentIntentId: paymentIntentId,
                            shippingAddress: {
                                name: nameInput ? nameInput.value : '',
                                email: emailInput ? emailInput.value : '',
                                street: streetInput ? streetInput.value : '',
                                zip: zipInput ? zipInput.value : '',
                                city: cityInput ? cityInput.value : '',
                                shipping_note: shippingNoteInput ? shippingNoteInput.value : ''
                            }
                        })
                    });
                } catch (err) {
                    console.error("Fehler beim Aktualisieren der Metadaten:", err);
                }
            }

            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.origin + '/success',
                    receipt_email: emailInput ? emailInput.value : undefined,
                    shipping: {
                        name: nameInput ? nameInput.value : 'Kunde',
                        address: {
                            line1: streetInput ? streetInput.value : '',
                            postal_code: zipInput ? zipInput.value : '',
                            city: cityInput ? cityInput.value : '',
                            country: 'CH'
                        }
                    }
                },
                redirect: 'if_required'
            });

            if (error) {
                alert(error.message);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Zahlen';
                }
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                localStorage.removeItem('cart');
                localStorage.removeItem('fabio3d_cart');
                window.location.href = `/success?payment_intent=${paymentIntent.id}`;
            }
        };
    } catch (error) {
        console.error("Fehler beim Laden des Checkouts:", error);
        alert("Beim Laden des Zahlungsformulars ist ein Fehler aufgetreten.");
    }
    initSwissZipAutocomplete();
}

function initSwissZipAutocomplete() {
    const zipInput = document.getElementById('zip');
    const cityInput = document.getElementById('city');

    if (!zipInput || !cityInput) return;
    if (zipInput.dataset.autocompleteInitialized === 'true') return;
    zipInput.dataset.autocompleteInitialized = 'true';

    zipInput.addEventListener('input', async (e) => {
        const zip = e.target.value.trim();

        if (/^[1-9][0-9]{3}$/.test(zip)) {
            try {
                const response = await fetch(`https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&searchText=${zip}&entryLocations=zipcode`);
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    const label = data.results[0].attrs.label;
                    const cleanCity = label.replace(/<[^>]*>?/gm, '').replace(/^[0-9]{4}\s*/, '');
                    cityInput.value = cleanCity;
                }
            } catch (err) {
                console.error("Fehler beim Abrufen der Swisstopo PLZ:", err);
            }
        }
    });
}

function applyPromoCode() {
    const input = document.getElementById('promo-code-input');
    if (input && input.value.trim() !== '') {
        initCheckoutPage(input.value.trim());
    }
}

window.applyPromoCode = applyPromoCode;

function removeFromCart(index) {
    cart.splice(index, 1); 
    saveCartToStorage();
    updateCartUI();
}

function addProductFromCard(buttonElement) {
    try {
        const box = buttonElement.closest('.product-card') || buttonElement.closest('.product-card-detail-view') || document.body; 

        const titleElement = box.querySelector('h1') || box.querySelector('h3');
        if (!titleElement) throw new Error("Produkt-Titel wurde im HTML nicht gefunden!");
        
        const titelText = titleElement.innerText;
        const titel = titelText.split('\n')[0].trim();

        const priceElement = box.querySelector('.price');
        if (!priceElement) throw new Error("Preis-Element (.price) wurde im HTML nicht gefunden!");
        
        let preisText = priceElement.innerText;
        preisText = preisText.replace(/[^0-9.,]/g, ''); 
        const preis = parseFloat(preisText.replace(',', '.'));

        const activeVariantBtn = box.querySelector('.variant-btn.active');
        const variante = activeVariantBtn ? activeVariantBtn.innerText.trim() : 'Standard';    
        const id = activeVariantBtn ? activeVariantBtn.getAttribute('data-id') : buttonElement.getAttribute('data-id');
        const maxStock = parseInt(buttonElement.getAttribute('data-max-stock') || "0");

        if (isNaN(preis)) {
            throw new Error("Der ausgelesene Preis ist keine gültige Zahl!");
        }

        addToCart(id, titel, preis, variante, maxStock);
    } catch (error) {
        console.error("Fehler beim Hinzufügen:", error);
        alert("Ups! Das Produkt konnte nicht hinzugefügt werden: " + error.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
});

document.addEventListener('change', (event) => {
    if (event.target && event.target.id === 'legal-checkbox') {
        const checkoutButton = document.getElementById('checkout-button');
        if (checkoutButton) {
            checkoutButton.disabled = !(event.target.checked && cart.length > 0);
        }
    }
});

window.decreaseQuantity = function(productId) {
    const itemIndex = cart.findIndex(item => item.id === productId);

    if (itemIndex !== -1) {
        if (cart[itemIndex].quantity > 1) {
            cart[itemIndex].quantity -= 1;
        } else {
            cart.splice(itemIndex, 1);
        }

        saveCartToStorage();
        updateCartUI();
    }
};

window.increaseQuantity = function(productId) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    const itemId = (item.id || '').toLowerCase();
    const itemName = (item.name || '').toLowerCase();
    const isGiftCard = itemId.includes('gift') || itemId.includes('gutschein') || itemName.includes('gutschein');

    if (isGiftCard) {
        let currentTotalGiftCards = 0;
        cart.forEach(cartItem => {
            const cId = (cartItem.id || '').toLowerCase();
            const cName = (cartItem.name || '').toLowerCase();
            if (cId.includes('gift') || cId.includes('gutschein') || cName.includes('gutschein')) {
                currentTotalGiftCards += (cartItem.quantity || 1);
            }
        });

        if (currentTotalGiftCards >= 5) {
            alert("Du darfst nur 5 Geschenkkarten aufs mal bestellen.");
            return;
        }
    } else {
        if (item.maxStock !== undefined && item.maxStock > 0 && item.quantity >= item.maxStock) {
            alert(`Es sind nur noch ${item.maxStock} Stück von dieser Variante auf Lager.`);
            return;
        }
    }

    item.quantity = (item.quantity || 1) + 1;
    saveCartToStorage();
    updateCartUI();
};

window.initCheckoutPage = initCheckoutPage;
window.addProductFromCard = addProductFromCard;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.addToCart = addToCart;
window.checkout = checkout;