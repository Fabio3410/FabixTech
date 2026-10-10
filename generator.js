let allProductsCache = [];

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

        allProductsCache = productsDB;

        const categories = ['Alle', ...new Set(productsDB.map(p => p.category).filter(Boolean))];
        const filterContainer = document.getElementById('category-filter-container');
        
        if (filterContainer) {
            filterContainer.innerHTML = `
                <div style="position: relative; display: inline-block; width: 240px;">
                    <i class="fa-solid fa-filter" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; font-size: 13px;"></i>
                    <select id="category-select" onchange="filterProducts(this.value)" style="width: 100%; padding: 10px 36px 10px 38px; border-radius: 10px; border: 1.2px solid var(--border-color); background: var(--bg-card); color: var(--text-main); font-size: 14px; font-weight: 500; appearance: none; cursor: pointer; outline: none; box-shadow: var(--shadow-sm); transition: border-color 0.2s;">
                        ${categories.map(cat => `<option value="${cat}" style="background: var(--bg-card); color: var(--text-main);">${cat === 'Alle' ? 'Alle Kategorien' : cat}</option>`).join('')}
                    </select>
                    <i class="fa-solid fa-chevron-down" style="position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; font-size: 11px;"></i>
                </div>
            `;
        }

        displayProducts(productsDB);
    } catch (err) {
        console.error("Fehler beim Laden der Produkte:", err);
    }
}

function displayProducts(products) {
    const grid = document.querySelector('.product-grid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = "<p style='text-align: center; width: 100%; color: var(--text-muted);'>Keine Produkte in dieser Kategorie gefunden.</p>";
        return;
    }

    grid.innerHTML = products.map(prod => {
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
        <div class="product-card" data-category="${prod.category}">
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
}

function filterProducts(category) {
    if (category === 'Alle') {
        displayProducts(allProductsCache);
    } else {
        const filtered = allProductsCache.filter(p => p.category === category);
        displayProducts(filtered);
    }
}

function updateMainButtonStock(produktKarte) {
    const activeVariantBtn = produktKarte.querySelector('.variant-btn.active');
    const cartButton = produktKarte.querySelector('.btn-buy');
    const alertBox = produktKarte.querySelector('#stock-alert-box');
    
    if (!activeVariantBtn || !cartButton) return;
    const stockAttr = activeVariantBtn.getAttribute('data-stock') || activeVariantBtn.getAttribute('data-max-stock') || "0";
    const aktuellerBestand = parseInt(stockAttr);
    
    if (alertBox) {
        if (aktuellerBestand <= 0) {
            cartButton.disabled = true;
            cartButton.innerText = "Ausverkauft";
            cartButton.removeAttribute('data-max-stock');
            alertBox.classList.add('show');
        } else {
            cartButton.disabled = false;
            cartButton.innerText = "In den Warenkorb";
            cartButton.setAttribute('data-max-stock', aktuellerBestand);
            alertBox.classList.remove('show');
        }
    }
}

document.addEventListener('DOMContentLoaded', renderShop);