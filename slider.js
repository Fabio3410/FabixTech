document.addEventListener('DOMContentLoaded', () => {
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        const imgElement = card.querySelector('.product-img');
        const prevBtn = card.querySelector('.arrow.prev');
        const nextBtn = card.querySelector('.arrow.next');

        if (imgElement && prevBtn && nextBtn) {

            const imagesData = imgElement.getAttribute('data-images');
            if (!imagesData) return;
            
            const images = imagesData.split(','); 
            let currentIndex = 0;
            
            nextBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const currentImagesData = imgElement.getAttribute('data-images');
                const images = currentImagesData.split(',');
                let currentIndex = parseInt(imgElement.getAttribute('data-index')) || 0;
                imgElement.classList.add('fade-out');
                
                setTimeout(() => {
                    currentIndex = (currentIndex + 1) % images.length; 
                    imgElement.setAttribute('data-index', currentIndex); // Index im HTML abspeichern
                    imgElement.src = images[currentIndex].trim();
                    imgElement.classList.remove('fade-out');
                }, 150);
            });
            
            prevBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const currentImagesData = imgElement.getAttribute('data-images');
                const images = currentImagesData.split(',');
                let currentIndex = parseInt(imgElement.getAttribute('data-index')) || 0;
                imgElement.classList.add('fade-out');
                
                setTimeout(() => {
                    currentIndex = (currentIndex - 1 + images.length) % images.length;
                    imgElement.setAttribute('data-index', currentIndex);
                    imgElement.src = images[currentIndex].trim();
                    imgElement.classList.remove('fade-out');
                }, 150);
            });
        }
    });
});
