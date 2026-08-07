function initProductLoader() {
    const container = document.getElementById('product-container');
    const pageTitle = document.getElementById('page-title');

    if (!container) {
        return;
    }

    if (typeof products === 'undefined') {
        container.innerHTML = "<p style='text-align:center; padding: 40px; color: red;'>Produktdaten konnten nicht geladen werden.</p>";
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (!productId) {
        container.innerHTML = "<p style='text-align:center; padding: 40px;'>Keine Produkt-ID angegeben.</p>";
        return;
    }

    const product = products.find(p => p.id === productId);

    if (!product) {
        container.innerHTML = `<p style='text-align:center; padding: 40px;'>Produkt "${productId}" nicht gefunden.</p>`;
        return;
    }

    if (pageTitle) {
        pageTitle.innerText = `${product.title} - Details`;
    }

    let variantsHTML = '';
    if (product.variants && product.variants.length > 0) {
        variantsHTML = `
            <div class="variants-section" style="margin-top: 25px;">
                <h4 style="margin-bottom: 10px;"><strong>Varianten</strong></h4>
                <div class="color-slider-container">
                    <button type="button" class="nav-arrow left" onclick="scrollSlider(this, -1)">&#10094;</button>
                    <button type="button" class="nav-arrow right" onclick="scrollSlider(this, 1)">&#10095;</button>
                    <div class="color-slider-track">
                        ${product.variants.map((v, index) => `
                            <button class="variant-btn ${index === 0 ? 'active' : ''}" 
                                    data-variant-images="${v.images.join(', ')}" 
                                    data-id="${v.id}"
                                    data-price="${v.price || product.price}"
                                    data-max-stock="${v.maxStock || 0}"
                                    onclick="jumpToSlide(this, ${index}); updatePriceFromVariant(this); if(typeof updateMainButtonStock === 'function') updateMainButtonStock(this.closest('.product-info'));">
                                ${v.name}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    const defaultVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    const firstVariantId = defaultVariant ? defaultVariant.id : product.id;
    const firstMaxStock = defaultVariant ? (defaultVariant.maxStock || 0) : 10;
    const initialPrice = defaultVariant && defaultVariant.price ? defaultVariant.price : product.price;

    container.innerHTML = `
        <div class="product-gallery">
            <div class="slider-container">
                <div class="slides">
                    <a href="#">
                        <img class="product-img" 
                             src="${product.images[0]}" 
                             data-images="${product.images.join(', ')}" 
                             data-index="0" 
                             alt="${product.title}">
                    </a>
                </div>
                <button class="arrow prev" id="slides-arrow">&#10094;</button>
                <button class="arrow next" id="slides-arrow">&#10095;</button>
            </div>
            <div class="tech-specs">
                <span class="spec"><b>Material:</b> ${product.specs ? product.specs.material : 'PLA'}</span>
                <span class="spec"><b>Qualität:</b> ${product.specs ? product.specs.quality : '0.20mm'}</span>
                <span class="spec"><b>Infill:</b> ${product.specs ? product.specs.infill : '20% Gyroid'}</span>
            </div>
        </div>

        <div class="product-info">
            <span class="product-category">${product.category}</span>
            <h1 class="product-title">${product.title}</h1>
            
            <div class="product-description">
                <p>${product.description}</p>
            </div>

            ${variantsHTML}

            <div class="price-section" style="margin-top: 30px;">
                <div class="price-block">
                    <span class="currency">CHF</span>
                    <span class="price">${initialPrice}</span>
                </div>
                <button class="btn-buy" 
                        data-id="${firstVariantId}" 
                        data-max-stock="${firstMaxStock}" 
                        onclick="addProductFromCard(this)">
                    In den Warenkorb
                </button>
            </div>
        </div>
    `;

    if (typeof fetchAllStocks === 'function') {
        fetchAllStocks();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductLoader);
} else {
    initProductLoader();
}

function updatePriceFromVariant(buttonElement) {
    const card = buttonElement.closest('.product-info');
    if (!card) return;

    const priceElement = card.querySelector('.price');
    const buyButton = card.querySelector('.btn-buy');

    const newPrice = buttonElement.getAttribute('data-price');
    const newId = buttonElement.getAttribute('data-id');
    const newStock = buttonElement.getAttribute('data-max-stock');

    if (priceElement && newPrice) priceElement.innerText = newPrice;
    if (buyButton) {
        if (newId) buyButton.setAttribute('data-id', newId);
        if (newStock) buyButton.setAttribute('data-max-stock', newStock);
    }
}
