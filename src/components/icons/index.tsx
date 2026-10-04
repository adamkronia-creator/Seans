import type { SVGProps } from 'react';

// SVG из Figma; цвета в них заменяются на currentColor (см. vite.config.ts)
export { default as IconPlanner } from '../../assets/icons/tabbar/planner.svg?react';
export { default as IconMessages } from '../../assets/icons/tabbar/messages.svg?react';
export { default as IconTests } from '../../assets/icons/tabbar/psych-tests.svg?react';
export { default as IconTasks } from '../../assets/icons/tabbar/psych-tasks.svg?react';
export { default as IconReading } from '../../assets/icons/tabbar/reading-materials.svg?react';
export { default as IconSearch } from '../../assets/icons/search.svg?react';
export { default as IconBell } from '../../assets/icons/notifications.svg?react';
export { default as IconFavorites } from '../../assets/icons/favorites.svg?react';

// Плюс: нет в присланных иконках, нарисован по макету (чипс «+» и кнопка создания)
export function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
