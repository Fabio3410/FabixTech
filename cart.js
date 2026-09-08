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

    if (bestehenderArtikel) {
        if (stockLimit > 0) bestehenderArtikel.maxStock = stockLimit;

        if (bestehenderArtikel.maxStock && bestehenderArtikel.quantity >= bestehenderArtikel.maxStock) {
            alert(`Es sind nur noch ${bestehenderArtikel.maxStock} Stück von dieser Variante auf Lager.`);
            return;
        }
        bestehenderArtikel.quantity = (bestehenderArtikel.quantity || 1) + 1;
    } else {
        if (stockLimit <= 0) {
            alert("Dieses Produkt ist aktuell ausverkauft.");
            return;
        }
        cart.push({ 
            id, 
            name, 
            price, 
            variant: selectedVariant, 
            quantity: 1, 
            maxStock: stockLimit 
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
    const versandKosten = 5.90;
    
    cart.forEach(item => {
        anzahlGesamt += (item.quantity || 1);
    });

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
                    <span style="font-weight: 500; color: #333333; font-size: 15px;">${item.name || 'Unbekanntes Produkt'}</span>
                    <span style="font-size: 12px; color: #777777; margin-top: 2px;">
                        Variante: ${item.variant || 'Standard'} 
                        <span style="color: #d40202; font-weight: bold; margin-left: 6px;">(x${menge})</span>
                    </span>
                </div>
                <div>
                    <strong style="margin-right: 12px; white-space: nowrap; align-self: center;">CHF ${zeilenTotal.toFixed(2)}</strong><br>
                    <span>
                        <button class="btn-decrease" onclick="decreaseQuantity('${item.id}')" style="background: none; border: none; color: #A9A9A9; font-size: 25px; cursor: pointer;">-</button>
                        <button class="btn-increase" onclick="increaseQuantity('${item.id}')" style="background: none; border: none; color: #A9A9A9; font-size: 25px; cursor: pointer;">+</button>
                    </span>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${index})" style="align-self: center;">
                    <span class="trash-icon">&#x1F5D1;</span>
                </button>
                <style>
                    .trash-icon {
                        font-family: "Segoe UI Symbol", "Apple Color Emoji", Arial, sans-serif;
                        line-height: 1;
                    }
                </style>
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

function checkout() {
    if (cart.length === 0) {
        alert("Dein Warenkorb ist leer!");
        return;
    }

    const legalCheckbox = document.getElementById('legal-checkbox');
    if (legalCheckbox && !legalCheckbox.checked) {
        alert("Bitte akzeptiere erst die AGB und Datenschutzerklärung.");
        return;
    }
    window.location.href = '/checkout';
}

async function initCheckoutPage() {
    const container = document.getElementById('checkout-container');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<p>Dein Warenkorb ist leer. <a href="/">Zurück zum Shop</a></p>';
        return;
    }

    const formattedCart = cart.map(item => ({
        id: item.id, 
        name: item.name,
        price: Math.round(item.price * 100),
        quantity: item.quantity || 1,
        farbe: item.variant || 'Standard'
    }));

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart: formattedCart }),
        });

        const data = await response.json();

        if (data.error) {
            container.innerHTML = `<p style="color:red;">Fehler: ${data.error}</p>`;
            return;
        }

        const stripe = Stripe('pk_test_51Tt9xjHRWCYHtDl0BltylAKQKcSZtBqXnkdvoRPHxrWK89UNPaM8dAvbDps7eE7kYkaj2T8yCJEHVpVjoNk6PO9w00CgUpqhlO');

        const checkoutSession = await stripe.initEmbeddedCheckout({
            clientSecret: data.clientSecret,
        });

        container.innerHTML = '';
        checkoutSession.mount('#checkout-container');

    } catch (error) {
        console.error("Fehler beim Laden der Kasse:", error);
        container.innerHTML = '<p style="color:red;">Netzwerkfehler beim Laden der Zahlung.</p>';
    }
}

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

    if (item) {
        if (item.maxStock !== undefined && item.maxStock > 0 && item.quantity >= item.maxStock) {
            alert(`Es sind nur noch ${item.maxStock} Stück von dieser Variante auf Lager.`);
            return;
        }

        item.quantity = (item.quantity || 1) + 1;
        saveCartToStorage();
        updateCartUI();
    }
};

window.initCheckoutPage = initCheckoutPage;
window.addProductFromCard = addProductFromCard;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.addToCart = addToCart;
window.checkout = checkout;