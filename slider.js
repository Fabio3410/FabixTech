const sliderIndexes = new Map();

function updateActiveButton(container, currentIndex) {
  const card = container.closest('.product-card');
  if (!card) return;
  
  const buttons = card.querySelectorAll('.variant-btn');
  buttons.forEach((btn, index) => {
    if (index === currentIndex) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function changeSlide(buttonElement, direction) {
  const card = buttonElement.closest('.product-card');
  if (!card) return;

  const container = card.querySelector('.slider-container');
  const slidesContainer = card.querySelector('.slides');
  
  if (!container || !slidesContainer) return;

  if (!container.id) {
    container.id = 'slider-' + Math.random().toString(36).substr(2, 9);
  }
  const sliderId = container.id;

  if (!sliderIndexes.has(sliderId)) {
    sliderIndexes.set(sliderId, 0);
  }
  let currentSlide = sliderIndexes.get(sliderId);

  const totalSlides = slidesContainer.querySelectorAll('img').length;

  currentSlide += direction;

  if (currentSlide >= totalSlides) {
    currentSlide = 0;
  } else if (currentSlide < 0) {
    currentSlide = totalSlides - 1;
  }
  
  sliderIndexes.set(sliderId, currentSlide);
  slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;

  updateActiveButton(container, currentSlide);
}

function jumpToSlide(buttonElement, slideIndex) {
  const card = buttonElement.closest('.product-card');
  if (!card) return;

  const container = card.querySelector('.slider-container');
  const slidesContainer = card.querySelector('.slides');
  
  if (!container || !slidesContainer) return;

  if (!container.id) {
    container.id = 'slider-' + Math.random().toString(36).substr(2, 9);
  }
  const sliderId = container.id;

  sliderIndexes.set(sliderId, slideIndex);
  slidesContainer.style.transform = `translateX(-${slideIndex * 100}%)`;
  updateActiveButton(container, slideIndex);
}
