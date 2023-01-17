(() => {
  function initializeApp() {
    window.app = {};
    initializeLoading();

    document.dispatchEvent(new Event('app-loaded'));

    // Show loading when clicking something (that isn't an app action)
    document.querySelectorAll('a').forEach((anchor) => {
      const isAppAction = Array.from(anchor.classList.values()).some((className) => className.startsWith('app:'));

      const isFile = anchor.attributes.getNamedItem('href')?.value.startsWith('/file/');

      const isExternal = anchor.attributes.getNamedItem('href')?.value.startsWith('https://');

      if (isAppAction || isExternal) {
        return;
      }

      anchor.addEventListener('click', () => {
        window.app.showLoading();

        // It's nice to see the loading even for files, but they're generally quick to download, and tapping into how long they're taking is unnecessarily complex
        if (isFile) {
          setTimeout(() => window.app.hideLoading(), 1500);
        }
      });
    });

    // Show loading when submitting a form
    document.querySelectorAll('form').forEach((form) => {
      if (form.hasAttribute('novalidate')) {
        return;
      }

      form.addEventListener('submit', () => {
        window.app.showLoading();
      });
    });

    window.app.hideLoading();
  }

  function initializeLoading() {
    const loadingComponent = document.getElementById('loading');

    window.app.showLoading = () => loadingComponent.classList.remove('hide');
    window.app.hideLoading = () => loadingComponent.classList.add('hide');
  }

  document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
  });

  // Hides loading on browser-back
  window.addEventListener('unload', () => {
    window.app?.hideLoading();
  });
})();
