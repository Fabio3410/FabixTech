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
        const onclickAttr = link.getAttribute('onclick');
        return onclickAttr && onclickAttr.includes(`'${pageId}'`);
    });
    if (activeLink) {
        activeLink.classList.add('active');
    }
    window.scrollTo(0, 0);
}

window.jumpToSlide = function(index) {
    console.log("jumpToSlide abgefangen für Index:", index);
};

document.querySelectorAll('.variant-btn').forEach(btn => {
    btn.addEventListener('click', (event) => {
        const gewaehlteId = event.target.dataset.id;
        const produktKarte = event.target.closest('.product-card');
        
        if (!produktKarte) return;

        const hauptButton = produktKarte.querySelector('.btn-buy');
        if (hauptButton) {
            hauptButton.dataset.id = gewaehlteId;
        }

        produktKarte.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');

        updatePrice(event.target);

        const imgElement = produktKarte.querySelector('.product-img');
        const variantImages = event.target.getAttribute('data-variant-images');

        if (variantImages && imgElement) {
            imgElement.setAttribute('data-images', variantImages);
            imgElement.setAttribute('data-index', '0'); // Reset auf das 1. Bild der Variante
            imgElement.classList.add('fade-out');
            
            setTimeout(() => {
                imgElement.src = variantImages.split(',')[0].trim();
                imgElement.classList.remove('fade-out');
            }, 150);
        }
    });
});

function updatePrice(button) {
    const card = button.closest('.product-card');
    const newPrice = button.getAttribute('data-price');
    
    if (!card || !newPrice) return;
    
    // Preis-Text im HTML austauschen
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

const checkoutBtn = document.getElementById('checkout-button');
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
        if (typeof meinWarenkorbIds === 'undefined') {
            console.error("Fehler: 'meinWarenkorbIds' ist nicht definiert.");
            return;
        }

        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartIds: meinWarenkorbIds }) 
        });
        
        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert('Fehler: ' + data.error);
        }
    });
}
