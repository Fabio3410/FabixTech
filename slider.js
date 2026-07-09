document.addEventListener('DOMContentLoaded', () => {
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        const imgElement = card.querySelector('.product-img');
        const prevBtn = card.querySelector('.arrow prev');
        const nextBtn = card.querySelector('.arrow next');

        if (imgElement && prevBtn && nextBtn) {

            const imagesData = imgElement.getAttribute('data-images');
            if (!imagesData) return;
            
            const images = imagesData.split(','); 
            let currentIndex = 0;

            nextBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                currentIndex = (currentIndex + 1) % images.length; 
                imgElement.src = images[currentIndex].trim();
            });
          
            prevBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                currentIndex = (currentIndex - 1 + images.length) % images.length;
                imgElement.src = images[currentIndex].trim();
            });
        }
    });
});
