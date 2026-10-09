# Сеанс — психологический мессенджер (веб-приложение)

React + TypeScript + Vite. Сейчас мобильная версия (браузер), данные тестовые.

## Запуск
```
npm install
npm run dev
```
Открыть адрес из консоли на телефоне или в режиме мобильного устройства в браузере.

## Структура
- `src/styles/tokens.css` — цвета, шрифты, отступы, радиусы (дизайн-токены)
- `src/styles/motion.css`, `press.css` — движение: переходы между экранами, окна, меню, подсказки, подсветка нажатия
- `src/utils/transition.ts` — анимация смены экрана (View Transitions: вперёд, назад, плавная смена); адреса и направление — в `src/router.ts`
- `src/utils/pressEffect.ts` — нажатие как на телефоне (кнопка уменьшается и пружинит); `inertiaScroll.ts` — инерция колеса мыши; `exitAnimation.ts` — уход окон
- `src/components/` — Avatar, Badge, Chip, SearchField, ChatItem, TabBar, icons
- `src/pages/MessagesPage/` — экран «Сообщения»
- `src/data/chats.ts` — тестовые чаты
- `src/assets/` — иконки (SVG), аватарки
