import type { SVGProps } from 'react';

/* Значки поиска и фильтров библиотеки: линия 1,5 на сетке 24, как у остальных значков набора. Размер задаётся кеглем (1em), цвет — currentColor */

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

/** Фильтры: три линии с ползунками */
export const IconSliders = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

/** Сортировка: две стрелки в разные стороны */
export const IconSort = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M8 19V5M8 5L4.5 8.5M8 5l3.5 3.5" />
    <path d="M16 5v14M16 19l-3.5-3.5M16 19l3.5-3.5" />
  </svg>
);

/** Сравнение: две колонки */
export const IconCompare = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4.5" width="7" height="15" rx="2.5" />
    <rect x="13.5" y="4.5" width="7" height="15" rx="2.5" />
    <path d="M6.5 9.5h1M16.5 9.5h1M6.5 13h1M16.5 13h1" />
  </svg>
);

/** Прошлый запрос: часы со стрелкой назад */
export const IconHistory = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 12a8 8 0 1 0 2.5-5.8" />
    <path d="M4 4.5v3.7h3.7" />
    <path d="M12 8v4.2l2.8 1.8" />
  </svg>
);
