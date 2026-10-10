/**
 * Подсказки при наведении мыши. У кнопок только со значком (нижняя панель, поиск, шапки) нет текста, и на компьютере
 * не понять, что они делают, пока не нажмёшь. Название берется из aria-label, который у них и так есть.
 * Ставится при наведении, а не заранее: на телефоне, где мыши нет, лишних атрибутов не будет.
 */
export function installHoverTitles() {
  document.addEventListener(
    'mouseover',
    (event) => {
      const el = (event.target as Element | null)?.closest?.('button[aria-label], [role="button"][aria-label]');
      if (!el || el.hasAttribute('title') || el.textContent?.trim()) return;
      el.setAttribute('title', el.getAttribute('aria-label') ?? '');
    },
    { passive: true },
  );
}
