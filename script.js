const sleep = ms => new Promise(res => setTimeout(res, ms));

document.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash;
    
    if (hash) {
        const pageId = hash.replace('#', '');
        if (typeof switchPage === 'function') {
            switchPage(pageId);
        }
    }
});

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
        const gewaehlteId = event.target.getAttribute('data-id');
        const produktKarte = event.target.closest('.product-card, .product-details');
        
        if (!produktKarte) return;
        const hauptButton = produktKarte.querySelector('.btn-buy');
        if (hauptButton) {
            hauptButton.setAttribute('data-id', gewaehlteId);
        }

        produktKarte.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
        updatePrice(event.target);
        
        const imgElement = produktKarte.querySelector('.product-img');
        const variantImages = event.target.getAttribute('data-variant-images');

        if (variantImages && imgElement) {
            imgElement.setAttribute('data-images', variantImages);
            imgElement.setAttribute('data-index', '0');
            imgElement.classList.add('fade-out');
            
            setTimeout(() => {
                imgElement.src = variantImages.split(',')[0].trim();
                imgElement.classList.remove('fade-out');
            }, 150);
        }
        updateMainButtonStock(produktKarte);
    });
});

function updatePrice(button) {
    const card = button.closest('.product-card');
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
    document.querySelectorAll('.product-card, .product-detail').forEach(container => {
        updateMainButtonStock(container);
    });
}

function updateMainButtonStock(produktKarte) {
    const activeVariantBtn = produktKarte.querySelector('.variant-btn.active');
    const cartButton = produktKarte.querySelector('.btn-buy');
    
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

window.addEventListener('pageshow', () => {
    fetchAllStocks();
});
