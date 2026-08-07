const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
});

window.addEventListener('popstate', () => {
    switchPage(getPageIdFromPath(), false);
});

window.jumpToSlide = function(index) {
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
