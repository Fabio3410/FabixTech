document.addEventListener('DOMContentLoaded', () => {
    const variantButtons = document.querySelectorAll('.variant-btn');

    variantButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();

            variantButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const selectedVariant = button.innerText.trim();

            const variantDisplay = document.querySelector('.selected-variant-display');
            if (variantDisplay) {
                variantDisplay.innerText = selectedVariant;
            }

            const variantPrice = button.getAttribute('data-price');
            const priceElement = document.querySelector('.price');
            
            if (priceElement && variantPrice) {
                priceElement.innerText = `CHF ${parseFloat(variantPrice).toFixed(2)}`;
            }

            if (typeof currentProduct !== 'undefined') {
                currentProduct.variant = selectedVariant;
            }

            console.log("Variante gewechselt zu:", selectedVariant);
        });
    });
});
