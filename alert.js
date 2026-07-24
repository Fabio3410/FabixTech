window.showAlert = function(message, title = "Hinweis") {
    let overlay = document.getElementById('custom-alert-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-alert-overlay';
        overlay.className = 'custom-alert-overlay';
        overlay.innerHTML = `
            <div class="custom-alert-box">
                <h3 id="custom-alert-title"></h3>
                <p id="custom-alert-message"></p>
                <button type="button" id="custom-alert-btn">Verstanden</button>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#custom-alert-btn').addEventListener('click', window.closeCustomAlert);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) window.closeCustomAlert();
        });
    }

    document.getElementById('custom-alert-title').innerText = title;
    document.getElementById('custom-alert-message').innerText = message;

    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
};

window.closeCustomAlert = function() {
    const overlay = document.getElementById('custom-alert-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 200);
    }
};

window.alert = function(message) {
    window.showAlert(message, "Hinweis");
};
