function updateAllThemeIcons(theme) {
    const buttons = document.querySelectorAll('#floating-theme-toggle, .theme-toggle-btn, .theme-toggle');
    
    buttons.forEach(btn => {
        btn.innerHTML = theme === 'dark' 
            ? '<i class="fa-solid fa-sun"></i>' 
            : '<i class="fa-solid fa-moon"></i>';
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
        document.body.appendChild(toggleBtn);
        
        toggleBtn.addEventListener('click', toggleDarkMode);
    }

    updateAllThemeIcons(savedTheme);
});

window.addEventListener('pageshow', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    updateAllThemeIcons(savedTheme);
});