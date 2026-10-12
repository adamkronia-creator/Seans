import type { SVGProps } from 'react';

/* Значки меню папки: линия 1,5 на сетке 24, как у остальных значков набора. Размер задаётся кеглем (1em), цвет — currentColor */

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

/** Изменить порядок: две стрелки, одна вверх, другая вниз */
export const IconReorder = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M8 19V5M4.5 8.5L8 5l3.5 3.5" />
    <path d="M16 5v14M12.5 15.5L16 19l3.5-3.5" />
  </svg>
);

/** Колокольчик: уведомления включены */
export const IconBellOn = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M18 9a6 6 0 0 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15.5 18 9z" />
    <path d="M10.2 20.5a2 2 0 0 0 3.6 0" />
  </svg>
);

/** Колокольчик зачёркнут: уведомления выключены */
export const IconBellOff = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M18 9a6 6 0 0 0-9.4-4.9" />
    <path d="M6.2 6.7A6.2 6.2 0 0 0 6 9c0 6.5-2.5 8.5-2.5 8.5h13" />
    <path d="M18 12.5c.1 2.8.9 4 1.5 5" />
    <path d="M10.2 20.5a2 2 0 0 0 3.6 0" />
    <path d="M3 3l18 18" />
  </svg>
);

/** Папка с плюсом: создать папку */
export const IconFolderPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2c.6 0 1.2.3 1.6.8L11.5 7.5h7A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
    <path d="M12 11.5v5M9.5 14h5" />
  </svg>
);
