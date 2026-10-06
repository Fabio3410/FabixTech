window.closeCustomAlert = function() {
    const overlay = document.getElementById('custom-alert-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 200);
    }
};

window.showAlert = function(message, title = "Hinweis") {
    let overlay = document.getElementById('custom-alert-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-alert-overlay';
        overlay.className = 'custom-alert-overlay';
        overlay.innerHTML = `
            <style>
            .no-select {
                -webkit-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }

            .custom-alert-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(6px);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
                
            .custom-alert-overlay.active {
                opacity: 1;
            }

            .custom-alert-box {
                background: #ffffff;
                padding: 34px 29px 24px 29px;
                border-radius: 24px;
                box-shadow: 0 24px 30px -6px rgba(0, 0, 0, 0.15);
                max-width: 456px;
                width: 88%;
                text-align: center;
                transform: scale(0.9);
                transition: transform 0.2s ease, background-color 0.4s ease;
            }

            .custom-alert-overlay.active .custom-alert-box {
                transform: scale(1);
            }

            .custom-alert-box h3 {
                margin: 0 0 12px 0;
                font-size: 23px;
                font-weight: 700;
                color: #0f172a;
            }

            .custom-alert-box p {
                margin: 0 0 26px 0;
                font-size: 17px;
                color: #475569;
                line-height: 1.5;
            }

            .custom-alert-box button {
                background-color: #d40202;
                color: #ffffff;
                border: none;
                padding: 14px 29px;
                border-radius: 14px;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                width: 100%;
            }

            .custom-alert-box button:hover {
                background-color: #960505;
            }

            html[data-theme="dark"] .custom-alert-box {
                background: #1e293b;
                border: 1px solid #334155;
                box-shadow: 0 24px 30px -6px rgba(0, 0, 0, 0.5);
            }

            html[data-theme="dark"] .custom-alert-box h3 {
                color: #f8fafc;
            }

            html[data-theme="dark"] .custom-alert-box p {
                color: #94a3b8;
            }
            </style>
            <div class="custom-alert-box">
                <h3 class="no-select" id="custom-alert-title"></h3>
                <p class="no-select" id="custom-alert-message"></p>
                <button class="no-select" type="button" id="custom-alert-btn">Verstanden</button>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#custom-alert-btn').addEventListener('click', window.closeCustomAlert);
    }

    document.getElementById('custom-alert-title').innerText = title;
    document.getElementById('custom-alert-message').innerText = message;

    overlay.style.display = 'flex';
    
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
};

window.alert = function(message) {
    window.showAlert(message, "Hinweis");
};