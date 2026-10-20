let allProductsCache = [];
let allSectionsCache = [];

async function renderShop() {
    const container = document.getElementById('dynamic-sections-container');
    if (!container) return;
    
    try {
        const [resProducts, resSections] = await Promise.all([
            fetch('/api/products'),
            fetch('/api/sections')
        ]);

        const productsDB = await resProducts.json();
        const sectionsDB = resSections.ok ? await resSections.json() : [];

        if (!productsDB || productsDB.length === 0) {
            container.innerHTML = "<p style='text-align:center;'>Keine Produkte vorhanden.</p>";
            return;
        }

        allProductsCache = productsDB;
        allSectionsCache = sectionsDB;

        renderCategoryFilter(productsDB);
        renderDynamicSections('Alle', productsDB);

    } catch (err) {
        console.error("Fehler beim Laden des Shops:", err);
    }
}

function renderCategoryFilter(allProducts) {
    const categories = ['Alle', ...new Set(allProducts.map(p => p.category).filter(Boolean))];
    const filterContainer = document.getElementById('category-filter-container');
    
    if (filterContainer) {
        filterContainer.style.display = 'flex';
        filterContainer.innerHTML = `
            <div style="position: relative; display: inline-block; width: 240px;">
                <i class="fa-solid fa-filter" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; font-size: 13px;"></i>
                <select id="category-select" onchange="filterSectionsByCategory(this.value)" style="width: 100%; padding: 10px 36px 10px 38px; border-radius: 10px; border: 1.2px solid var(--border-color); background: var(--bg-card); color: var(--text-main); font-size: 14px; font-weight: 500; appearance: none; cursor: pointer; outline: none; box-shadow: var(--shadow-sm); transition: border-color 0.2s;">
                    ${categories.map(cat => `<option value="${cat}" style="background: var(--bg-card); color: var(--text-main);">${cat === 'Alle' ? 'Alle Kategorien' : cat}</option>`).join('')}
                </select>
                <i class="fa-solid fa-chevron-down" style="position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; font-size: 11px;"></i>
            </div>
        `;
    }
}

function filterSectionsByCategory(category) {
    const targetProducts = category === 'Alle' ? allProductsCache : allProductsCache.filter(p => p.category === category);
    renderDynamicSections(category, targetProducts);
}

function renderDynamicSections(selectedCategory, allProducts) {
    let container = document.getElementById('dynamic-sections-container');
    if (!container) return;

    let sectionsHtml = '';

    if (allSectionsCache && allSectionsCache.length > 0) {
        allSectionsCache.forEach(sec => {
            let secProducts = allProducts.filter(p => sec.productIds && sec.productIds.includes(p.baseId));
            
            if (selectedCategory !== 'Alle') {
                secProducts = secProducts.filter(p => p.category === selectedCategory);
            }

            if (secProducts.length > 0) {
                sectionsHtml += `
                    <div class="shop-section-block" style="margin-bottom: 60px; width: 100%; max-width: 1200px; margin-left: auto; margin-right: auto; padding: 0 20px;">
                        <div class="shop-header" style="text-align: left; margin-bottom: 24px;">
                            <h2 style="font-size: 40px; font-weight: 800; color: var(--text-main); letter-spacing: -0.5px; position: relative; padding-bottom: 8px; margin: 0;">
                                ${sec.title}
                                <span style="display: block; width: 45px; height: 3px; background: var(--primary, #d40202); margin-top: 8px; border-radius: 2px;"></span>
                            </h2>
                            ${sec.description ? `<p style="font-size: 15px; color: var(--text-muted); margin-top: 8px; margin-bottom: 0;">${sec.description}</p>` : ''}
                        </div>
                        <div class="product-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 360px)); gap: 24px; justify-content: start;">
                            ${renderProductCards(secProducts)}
                        </div>
                    </div>
                `;
            }
        });
    }

    if (sectionsHtml === '') {
        sectionsHtml = "<p style='text-align: center; width: 100%; color: var(--text-muted); padding: 30px 0;'>Keine Produkte in dieser Kategorie gefunden.</p>";
    }

    container.innerHTML = sectionsHtml;

    if (typeof initSliders === 'function') initSliders();
    if (typeof checkSliderArrows === 'function') checkSliderArrows();
    if (typeof fetchAllStocks === 'function') fetchAllStocks();
}

function renderProductCards(products) {
    return products.map(prod => {
        const allImages = [...new Set(prod.variants.flatMap(v => v.images))].join(', ');
        const defaultVariant = prod.variants[0] || { price: 0, images: [''] };
        
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
}

document.addEventListener('DOMContentLoaded', renderShop);