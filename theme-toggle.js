document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'floating-theme-toggle';
    toggleBtn.className = 'theme-toggle-btn';
    toggleBtn.setAttribute('aria-label', 'Dark Mode umschalten');

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    
    toggleBtn.innerHTML = currentTheme === 'dark' 
        ? '<i class="fa-solid fa-moon"></i>' 
        : '<i class="fa-solid fa-sun"></i>';
    
    document.body.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        if (document.body) {
            document.body.setAttribute('data-theme', newTheme);
        }
        localStorage.setItem('theme', newTheme);
        
        toggleBtn.style.transform = 'scale(0) rotate(-180deg)';
        
        setTimeout(() => {
            toggleBtn.innerHTML = newTheme === 'dark' 
                ? '<i class="fa-solid fa-moon"></i>' 
                : '<i class="fa-solid fa-sun"></i>';
            
            toggleBtn.style.transform = 'scale(1) rotate(0deg)';
        }, 300);
    });
});