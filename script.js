function updatePrice(button) {
        const container = button.closest('.color-slider-container');
        const card = container.parentElement;
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
                return link.getAttribute('onclick').includes(`'${pageId}'`);
            });
            if (activeLink) {
                activeLink.classList.add('active');
            }
            window.scrollTo(0, 0);
        }

        document.querySelectorAll('.variant-btn').forEach(btn => {
                btn.addEventListener('click', (event) => {
                        const gewaehlteId = event.target.dataset.id;
                        const produktKarte = event.target.closest('.product-card');
                        const hauptButton = produktKarte.querySelector('.btn-buy');
                        hauptButton.dataset.id = gewaehlteId;
                        produktKarte.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
                        event.target.classList.add('active');
                        console.log("Geänderte ID für dieses Produkt:", hauptButton.dataset.id);
                        const variantImages = button.getAttribute('data-variant-images');
                        const imgElement = document.querySelector('.product-img'); 
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

        document.querySelectorAll('.variant-btn').forEach(btn => {
                btn.addEventListener('click', (event) => {
                        const gewaehlteId = event.target.dataset.id;
                        const produktKarte = event.target.closest('.product-card');
                        const hauptButton = produktKarte.querySelector('.btn-buy');
                        hauptButton.dataset.id = gewaehlteId;
                        produktKarte.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
                        event.target.classList.add('active');
                });
        });

        document.getElementById('checkout-button').addEventListener('click', async () => {
                const response = await fetch('/api/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cartIds: meinWarenkorbIds }) 
                });
                
                const data = await response.json();
                if (data.url) {
                        window.location.href = data.url;
                } else {
                        alert('Fehler: ' + data.error);
                }
        });
