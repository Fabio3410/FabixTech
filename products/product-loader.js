function initProductLoader() {
    const container = document.getElementById('product-container');
    const pageTitle = document.getElementById('page-title');

    if (!container) return;

    if (typeof products === 'undefined') {
        container.innerHTML = "<p style='text-align:center; padding: 50px; color: #ef4444; font-weight: 600;'>Produktdaten konnten nicht geladen werden.</p>";
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        container.innerHTML = "<p style='text-align:center; padding: 50px; color: #64748b;'>Keine Produkt-ID angegeben.</p>";
        return;
    }

    const product = products.find(p => p.id === productId);

    if (!product) {
        container.innerHTML = `<p style='text-align:center; padding: 50px; color: #64748b;'>Produkt "${productId}" wurde nicht gefunden.</p>`;
        return;
    }

    if (pageTitle) {
        pageTitle.innerText = `${product.title} - Fabio3D`;
    }

    let variantsHTML = '';
    if (product.variants && product.variants.length > 0) {
        variantsHTML = `
            <div class="variants-section">
                <h4 class="section-subtitle">Variante auswählen</h4>
                <div class="color-slider-container">
                    <button type="button" class="nav-arrow left" onclick="scrollSlider(this, -1)">&#10094;</button>
                    <div class="color-slider-track">
                        ${product.variants.map((v, index) => `
                            <button class="variant-btn ${index === 0 ? 'active' : ''}" 
                                    data-variant-images="${(v.images || []).join(', ')}" 
                                    data-id="${v.id}"
                                    data-title="${v.name}"
                                    data-price="${v.price || product.price}"
                                    data-stock="${v.maxStock !== undefined ? v.maxStock : 10}"
                                    data-max-stock="${v.maxStock !== undefined ? v.maxStock : 10}"
                                    onclick="selectVariant(this, ${index})">
                                ${v.name}
                            </button>
                        `).join('')}
                    </div>
                    <button type="button" class="nav-arrow right" onclick="scrollSlider(this, 1)">&#10095;</button>
                </div>
            </div>
        `;
    }

    const defaultVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    const firstVariantId = defaultVariant ? defaultVariant.id : product.id;
    const firstMaxStock = defaultVariant ? (defaultVariant.maxStock !== undefined ? defaultVariant.maxStock : 10) : 10;
    const initialPrice = defaultVariant && defaultVariant.price ? defaultVariant.price : product.price;
    const initialImages = (defaultVariant && defaultVariant.images && defaultVariant.images.length > 0) ? defaultVariant.images : product.images;

    container.innerHTML = `
        <div class="product-gallery">
            <div class="slider-container">
                <div class="slides">
                    <img class="product-img" 
                         id="main-product-img"
                         src="${initialImages[0]}" 
                         data-images="${initialImages.join(', ')}" 
                         data-index="0" 
                         alt="${product.title}">
                </div>
                <button class="arrow prev" id="slides-arrow" onclick="changeSlide(-1)">&#10094;</button>
                <button class="arrow next" id="slides-arrow" onclick="changeSlide(1)">&#10095;</button>
            </div>

            <div class="tech-specs">
                <div class="spec-card">
                    <i class="fa-solid fa-cube"></i>
                    <div class="spec-info">
                        <span class="spec-label">Material</span>
                        <span class="spec-value">${product.specs?.material || 'PLA'}</span>
                    </div>
                </div>
                <div class="spec-card">
                    <i class="fa-solid fa-layer-group"></i>
                    <div class="spec-info">
                        <span class="spec-label">Schichthöhe</span>
                        <span class="spec-value">${product.specs?.quality || '0.20mm'}</span>
                    </div>
                </div>
                <div class="spec-card">
                    <i class="fa-solid fa-border-all"></i>
                    <div class="spec-info">
                        <span class="spec-label">Infill</span>
                        <span class="spec-value">${product.specs?.infill || '20% Gyroid'}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="product-info">
            <span class="product-category">${product.category}</span>
            <h1 class="product-title">${product.title}</h1>

            <div class="product-description">
                <p>${product.description}</p>
            </div>

            ${variantsHTML}

            <div class="price-section">
                <div class="price-block">
                    <span class="currency">CHF</span>
                    <span class="price">${initialPrice}</span>
                </div>
                <button class="btn-buy" 
                        data-id="${firstVariantId}" 
                        data-price="${initialPrice}"
                        data-stock="${firstMaxStock}"
                        data-max-stock="${firstMaxStock}" 
                        onclick="addProductFromCard(this)">
                    <i class="fa-solid fa-cart-shopping"></i> In den Warenkorb
                </button>
            </div>
        </div>
    `;

    if (typeof fetchAllStocks === 'function') {
        fetchAllStocks();
    }
}

function selectVariant(buttonElement, slideIndex) {
    if (!buttonElement) return;

    const track = buttonElement.closest('.color-slider-track') || buttonElement.parentElement;
    if (track) {
        track.querySelectorAll('.variant-btn').forEach(btn => btn.classList.remove('active'));
    }
    buttonElement.classList.add('active');

    const productInfo = buttonElement.closest('.product-info') || document;
    const priceElement = productInfo.querySelector('.price');
    const buyButton = productInfo.querySelector('.btn-buy');

    const newPrice = buttonElement.getAttribute('data-price');
    const newId = buttonElement.getAttribute('data-id');
    const newStock = buttonElement.getAttribute('data-stock') || buttonElement.getAttribute('data-max-stock');

    if (priceElement && newPrice) {
        priceElement.innerText = newPrice;
    }

    if (buyButton) {
        if (newId) buyButton.setAttribute('data-id', newId);
        if (newPrice) buyButton.setAttribute('data-price', newPrice);
        if (newStock !== null && newStock !== undefined) {
            buyButton.setAttribute('data-stock', newStock);
            buyButton.setAttribute('data-max-stock', newStock);
        }
    }

    const variantImagesStr = buttonElement.getAttribute('data-variant-images');
    if (variantImagesStr) {
        const imgList = variantImagesStr.split(',').map(s => s.trim()).filter(Boolean);
        const mainImg = document.getElementById('main-product-img');
        if (mainImg && imgList.length > 0) {
            mainImg.src = imgList[0];
            mainImg.setAttribute('data-images', imgList.join(', '));
            mainImg.setAttribute('data-index', '0');
        }
    } else if (typeof jumpToSlide === 'function' && slideIndex !== undefined) {
        jumpToSlide(buttonElement, slideIndex);
    }

    const productCard = buttonElement.closest('.product-details') || document.body;
    if (typeof updateMainButtonStock === 'function') {
        updateMainButtonStock(productCard);
    }
}

function changeSlide(direction) {
    const mainImg = document.getElementById('main-product-img');
    if (!mainImg) return;

    const imagesStr = mainImg.getAttribute('data-images');
    if (!imagesStr) return;

    const images = imagesStr.split(',').map(s => s.trim()).filter(Boolean);
    if (images.length <= 1) return;

    let currentIndex = parseInt(mainImg.getAttribute('data-index') || '0', 10);
    currentIndex = (currentIndex + direction + images.length) % images.length;

    mainImg.src = images[currentIndex];
    mainImg.setAttribute('data-index', currentIndex.toString());
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductLoader);
} else {
    initProductLoader();
}
