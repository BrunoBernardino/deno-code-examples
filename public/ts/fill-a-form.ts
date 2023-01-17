import '/public/ts/utils.ts';
import { FontStyle } from '/lib/types.ts';

document.addEventListener('app-loaded', () => {
  const fontStyleInput = document.getElementById(
    'field_font_style',
  ) as HTMLInputElement;
  const fontStylePreviewElements = document.querySelectorAll('[data-font-type]');

  function showPreview(fontStyle: FontStyle) {
    fontStylePreviewElements.forEach((element) => {
      if (element.getAttribute('data-font-type') === fontStyle) {
        element.classList.remove('hidden');
        element.classList.add('block');
      } else {
        element.classList.add('hidden');
        element.classList.remove('block');
      }
    });
  }

  fontStyleInput?.addEventListener('change', () => {
    showPreview(fontStyleInput.value as FontStyle);
  });
});
