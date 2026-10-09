import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> => ({
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...p,
});

export const IconReply = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M9 7L4 12l5 5" />
    <path d="M4 12h9a7 7 0 0 1 7 7v1" />
  </svg>
);
export const IconCopy = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" />
  </svg>
);
export const IconTrash = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const IconChevronDown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const IconChevronUp = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M6 15l6-6 6 6" />
  </svg>
);

/** Статусы исходящих: часы (отправляется) и одна галочка (отправлено) */
export const IconClock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ viewBox: '0 0 12 12', strokeWidth: 1.2, ...p })}>
    <circle cx="6" cy="6" r="4.6" />
    <path d="M6 3.5V6l1.7 1" />
  </svg>
);
export const IconTickSingle = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ viewBox: '0 0 12 12', strokeWidth: 1.3, ...p })}>
    <path d="M2.5 6.4l2.4 2.4L9.6 3.6" />
  </svg>
);
