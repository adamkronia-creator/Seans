import type { SVGProps } from 'react';

/* Значки профиля: линия 1,5 на сетке 24, как у остальных значков набора. Размер задаётся кеглем (1em), цвет — currentColor */

const base = (p: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> => ({
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...p,
});

export const IconCamera = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 9a2.5 2.5 0 0 1 2.5-2.5H8l1.1-1.7a1 1 0 0 1 .85-.45h4.1a1 1 0 0 1 .85.45L16 6.5h1.5A2.5 2.5 0 0 1 20 9v7.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
    <circle cx="12" cy="12.75" r="3.25" />
  </svg>
);

export const IconPencil = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M16.5 3.8a2.1 2.1 0 0 1 3 3L7.6 18.7l-4.1 1.1 1.1-4.1z" />
    <path d="M14.6 5.7l3.7 3.7" />
  </svg>
);

export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const IconPlusLine = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** Фото: рамка, солнце и горы */
export const IconImage = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
    <circle cx="9" cy="10" r="1.75" />
    <path d="M4 17l4.5-4 3.5 3 3-2.5 5 4" />
  </svg>
);

/** Фон приложения: телефон с картинкой на экране */
export const IconWallpaper = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="6.5" y="3" width="11" height="18" rx="3" />
    <path d="M6.5 15l4-3.5 3 2.5 4-3" />
    <circle cx="14" cy="8" r="1.1" />
  </svg>
);

/** Обложка: широкая рамка с полосой снизу */
export const IconCover = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="7" width="18" height="10" rx="2.5" />
    <path d="M3.5 14.5l4-3 3.5 2.5 3-2 6.5 4" />
  </svg>
);

/** Подпись: строки текста */
export const IconCaption = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 7h14M5 12h14M5 17h8" />
  </svg>
);
