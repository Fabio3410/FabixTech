async function renderShop() {
    const grid = document.querySelector('.product-grid');
    if (!grid) return;
    
    try {
        const res = await fetch('/api/products');
        const productsDB = await res.json();

        if (!productsDB || productsDB.length === 0) {
            grid.innerHTML = "<p>Keine Produkte vorhanden.</p>";
            return;
        }

        grid.innerHTML = productsDB.map(prod => {
            const allImages = [...new Set(prod.variants.flatMap(v => v.images))].join(', ');
            const defaultVariant = prod.variants[0];
            
            const variantsHtml = prod.variants.map((v, index) => `
                <button class="variant-btn ${index === 0 ? 'active' : ''}" 
                        data-variant-images="${v.images.join(', ')}" 
                        data-price="${v.price}" 
                        data-id="${v.id}" 
                        onclick="jumpToSlide(this, ${index}); updatePrice(this)">
                    ${v.name}
                </button>
            `).join('');

            return `
            <div class="product-card">
                <div class="slider-container">
                    <div class="slides">
                        <a href="product.html?id=${prod.baseId}" class="product-img-link">
                            <img class="product-img" src="${defaultVariant.images[0]}" data-images="${allImages}" data-index="0" alt="${prod.title}">
                        </a>
                    </div>
                    <button class="arrow prev">&#10094;</button>
                    <button class="arrow next">&#10095;</button>
                </div>
                <div class="product-info">
                    <span class="prod-category">${prod.category}</span>
                    <h3><a href="product.html?id=${prod.baseId}" class="product-link">${prod.title}</a><br><div class="docs"><a href="${prod.link}">by ${prod.creator}</a></div></h3>
                    <div class="docs"><a href="product.html?id=${prod.baseId}">Mehr Details &#8594;</a></div>
                    <br>
                    <h4><strong>Varianten</strong></h4>
                    <div class="color-slider-container ${prod.variants.length <= 1 ? 'hide' : ''}">
                        <button type="button" class="nav-arrow left" onclick="scrollSlider(this, -1)">&#10094;</button>
                        <button type="button" class="nav-arrow right" onclick="scrollSlider(this, 1)">&#10095;</button>
                        <div class="color-slider-track">
                            ${variantsHtml}
                        </div>
                    </div>
                    <div class="product-footer">
                        <span class="currency">CHF </span><span class="price">${defaultVariant.price.toFixed(2).replace('.', ',')}</span>
                        <button class="btn-buy" data-id="${defaultVariant.id}" onclick="addProductFromCard(this)">In den Warenkorb</button>
                    </div>
                </div>
            </div>`;
        }).join('');
        
        if (typeof initSliders === 'function') initSliders();
        if (typeof checkSliderArrows === 'function') checkSliderArrows();
        if (typeof fetchAllStocks === 'function') fetchAllStocks();
    } catch (err) {
        console.error("Fehler beim Laden der Produkte:", err);
    }
}

document.addEventListener('DOMContentLoaded', renderShop);

document.addEventListener('DOMContentLoaded', renderShop);