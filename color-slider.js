function scrollSlider(arrowButton, direction) {
    const container = arrowButton.closest('.color-slider-container');
    const track = container.querySelector('.color-slider-track');
    const scrollAmount = 140;
    
    track.scrollBy({
        left: scrollAmount * direction,
        behavior: 'smooth'
    });
}

function checkSliderArrows() {
    const containers = document.querySelectorAll('.color-slider-container');
    
    containers.forEach(container => {
        const track = container.querySelector('.color-slider-track');
        const leftArrow = container.querySelector('.nav-arrow.left');
        const rightArrow = container.querySelector('.nav-arrow.right');
        
        if (!track || !leftArrow || !rightArrow) return;

        const buttonCount = track.querySelectorAll('.variant-btn').length;
        
        if (buttonCount <= 1) {
            leftArrow.style.setProperty('display', 'none', 'important');
            rightArrow.style.setProperty('display', 'none', 'important');
        } else {
            leftArrow.style.setProperty('display', 'flex', 'important');
            rightArrow.style.setProperty('display', 'flex', 'important');
        }
    });
}

window.addEventListener('load', checkSliderArrows);
window.addEventListener('resize', checkSliderArrows);