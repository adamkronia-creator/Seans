import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/opsz.css';
// Курсив: настоящий Inter Italic (синтез наклона выключен в global.css, без этой гарнитуры курсив выглядел прямым)
import '@fontsource-variable/inter/opsz-italic.css';
// Антиква для имён, заголовков, записей и цифр (styles/editorial.css): с оптическими размерами, кириллицей и курсивом
import '@fontsource-variable/literata/opsz.css';
import '@fontsource-variable/literata/opsz-italic.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/motion.css';
import './styles/micro.css';
import './styles/press.css';
import App from './App';
import './styles/theme.css';
import './styles/editorial.css';
import './styles/pm-tokens.css';
import './styles/pm-chats.css';
import { installHoverTitles } from './utils/hoverTitles';
import { installInertiaScroll } from './utils/inertiaScroll';
import { installPressEffect } from './utils/pressEffect';

// Поведение как в приложениях на телефоне: нажатие с пружиной и прокрутка колесом с инерцией (полоса прокрутки — системная);
// на компьютере у кнопок со значком появляются подсказки при наведении
// Вариант фона для сравнения: ?bg=0…3 (0 — прежний градиент, 1 — картинка, 2 — под вуалью, 3 — размытая), выбор запоминается; по умолчанию картинка
try {
  const asked = new URLSearchParams(window.location.search).get('bg');
  if (asked !== null && /^[0-3]$/.test(asked)) localStorage.setItem('seans-bg', asked);
  document.documentElement.dataset.bg = localStorage.getItem('seans-bg') ?? '1';
} catch {
  document.documentElement.dataset.bg = '1';
}
installPressEffect();
installInertiaScroll();
installHoverTitles();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
