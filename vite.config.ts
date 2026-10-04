import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// Цвета иконок из Figma заменяются на currentColor,
// чтобы цвет задавался через CSS (активная/неактивная вкладка и т.д.)
const ICON_COLORS = ['#A0A9B3', '#818C99', '#0088FF', '#1E1E1E'];

export default defineConfig({
  // Относительные пути, чтобы сайт работал по адресу github.io/<репозиторий>/
  base: './',
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        replaceAttrValues: Object.fromEntries(
          ICON_COLORS.map((c) => [c, 'currentColor']),
        ),
        svgProps: { width: '1em', height: '1em' },
      },
    }),
  ],
});
