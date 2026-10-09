import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/opsz.css';
// Курсив: настоящий Inter Italic (синтез наклона выключен в global.css, без этой гарнитуры курсив выглядел прямым)
import '@fontsource-variable/inter/opsz-italic.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/motion.css';
import './styles/press.css';
import App from './App';
import { AppScrollbar } from './components/AppScrollbar/AppScrollbar';
import { installInertiaScroll } from './utils/inertiaScroll';
import { installPressEffect } from './utils/pressEffect';

// Поведение как в приложениях на телефоне: нажатие с пружиной и прокрутка колесом с инерцией
installPressEffect();
installInertiaScroll();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AppScrollbar />
  </StrictMode>,
);
