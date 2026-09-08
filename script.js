const stockPromise = fetch(`/api/get-all-stocks?t=${Date.now()}`)
    .then(res => res.ok ? res.json() : [])
    .catch(err => {
        console.error("Fehler beim Abrufen der Bestände:", err);
        return [];
    });

function getPageIdFromPath() {
    const path = window.location.pathname.replace(/^\//, '').trim();
    return (path === '' || path === 'home' || path === 'index.html') ? 'home' : path;
}

function switchPage(pageId, updateHistory = true) {
    if (!pageId) pageId = 'home';
    document.querySelectorAll('.page-section').forEach(section => section.classList.remove('active'));
    const activePage = document.getElementById(`${pageId}-page`);
    if (activePage) {
        activePage.classList.add('active');
    }
    document.querySelectorAll('.nav-link, .nav-links a').forEach(link => {
        link.classList.remove('active');
        const href = (link.getAttribute('href') || '').trim();
        const dataPage = link.getAttribute('data-page');
        const cleanHref = href.replace(/^[\/#]/, '').trim();
        const isHomeMatch = (pageId === 'home') && (
            href === '/' || href === '' || href === '#' || href === './' || 
            cleanHref === 'home' || cleanHref === 'index.html'
        );
        const isPageMatch = (dataPage === pageId) || (cleanHref === pageId);

        if (isHomeMatch || isPageMatch) {
            link.classList.add('active');
        }
    });
    if (updateHistory) {
        const newUrl = pageId === 'home' ? '/' : `/${pageId}`;
        if (window.location.pathname !== newUrl) {
            history.pushState({ pageId: pageId }, '', newUrl);
        }
    }

    window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-link, .nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href') || '';
            const dataPage = link.getAttribute('data-page');
            if (href.startsWith('http') || href.startsWith('https')) return;
            e.preventDefault();
            let targetPage = dataPage;
            if (!targetPage) {
                const cleanHref = href.replace(/^[\/#]/, '').trim();
                targetPage = (cleanHref === '' || cleanHref === 'home' || cleanHref === 'index.html') ? 'home' : cleanHref;
            }
            switchPage(targetPage);
        });
    });
    switchPage(getPageIdFromPath(), false);
    
    fetchAllStocks();
});

window.addEventListener('popstate', () => {
    switchPage(getPageIdFromPath(), false);
});

document.addEventListener('click', (event) => {
    const btn = event.target.closest('.variant-btn');
    if (!btn) return;

    const gewaehlteId = btn.getAttribute('data-id');
    const produktKarte = btn.closest('.product-card, .product-details, .product-card-detail-view');
    
    if (!produktKarte) return;
    const hauptButton = produktKarte.querySelector('.btn-buy');
    if (hauptButton) {
        hauptButton.setAttribute('data-id', gewaehlteId);
    }

    produktKarte.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updatePrice(btn);
    
    const imgElement = produktKarte.querySelector('.product-img');
    const variantImages = btn.getAttribute('data-variant-images');

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

async function fetchAllStocks() {
    const stocks = await stockPromise;
    
    const stockMap = {};
    if (Array.isArray(stocks)) {
        stocks.forEach(item => {
            const stockValue = item.maxStock !== undefined ? item.maxStock : item.stock;
            stockMap[item.id] = parseInt(stockValue) || 0;
        });
    }

    document.querySelectorAll('.variant-btn').forEach(btn => {
        const productId = btn.getAttribute('data-id');
        if (productId in stockMap) {
            const stock = stockMap[productId];
            btn.setAttribute('data-stock', stock);
            
            if (stock <= 0) {
                btn.style.opacity = '0.4';
                btn.style.textDecoration = 'line-through';
            } else {
                btn.style.opacity = '1';
                btn.style.textDecoration = 'none';
            }
        }
    });

    document.querySelectorAll('.product-card, .product-details, .product-card-detail-view').forEach(container => {
        updateMainButtonStock(container);
    });
}

function updateMainButtonStock(produktKarte) {
    const activeVariantBtn = produktKarte.querySelector('.variant-btn.active');
    const cartButton = produktKarte.querySelector('.btn-buy');
    
    if (!activeVariantBtn || !cartButton) return;
    const stockAttr = activeVariantBtn.getAttribute('data-stock') || activeVariantBtn.getAttribute('data-max-stock') || "0";
    const aktuellerBestand = parseInt(stockAttr);
    
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