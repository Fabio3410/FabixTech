        function switchPage(pageId) {
            document.querySelectorAll('.nav-links .nav-link').forEach(link => {
                link.classList.remove('active');
            });
            document.querySelectorAll('.page-section').forEach(section => {
                section.classList.remove('active');
            });
                
            const activePage = document.getElementById(`${pageId}-page`);
            if (activePage) {
                activePage.classList.add('active');
            }

            const activeLink = Array.from(document.querySelectorAll('.nav-links .nav-link')).find(link => {
                return link.getAttribute('onclick').includes(`'${pageId}'`);
            });
            if (activeLink) {
                activeLink.classList.add('active');
            }
            window.scrollTo(0, 0);
        }

        let currentSlide = 0;
        function changeSlide(direction) {
                const slidesContainer = document.querySelector('.slides');
                const totalSlides = document.querySelectorAll('.slides img').length;
                currentSlide += direction;
                if (currentSlide >= totalSlides) {
                        currentSlide = 0;
                } 
                else if (currentSlide < 0) {
                        currentSlide = totalSlides - 1;
                }
                slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
        }
        function changeSlide(buttonElement, direction) {
                const container = buttonElement.closest('.slider-container');
                if (!container) return;
                if (!container.id) {
                        container.id = 'slider-' + Math.random().toString(36).substr(2, 9);
                }
                
        const sliderId = container.id;
        if (!sliderIndexes.has(sliderId)) {
        sliderIndexes.set(sliderId, 0);
        }
        let currentSlide = sliderIndexes.get(sliderId);
                const slidesContainer = container.querySelector('.slides');
                const totalSlides = container.querySelectorAll('.slides img').length;
                currentSlide += direction;
                if (currentSlide >= totalSlides) {
                        currentSlide = 0;
                } 
                else if (currentSlide < 0) {
                        currentSlide = totalSlides - 1;
                }
                sliderIndexes.set(sliderId, currentSlide);
                slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
        }

        

let cart = [];

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    sidebar.classList.toggle('open');
}

function addToCart(name, price) {
    cart.push({ name, price });
    updateCartUI();
    document.getElementById('cart-sidebar').classList.add('open');
}

function updateCartUI() {
    const countElement = document.getElementById('cart-count');
    const container = document.getElementById('cart-items-container');
    const totalElement = document.getElementById('cart-total');
    
    countElement.innerText = cart.length;
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-msg">Dein Warenkorb ist noch leer.</p>';
        totalElement.innerText = 'CHF 0,00';
        return;
    }
    
    container.innerHTML = '';
    let total = 0;
    
    cart.forEach((item) => {
        total += item.price;
        const itemRow = document.createElement('div');
        itemRow.classList.add('cart-item');
        itemRow.innerHTML = `<span>${item.name}</span><strong>CHF ${item.price.toFixed(2)}</strong>`;
        container.appendChild(itemRow);
    });
    
    totalElement.innerText = `CHF ${total.toFixed(2)}`;
}

// ==========================================
// HIER IST DEINE NEUE STRIPE CHECKOUT FUNKTION
// ==========================================
async function checkout() {
    if(cart.length === 0) {
        alert("Dein Warenkorb ist leer!");
        return;
    }
        
        const legalCheckbox = document.getElementById('legal-checkbox');
        if (legalCheckbox && !legalCheckbox.checked) {
                alert("Bitte akzeptiere die AGB und Datenschutzerklärung, um zu bestellen.");
                return;
        }

    // Optional: Bestellbutton holen, um Ladetext anzuzeigen (ID anpassen falls nötig)
    const checkoutButton = document.getElementById('btn btn-primary checkout-btn');
    if (checkoutButton) {
        checkoutButton.innerText = "Wird geladen...";
        checkoutButton.disabled = true;
    }

    // 2. Daten für Stripe vorbereiten (Umrechnung in Cent + Menge festlegen)
    // Da dein addToCart für jedes Produkt ein neues Element in die Liste packt,
    // setzen wir die "quantity" hier für jedes Element einfach fix auf 1.
    const formattedCart = cart.map(item => ({
        name: item.name,
        price: Math.round(item.price * 100), // Macht aus 25.50 CHF -> 2550 Cent
        quantity: 1 
    }));

    try {
        // 3. Verbindung zur Netlify Serverless Function herstellen
        const response = await fetch('/.netlify/functions/create-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cart: formattedCart }),
        });

        const data = await response.json();

        if (data.url) {
            // Warenkorb leeren und UI zurücksetzen
            cart = [];
            updateCartUI();
            
            // Weiterleitung zu Stripe
            window.location.href = data.url;
        } else {
            alert("Fehler beim Checkout: " + data.error);
            resetCheckoutButton(checkoutButton);
        }
    } catch (error) {
        alert("Netzwerkfehler beim Verbinden mit Stripe.");
        resetCheckoutButton(checkoutButton);
    }
}

// Hilfsfunktion, um den Button bei Fehlern wieder freizuschalten
function resetCheckoutButton(button) {
    if (button) {
        button.innerText = "Zur Kasse";
        button.disabled = false;
    }
}
// AB HIER BLEIBT ALLES EXAKT WIE BEI DIR:

window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.replace('#', '');
    if(['home', 'shop', 'about', 'contact', 'impressum'].includes(hash)) {
        switchPage(hash); // Hinweis: Stelle sicher, dass switchPage() in deinem Code existiert
    }
});

function handleFormSubmit(event) {
    event.preventDefault();

    function autoResize(element) {
        element.style.height = 'auto';
        element.style.height = element.scrollHeight + 'px';
    }
    const form = event.target;
    const data = new FormData(form);
    
    fetch('https://formspree.io/f/xkoekone', {
        method: 'POST',
        body: data,
        headers: {
            'Accept': 'application/json'
        }
    }).then(response => {
        if (response.ok) {
            alert('Danke! Deine Nachricht wurde gesendet.');
            form.reset();
        } else {
            alert('Es gab ein Problem beim Absenden. Bitte versuche es nochmal.');
        }
    }).catch(error => {
        alert('Fehler! Bitte überprüfe deine Internetverbindung!');
    });
}

function updatePrice(button) {
        const container = button.closest('.color-slider-container');
        const card = container.parentElement;
        
        const newPrice = button.getAttribute('data-price');
        if (!card || !newPrice) return;
        const priceElement = card.querySelector('.price');
        if (priceElement) {
                priceElement.textContent = newPrice.replace('.', ',');
        }
        const buyButton = card.querySelector('.btn-buy');
        if (buyButton) {
                const currentOnclick = buyButton.getAttribute('onclick');
                if (currentOnclick && currentOnclick.includes('addToCart')) {
                        const updatedOnclick = currentOnclick.replace(/([\d\.]+)\s*\)/, newPrice + ')');
                        buyButton.setAttribute('onclick', updatedOnclick);
                }
        }
}
