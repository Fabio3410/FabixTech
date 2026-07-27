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

    if (bestehenderArtikel) {
        if (bestehenderArtikel.quantity >= maxStock) {
            alert(`Es sind nur noch ${maxStock} Stück von dieser Variante auf Lager.`);
            return;
        }
        bestehenderArtikel.quantity = (bestehenderArtikel.quantity || 1) + 1;
    } else {
        if (maxStock <= 0) {
            alert("Dieses Produkt ist aktuell ausverkauft.");
            return;
        }
        cart.push({ id, name, price, variant: selectedVariant, quantity: 1 });
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
    const totalElement = document.getElementById('cart-total');
    const checkoutButton = document.getElementById('checkout-button');
    const legalCheckbox = document.getElementById('legal-checkbox');
    const shippingElement = document.getElementById('cart-shipping');
    
    let total = 0;
    let anzahlGesamt = 0;
    const versandKosten = 5.70;
    
    cart.forEach(item => {
        anzahlGesamt += (item.quantity || 1);
    });

    if (countElement) {
        countElement.innerText = anzahlGesamt;
    }

    if (cart.length === 0) {
        if (container) container.innerHTML = '<p class="empty-msg">Dein Warenkorb ist noch leer.</p>';
        if (totalElement) totalElement.innerText = 'CHF 0.00';
        if (shippingElement) shippingElement.innerText = 'CHF 0.00';
        if (checkoutButton) checkoutButton.disabled = true;
        return;
    }

    if (container) {
        container.innerHTML = '';

        cart.forEach((item, index) => {
            const sichererPreis = Number(item.price) || 0;
            const menge = Number(item.quantity) || 1;
            const zeilenTotal = sichererPreis * menge;
            total += zeilenTotal;

            const itemRow = document.createElement('div');
            itemRow.classList.add('cart-item');

            itemRow.innerHTML = `
                <div style="display: flex; flex-direction: column; flex-grow: 1; text-align: left; margin-right: 10px;">
                    <span style="font-weight: 500; color: #333333; font-size: 15px;">${item.name || 'Unbekanntes Produkt'}</span>
                    <span style="font-size: 12px; color: #777777; margin-top: 2px;">
                        Variante: ${item.variant || 'Standard'} 
                        <span style="color: #2563eb; font-weight: bold; margin-left: 6px;">(x${menge})</span>
                    </span>
                </div>
                <strong style="margin-right: 12px; white-space: nowrap; align-self: center;">CHF ${zeilenTotal.toFixed(2)}</strong>
                <button class="remove-btn" onclick="removeFromCart(${index})" style="align-self: center;">&times;</button>
            `;
            container.appendChild(itemRow);
        });
    }

    if (shippingElement) {
        shippingElement.innerText = `CHF ${versandKosten.toFixed(2)}`;
    }

    if (totalElement) {
        totalElement.innerText = `CHF ${total.toFixed(2)}`;
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
        alert("Bitte akzeptiere erst die AGB und Datenschutzerklärung.");
        return;
    }
    
    const checkoutBtn = document.getElementById('checkout-button');
    if (checkoutBtn) {
        checkoutBtn.innerText = "Wird geladen...";
        checkoutBtn.disabled = true;
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

        if (data.url) {
            window.location.href = data.url;
        } else {
            alert("Fehler beim Checkout: " + data.error);
            if (checkoutBtn) {
                checkoutBtn.innerText = "Zur Kasse";
                checkoutBtn.disabled = false;
            }
        }
    } catch (error) {
        alert("Netzwerkfehler beim Verbinden mit Stripe.");
        if (checkoutBtn) {
            checkoutBtn.innerText = "Zur Kasse";
            checkoutBtn.disabled = false;
        }
    }
}

function removeFromCart(index) {
    cart.splice(index, 1); 
    saveCartToStorage();
    updateCartUI();
}

function addProductFromCard(buttonElement) {
    try {
        const box = buttonElement.closest('.product-card') || buttonElement.closest('.product-detail') || document.body; 

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

window.addProductFromCard = addProductFromCard;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.addToCart = addToCart;
window.checkout = checkout;
