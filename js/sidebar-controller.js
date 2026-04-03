export function initSidebarController({ onResize }) {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const appContainer = document.querySelector('.app-container');

  const triggerResize = () => {
    setTimeout(() => {
      onResize();
    }, 350);
  };

  sidebarToggle.addEventListener('click', () => {
    appContainer.classList.toggle('sidebar-collapsed');
    triggerResize();
  });

  document.querySelectorAll('.strip-icon').forEach((icon) => {
    icon.addEventListener('click', () => {
      appContainer.classList.remove('sidebar-collapsed');
      triggerResize();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === '[' && !event.target.matches('input, textarea')) {
      appContainer.classList.toggle('sidebar-collapsed');
      triggerResize();
    }
  });
}
