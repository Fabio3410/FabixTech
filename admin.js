document.addEventListener('DOMContentLoaded', () => {
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    const navContainer = document.querySelector('.nav-links'); // Name ggf. an dein HTML anpassen

    if (isAdmin && navContainer && !document.getElementById('admin-nav-btn')) {
        const adminBtn = document.createElement('a');
        adminBtn.id = 'admin-nav-btn';
        adminBtn.href = '/admin.html';
        adminBtn.innerText = 'Admin Dashboard';
        adminBtn.style.color = '#d40202';
        adminBtn.style.fontWeight = 'bold';
        
        navContainer.appendChild(adminBtn);
    }
});