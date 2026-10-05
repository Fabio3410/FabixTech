function updateAllThemeIcons(theme) {
    // Sucht alle Theme-Icons auf der Seite (Floating Button + Header/Navbar)
    const icons = document.querySelectorAll('#floating-theme-toggle i, #theme-icon, .theme-toggle-btn i, .theme-toggle i');
    
    icons.forEach(icon => {
        icon.style.opacity = '0';
        icon.style.transform = 'rotate(90deg)';
        
        setTimeout(() => {
            // Zeigt im Dark-Mode die Sonne (für Wechsel zu Light) und im Light-Mode den Mond
            icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            icon.style.opacity = '1';
            icon.style.transform = 'rotate(0deg)';
        }, 150);
    });
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    if (document.body) {
        document.body.setAttribute('data-theme', newTheme);
    }
    localStorage.setItem('theme', newTheme);
    
    updateAllThemeIcons(newTheme);
}

window.toggleDarkMode = toggleDarkMode;

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';

    let toggleBtn = document.getElementById('floating-theme-toggle');
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.id = 'floating-theme-toggle';
        toggleBtn.className = 'theme-toggle-btn';
        toggleBtn.setAttribute('aria-label', 'Dark Mode umschalten');
        toggleBtn.innerHTML = `<i></i>`;
        document.body.appendChild(toggleBtn);
        
        toggleBtn.addEventListener('click', toggleDarkMode);
    }

    updateAllThemeIcons(savedTheme);
});

window.addEventListener('pageshow', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    updateAllThemeIcons(savedTheme);
});