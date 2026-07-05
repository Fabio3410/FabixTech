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

        let currentSlide = 0;
        function changeSlide(direction) {
                const slidesContainer = document.querySelector('.slides');
                const totalSlides = document.querySelectorAll('.slides img').length;
                currentSlide += direction;
                if (currentSlide >= totalSlides) {
                        currentSlide = 0;
                } 
                else if (currentSlide < 0) {
                        currentSlide = totalSlides - 1;
                }
                slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
        }
        function changeSlide(buttonElement, direction) {
                const container = buttonElement.closest('.slider-container');
                if (!container) return;
                if (!container.id) {
                        container.id = 'slider-' + Math.random().toString(36).substr(2, 9);
                }
                
        const sliderId = container.id;
        if (!sliderIndexes.has(sliderId)) {
        sliderIndexes.set(sliderId, 0);
        }
        let currentSlide = sliderIndexes.get(sliderId);
                const slidesContainer = container.querySelector('.slides');
                const totalSlides = container.querySelectorAll('.slides img').length;
                currentSlide += direction;
                if (currentSlide >= totalSlides) {
                        currentSlide = 0;
                } 
                else if (currentSlide < 0) {
                        currentSlide = totalSlides - 1;
                }
                sliderIndexes.set(sliderId, currentSlide);
                slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
        }
        
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
        }

        document.querySelectorAll('.varianten-btn').forEach(btn => {
                btn.addEventListener('click', (event) => {
                        const gewaehlteId = event.target.dataset.id;
                        const produktKarte = event.target.closest('.produkt-karte');
                        const hauptButton = produktKarte.querySelector('.warenkorb-btn');
                        hauptButton.dataset.id = gewaehlteId;
                        produktKarte.querySelectorAll('.varianten-btn').forEach(b => b.classList.remove('aktiv'));
                        event.target.classList.add('aktiv');
                        console.log("Geänderte ID für dieses Produkt:", hauptButton.dataset.id);
                });
        });
