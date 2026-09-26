document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'floating-theme-toggle';
    toggleBtn.className = 'theme-toggle-btn';
    toggleBtn.setAttribute('aria-label', 'Dark Mode umschalten');

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    toggleBtn.innerHTML = `<i class="${currentTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'}"></i>`;
    document.body.appendChild(toggleBtn);
    
    toggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        if (document.body) {
            document.body.setAttribute('data-theme', newTheme);
        }
        localStorage.setItem('theme', newTheme);
        
        const icon = toggleBtn.querySelector('i');
        icon.style.opacity = '0';
        icon.style.transform = 'rotate(90deg)';
        
        setTimeout(() => {
            icon.className = newTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
            icon.style.opacity = '1';
            icon.style.transform = 'rotate(0deg)';
        }, 150);
    });
});