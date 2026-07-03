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

        

        let cart = [];
        function toggleCart() {
            const sidebar = document.getElementById('cart-sidebar');
            sidebar.classList.toggle('open');
        }

        function addToCart(name, price) {
            cart.push({ name, price });
            updateCartUI();
            document.getElementById('cart-sidebar').classList.add('open');
        }

        function updateCartUI() {
            const countElement = document.getElementById('cart-count');
            const container = document.getElementById('cart-items-container');
            const totalElement = document.getElementById('cart-total');
            
            countElement.innerText = cart.length;
            
            if (cart.length === 0) {
                container.innerHTML = '<p class="empty-msg">Dein Warenkorb ist noch leer.</p>';
                totalElement.innerText = 'CHF 0,00';
                return;
            }
            
            container.innerHTML = '';
            let total = 0;
            
            cart.forEach((item) => {
                total += item.price;
                const itemRow = document.createElement('div');
                itemRow.classList.add('cart-item');
                itemRow.innerHTML = `<span>${item.name}</span><strong>CHF ${item.price.toFixed(2)}</strong>`;
                container.appendChild(itemRow);
            });
            
            totalElement.innerText = `CHF ${total.toFixed(2)}`;
        }

        function checkout() {
            if(cart.length === 0) {
                alert("Dein Warenkorb ist leer!");
                return;
            }
            cart = [];
            updateCartUI();
            toggleCart();
        }

        window.addEventListener('DOMContentLoaded', () => {
            const hash = window.location.hash.replace('#', '');
            if(['home', 'shop', 'about', 'contact', 'impressum'].includes(hash)) {
                switchPage(hash);
            }
        });
        function handleFormSubmit(event) {
            event.preventDefault();

            function autoResize(element) {
                element.style.height = 'auto';
                element.style.height = element.scrollHeight + 'px';
            }
            const form = event.target;
            const data = new FormData(form);
            
            fetch('https://formspree.io/f/xkoekone', {
                method: 'POST',
                body: data,
                headers: {
                    'Accept': 'application/json'
                }
            }).then(response => {
                if (response.ok) {
                    alert('Danke! Deine Nachricht wurde gesendet.');
                    form.reset();
                } else {
                    alert('Es gab ein Problem beim Absenden. Bitte versuche es nochmal.');
                }
            }).catch(error => {
                alert('Fehler! Bitte überprüfe deine Internetverbindung!');
            });
        }
        function updatePrice(button) {
                const card = button.closest('.product-card');
                const priceElement = card.querySelector('.price');
                const newPrice = button.getAttribute('data-price');
                if (priceElement && newPrice) {
                        priceElement.textContent = newPrice;
    }
}
