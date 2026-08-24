document.addEventListener('DOMContentLoaded', () => {
  const DISPLAY_TIME = 2000;
  setTimeout(() => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('fade-out');
      
      setTimeout(() => preloader.remove(), 400); 
    }
  }, DISPLAY_TIME);
});
