import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> => ({
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...p,
});

/** Метка места */
export const IconPin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 21c-.3 0-6.5-5.4-6.5-11a6.5 6.5 0 0 1 13 0c0 5.6-6.2 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
);

/** Карта: сложенный лист */
export const IconMap = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M9 4 3.5 6v14L9 18m0-14 6 2m-6-2v14m6-12 5.5-2v14L15 20m0-14v14m-6-2 6 2" />
  </svg>
);

/** Ссылка во внешний сервис: стрелка из квадрата */
export const IconExternal = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </svg>
);

/** Календарь с отметкой: «приема пока нет» */
export const IconCalendarEmpty = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 1.5, ...p })}>
    <rect x="3.5" y="4.5" width="17" height="16" rx="3.5" />
    <path d="M7.5 2.5v3.5M16.5 2.5v3.5M3.5 10h17" />
  </svg>
);
