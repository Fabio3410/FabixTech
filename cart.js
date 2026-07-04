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

function addToCart(name, price) {
    cart.push({ name, price });
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
    
    if (countElement) {
        countElement.innerText = cart.length;
    }
    
    if (cart.length === 0) {
        if (container) container.innerHTML = '<p class="empty-msg">Dein Warenkorb ist noch leer.</p>';
        if (totalElement) totalElement.innerText = 'CHF 0,00';
        if (checkoutButton) checkoutButton.disabled = true;
        return;
    }
    
    if (container) {
        container.innerHTML = '';
        let total = 0;
        
        cart.forEach((item) => {
            total += item.price;
            const itemRow = document.createElement('div');
            itemRow.classList.add('cart-item');
            itemRow.innerHTML = `<span>${item.name}</span><strong>CHF ${item.price.toFixed(2)}</strong>`;
            container.appendChild(itemRow);
        });
        
        if (totalElement) {
            totalElement.innerText = `CHF ${total.toFixed(2)}`;
        }
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

    const checkoutButton = document.getElementById('checkout-button');
    if (checkoutButton) {
        checkoutButton.innerText = "Wird geladen...";
        checkoutButton.disabled = true;
    }

    const formattedCart = cart.map(item => ({
        name: item.name,
        price: Math.round(item.price * 100),
        quantity: 1 
    }));

    try {
        const response = await fetch('/.netlify/functions/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart: formattedCart }),
        });

        const data = await response.json();

        if (data.url) {
            cart = [];
            saveCartToStorage();
            updateCartUI();
            window.location.href = data.url;
        } else {
            alert("Fehler beim Checkout: " + data.error);
            if (checkoutButton) {
                checkoutButton.innerText = "Zur Kasse";
                checkoutButton.disabled = false;
            }
        }
    } catch (error) {
        alert("Netzwerkfehler beim Verbinden mit Stripe.");
        if (checkoutButton) {
            checkoutButton.innerText = "Zur Kasse";
            checkoutButton.disabled = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
});

document.addEventListener('change', (event) => {
    if (event.target && event.target.id === 'legal-checkbox') {
        const checkoutButton = document.getElementById('checkout-button');
        if (checkoutButton) {
            checkoutButton.disabled = !event.target.checked;
        }
    }
});

window.toggleCart = toggleCart;
window.addToCart = addToCart;
window.checkout = checkout;
