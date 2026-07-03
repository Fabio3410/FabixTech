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
