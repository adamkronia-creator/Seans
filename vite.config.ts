import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Относительные пути, чтобы сайт работал по адресу github.io/<репозиторий>/
  base: './',
  plugins: [react()],
});
