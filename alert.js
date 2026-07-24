function showAlert(message, title = "Hinweis") {
    let overlay = document.getElementById('custom-alert-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-alert-overlay';
        overlay.className = 'custom-alert-overlay';
        overlay.innerHTML = `
            <div class="custom-alert-box">
                <h3 id="custom-alert-title"></h3>
                <p id="custom-alert-message"></p>
                <button id="custom-alert-btn" onclick="closeCustomAlert()">Verstanden</button>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeCustomAlert();
        });
    }

    document.getElementById('custom-alert-title').innerText = title;
    document.getElementById('custom-alert-message').innerText = message;
    overlay.classList.add('active');
}

function closeCustomAlert() {
    const overlay = document.getElementById('custom-alert-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}
window.alert = function(message) {
    showAlert(message, "Hinweis");
};
