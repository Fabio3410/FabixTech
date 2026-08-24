window.addEventListener('stockLoaded', hidePreloader);

function hidePreloader() {
  const preloader = document.getElementById('preloader');
  if (preloader && !preloader.classList.contains('fade-out')) {
    preloader.classList.add('fade-out');
    setTimeout(() => preloader.remove(), 400);
  }
}

setTimeout(() => {
  hidePreloader();
}, 4000);
