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
- `src/components/SwipePager/`, `src/utils/swipe.ts` — листание разделов чата пальцем: страницы идут за пальцем, пружина доводки, резинка у краёв; пузыри (`data-swipe-lock`) и блоки с боковой прокруткой (`data-hscroll`) договариваются с пейджером о жестах
- `src/App.tsx`, `src/utils/edgeBack.ts` — экраны лежат слоями (под верхним уже нарисован тот, куда вернёмся): жест «назад» от левого края тянет экран вправо, а под ним виден предыдущий; вложенное «назад» внутри экрана (поиск в чате, бланк теста) заявляется через `useBackHandler` (`src/utils/backHandler.ts`)
- `src/components/EditSheet/useSheetDrag.ts` — нижние окна закрываются свайпом вниз
- `src/components/` — Avatar, Badge, Chip, SearchField, ChatItem, TabBar, icons
- `src/pages/MessagesPage/` — экран «Сообщения»
- `src/data/chats.ts` — тестовые чаты
- `src/assets/` — иконки (SVG), аватарки
