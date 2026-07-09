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
