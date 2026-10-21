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

/** Архив: коробка с крышкой и стрелкой вниз */
export const IconArchive = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="4.5" rx="1.5" />
    <path d="M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5" />
    <path d="M12 11.5v5M9.8 14.5l2.2 2.2 2.2-2.2" />
  </svg>
);

/** Вернуть из архива: коробка со стрелкой вверх */
export const IconUnarchive = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="4.5" rx="1.5" />
    <path d="M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5" />
    <path d="M12 16.5v-5M9.8 13.7l2.2-2.2 2.2 2.2" />
  </svg>
);

/** Закреп: кнопка-булавка */
export const IconPinned = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M9 3.5h6l-1 6 3 3.5H7l3-3.5-1-6z" />
    <path d="M12 13v7.5" />
  </svg>
);

/** Настроить папки: папка с ползунками */
export const IconFolderCog = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4l2 2H19A1.5 1.5 0 0 1 20.5 9v8.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" />
    <path d="M8.5 13.5h7" />
  </svg>
);
