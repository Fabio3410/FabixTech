window.initSliders = function() {
    const productCards = document.querySelectorAll('.product-card, .product-card-detail-view');
    
    productCards.forEach(card => {
        const activeVariantBtn = card.querySelector('.variant-btn.active');
        if (activeVariantBtn) {
            syncImagesWithVariant(activeVariantBtn);
        }
    });

    productCards.forEach(card => {
        if (card.dataset.sliderInitialized) return;
        card.dataset.sliderInitialized = 'true';

        const imgElement = card.querySelector('.product-img');
        const prevBtn = card.querySelector('.arrow.prev');
        const nextBtn = card.querySelector('.arrow.next');
        
        if (imgElement && prevBtn && nextBtn) {
            nextBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                const imagesData = imgElement.getAttribute('data-images');
                if (!imagesData) return;
                
                const images = imagesData.split(',');
                let currentIndex = parseInt(imgElement.getAttribute('data-index')) || 0;
                imgElement.classList.add('fade-out');
                
                setTimeout(() => {
                    currentIndex = (currentIndex + 1) % images.length;
                    imgElement.setAttribute('data-index', currentIndex);
                    imgElement.src = images[currentIndex].trim();
                    imgElement.classList.remove('fade-out');
                }, 150);
            });
            
            prevBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                const imagesData = imgElement.getAttribute('data-images');
                if (!imagesData) return;
                
                const images = imagesData.split(',');
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
};

function preloadAllProductImages() {
    const imageUrls = new Set();

    document.querySelectorAll('[data-variant-images], [data-images]').forEach(element => {
        const variantImages = element.getAttribute('data-variant-images');
        const dataImages = element.getAttribute('data-images');

        if (variantImages) {
            variantImages.split(',').forEach(url => imageUrls.add(url.trim()));
        }
        if (dataImages) {
            dataImages.split(',').forEach(url => imageUrls.add(url.trim()));
        }
    });

    imageUrls.forEach(url => {
        if (url) {
            const img = new Image();
            img.src = url;
        }
    });
}

window.jumpToSlide = function(buttonElement, indexFallback) {
    const track = buttonElement.closest('.color-slider-track');
    if (track) {
        track.querySelectorAll('.variant-btn').forEach(btn => btn.classList.remove('active'));
        buttonElement.classList.add('active');
    }
    syncImagesWithVariant(buttonElement);
};

function syncImagesWithVariant(variantBtn) {
    const card = variantBtn.closest('.product-card, .product-card-detail-view');
    const imgElement = card.querySelector('.product-img');
    const variantImagesData = variantBtn.getAttribute('data-variant-images');

    if (imgElement && variantImagesData) {
        imgElement.setAttribute('data-images', variantImagesData);
        const images = variantImagesData.split(',');
        imgElement.src = images[0].trim();
        imgElement.setAttribute('data-index', '0');
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        preloadAllProductImages();
    }, 500);
});