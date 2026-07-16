const sleep = ms => new Promise(res => setTimeout(res, ms));

document.addEventListener('DOMContentLoaded', () => {
    const variantButtons = document.querySelectorAll('.variant-btn');

    variantButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();

            const card = button.closest('.product-card, .product-card-detail-view');
            if (!card) return;

            card.querySelectorAll('.variant-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const selectedVariant = button.innerText.trim();
            if (typeof currentProduct !== 'undefined') {
                currentProduct.variant = selectedVariant;
            }

            const variantDisplay = card.querySelector('.selected-variant-display');
            if (variantDisplay) {
                variantDisplay.innerText = selectedVariant;
            }

            updatePrice(button);
            const gewaehlteId = button.getAttribute('data-id') || button.dataset.id;
            const buyButton = card.querySelector('.btn-buy');
            if (buyButton) {
                buyButton.setAttribute('data-id', gewaehlteId);
                buyButton.dataset.id = gewaehlteId;
            }
            const imgElement = card.querySelector('.product-img');
            const variantImages = button.getAttribute('data-variant-images');

            if (variantImages && imgElement) {
                imgElement.setAttribute('data-images', variantImages);
                imgElement.setAttribute('data-index', '0');
                imgElement.classList.add('fade-out');
                
                setTimeout(() => {
                    imgElement.src = variantImages.split(',')[0].trim();
                    imgElement.classList.remove('fade-out');
                }, 150);
            }
            updateMainButtonStock(card);
            console.log("Variante gewechselt zu:", selectedVariant, "ID:", gewaehlteId);
        });
    });
    fetchAllStocks();
});

async function fetchAllStocks() {
    const variantButtons = document.querySelectorAll('.variant-btn');
    
    for (let btn of variantButtons) {
        const productId = btn.getAttribute('data-id');
        if (!productId) continue;
        
        try {
            const response = await fetch(`/api/get-stock?id=${productId}&t=${Date.now()}`);
            const data = await response.json();
            btn.setAttribute('data-stock', data.stock);
            if (data.stock <= 0) {
                btn.style.opacity = '0.4';
                btn.style.textDecoration = 'line-through';
            } else {
                btn.style.opacity = '1';
                btn.style.textDecoration = 'none';
            }
        } catch (err) {
            console.error("Fehler beim Bestandsabruf für", productId, err);
        }
        await sleep(100);
    }
    document.querySelectorAll('.product-card, .product-card-detail-view').forEach(card => {
        updateMainButtonStock(card);
    });
}

function updateMainButtonStock(container) {
    const activeVariantBtn = container.querySelector('.variant-btn.active');
    const cartButton = container.querySelector('.btn-buy');
    
    if (!activeVariantBtn || !cartButton) return;
    
    const aktuellerBestand = parseInt(activeVariantBtn.getAttribute('data-stock') || "0");
    
    if (aktuellerBestand <= 0) {
        cartButton.disabled = true;
        cartButton.innerText = "Ausverkauft";
        cartButton.removeAttribute('data-max-stock');
    } else {
        cartButton.disabled = false;
        cartButton.innerText = "In den Warenkorb";
        cartButton.setAttribute('data-max-stock', aktuellerBestand);
    }
}

function updatePrice(button) {
    const card = button.closest('.product-card, .product-card-detail-view');
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

window.updatePrice = updatePrice;

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
window.addEventListener('pageshow', () => {
    fetchAllStocks();
});
