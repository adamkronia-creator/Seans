import type { ReactNode } from 'react';

/** Значки полей «Контактной» и «Общей информации» в редактировании профиля: линия 1,8, 24 на 24, цвет задаёт текст вокруг */
const base = { viewBox: '0 0 24 24', width: '1em', height: '1em', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const FieldIcon: Record<'user' | 'at' | 'phone' | 'cake' | 'badge' | 'heart' | 'city', ReactNode> = {
  user: (
    <svg {...base}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20c.6-3.6 3.3-5.6 7.2-5.6s6.6 2 7.2 5.6" />
    </svg>
  ),
  at: (
    <svg {...base}>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M15.6 12v1.6a2.4 2.4 0 0 0 4.8 0V12a8.4 8.4 0 1 0-3.3 6.7" />
    </svg>
  ),
  phone: (
    <svg {...base}>
      <path d="M6.6 3.8 9.4 3l1.6 4-1.9 1.4a11 11 0 0 0 5.5 5.5L16 12l4 1.6-.8 2.8c-.3 1-1.2 1.6-2.2 1.6C10.8 18 6 13.2 6 7c0-1 .6-1.9 1.6-2.2Z" />
    </svg>
  ),
  cake: (
    <svg {...base}>
      <path d="M4 20h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2Z" />
      <path d="M4 15.5c2.7 1.6 5.3 1.6 8 0s5.3-1.6 8 0M12 11V7.5M12 4.5c1 1 1 2 0 3-1-1-1-2 0-3Z" />
    </svg>
  ),
  badge: (
    <svg {...base}>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2.5" />
      <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 13h17" />
    </svg>
  ),
  heart: (
    <svg {...base}>
      <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10C19.5 15.4 12 20 12 20Z" />
    </svg>
  ),
  city: (
    <svg {...base}>
      <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  ),
};
