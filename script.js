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
        const produktKarte = event.target.closest('.product-card');
        
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

async function checkCardStock(produktKarte) {
    const activeVariantBtn = produktKarte.querySelector('.variant-btn.active');
    const cartButton = produktKarte.querySelector('.btn-buy');
    
    if (!activeVariantBtn || !cartButton) return;
    const productId = activeVariantBtn.getAttribute('data-id');
    if (!productId) return;
    
    try {
        const response = await fetch(`/api/get-stock?id=${productId}`);
        const data = await response.json();
        
        if (data.stock <= 0) {
            cartButton.disabled = true;
            cartButton.innerText = "Ausverkauft";
            cartButton.removeAttribute('data-max-stock');
        } else {
            cartButton.disabled = false;
            cartButton.innerText = "In den Warenkorb";
            cartButton.setAttribute('data-max-stock', data.stock);
        }
    } catch (err) {
        console.error("Fehler beim Abrufen des Bestands:", err);
    }
}

async function checkAllProductsStock() {
    const allCards = document.querySelectorAll('.product-card');
    for (let card of allCards) {
        await checkCardStock(card);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAllProductsStock();
    const variantButtons = document.querySelectorAll('.variant-btn');
    variantButtons.forEach(btn => {
        btn.addEventListener('click', (event) => {
            const produktKarte = event.target.closest('.product-card');
            if (produktKarte) {
                setTimeout(() => checkCardStock(produktKarte), 10);
            }
        });
    });
});
