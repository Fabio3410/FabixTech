function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

applySavedTheme();
window.addEventListener('pageshow', applySavedTheme);
window.addEventListener('storage', applySavedTheme);

const stockPromise = fetch(`/api/get-all-stocks?t=${Date.now()}`)
    .then(res => res.ok ? res.json() : [])
    .catch(err => {
        console.error("Fehler beim Abrufen der Bestände:", err);
        return [];
    });

document.addEventListener('DOMContentLoaded', () => {
    fetchAllStocks();
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

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        const lightValue = Math.floor((value + 255) / 2); 
        color += ('00' + lightValue.toString(16)).slice(-2);
    }
    return color;
}

function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function logoutUser() {
    localStorage.removeItem('user');
    localStorage.removeItem('is_admin');
    window.location.href = '/';
}

function renderUserMenu() {
    const root = document.getElementById('user-menu-root');
    if (!root) return;

    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        const textColor = stringToColor(user.email);
        const hasCustomImage = Boolean(user.profile_picture);
        const defaultSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
                <rect width="200" height="200" fill="#ffffff" />
                <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="${textColor}" font-family="'Inter', sans-serif" font-weight="900" font-size="95" letter-spacing="-2">3D</text>
            </svg>
        `;

        const avatarContent = hasCustomImage 
            ? `<img src="${user.profile_picture}" alt="Profilbild">`
            : defaultSvg;

        const isAdmin = localStorage.getItem('is_admin') === 'true' || Boolean(user.is_admin);
        const adminLinkHtml = isAdmin 
            ? `<a href="admin.html" style="color: #d40202; font-weight: 600;">Admin Dashboard</a>` 
            : '';

        root.innerHTML = `
            <div class="avatar" style="background-color: #ffffff;" onclick="toggleProfileMenu()">
                ${avatarContent}
            </div>
            <div class="profile-dropdown" id="profileDropdown">
                <a href="settings">Kontoeinstellungen</a>
                ${adminLinkHtml}
                <a href="#" onclick="logoutUser()">Abmelden</a>
            </div>
        `;
    } else {
        root.innerHTML = `
            <a href="login" class="btn btn-primary nav-login-btn">Anmelden</a>
        `;
    }
}

document.addEventListener('click', function(event) {
    const root = document.getElementById('user-menu-root');
    const dropdown = document.getElementById('profileDropdown');
    if (root && dropdown && !root.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

document.addEventListener('DOMContentLoaded', renderUserMenu);
window.addEventListener('pageshow', () => {
    fetchAllStocks();
});