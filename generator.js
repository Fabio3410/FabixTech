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
            filterContainer.innerHTML = categories.map(cat => `
                <button class="category-filter-btn ${cat === 'Alle' ? 'active' : ''}" 
                        onclick="filterProducts('${cat}')" 
                        style="background: ${cat === 'Alle' ? 'var(--light-color)' : 'var(--bg-card)'}; color: ${cat === 'Alle' ? '#ffffff' : 'var(--text-main)'}; border: 1.2px solid var(--border-color); padding: 8px 18px; border-radius: 20px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s;">
                    ${cat}
                </button>
            `).join('');
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
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
        if (btn.textContent.trim() === category) {
            btn.style.background = 'var(--light-color)';
            btn.style.color = '#ffffff';
            btn.style.borderColor = 'var(--light-color)';
        } else {
            btn.style.background = 'var(--bg-card)';
            btn.style.color = 'var(--text-main)';
            btn.style.borderColor = 'var(--border-color)';
        }
    });

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
    
    if (aktuellerBestand <= 0) {
        cartButton.disabled = true;
        cartButton.innerText = "Ausverkauft";
        cartButton.removeAttribute('data-max-stock');
        if (alertBox) alertBox.style.display = 'block';
    } else {
        cartButton.disabled = false;
        cartButton.innerText = "In den Warenkorb";
        cartButton.setAttribute('data-max-stock', aktuellerBestand);
        if (alertBox) alertBox.style.display = 'none';
    }
}

async function subscribeStockAlert() {
    const emailInput = document.getElementById('stock-alert-email');
    const msgDiv = document.getElementById('stock-alert-msg');
    const activeBtn = document.querySelector('.variant-btn.active');

    if (!activeBtn) return;
    const variantId = activeBtn.getAttribute('data-id');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email || !email.includes('@') || !email.includes('.')) {
        if (msgDiv) {
            msgDiv.style.color = '#d40202';
            msgDiv.innerText = 'Bitte gib eine gültige E-Mail-Adresse ein.';
        }
        return;
    }

    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'subscribe_stock', variantId, email })
        });

        const data = await res.json();
        if (res.ok) {
            if (msgDiv) {
                msgDiv.style.color = '#16a34a';
                msgDiv.innerText = 'Erfolgreich eingetragen! Du erhältst eine Mail, sobald der Artikel wieder da ist.';
            }
            if (emailInput) emailInput.value = '';
        } else {
            if (msgDiv) {
                msgDiv.style.color = '#d40202';
                msgDiv.innerText = data.error || 'Fehler beim Anmelden.';
            }
        }
    } catch (e) {
        if (msgDiv) {
            msgDiv.style.color = '#d40202';
            msgDiv.innerText = 'Verbindungsfehler zum Server.';
        }
    }
}

document.addEventListener('DOMContentLoaded', renderShop);