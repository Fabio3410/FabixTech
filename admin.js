document.addEventListener('DOMContentLoaded', () => {
    const isAdmin = localStorage.getItem('is_admin') === 'true';

    if (isAdmin) {
        const logoutBtn = Array.from(document.querySelectorAll('a, button')).find(
            el => el.textContent.trim().toLowerCase() === 'abmelden'
        );

        if (logoutBtn && !document.getElementById('admin-dropdown-btn')) {
            const adminLink = document.createElement('a');
            adminLink.id = 'admin-dropdown-btn';
            adminLink.href = '/admin';
            adminLink.innerText = 'Admin Dashboard';
            
            adminLink.style.display = 'block';
            adminLink.style.color = '#d40202';
            adminLink.style.fontWeight = '600';
            adminLink.style.textDecoration = 'none';
            adminLink.style.padding = '8px 12px'; 

            logoutBtn.parentNode.insertBefore(adminLink, logoutBtn);
        }
    }
});