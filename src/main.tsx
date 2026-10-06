import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/roboto';
import './styles/tokens.css';
import './styles/global.css';
import App from './App';
import { AppScrollbar } from './components/AppScrollbar/AppScrollbar';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AppScrollbar />
  </StrictMode>,
);
