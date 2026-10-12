import type { SVGProps } from 'react';

/*
 * ВРЕМЕННЫЕ значки шкалы состояния («Как вы себя чувствуете?»): простые лица, нарисованные кодом.
 * Заменить присланными иконками, когда они появятся.
 */
const MOUTHS = [
  'M8 16c1.2-1.6 2.5-2.2 4-2.2s2.8.6 4 2.2', // очень плохо
  'M8.5 15.5c1-.9 2.1-1.3 3.5-1.3s2.5.4 3.5 1.3', // скорее плохо
  'M8.5 14.8h7', // нейтрально
  'M8.5 13.8c1 .9 2.1 1.3 3.5 1.3s2.5-.4 3.5-1.3', // скорее хорошо
  'M8 13.2c1.2 1.6 2.5 2.2 4 2.2s2.8-.6 4-2.2', // очень хорошо
];

export function IconTaskState({ level, ...props }: { level: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9.5v.5M15 9.5v.5" />
      <path d={MOUTHS[level] ?? MOUTHS[2]} />
    </svg>
  );
}
