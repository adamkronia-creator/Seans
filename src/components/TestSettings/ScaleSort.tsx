import type { SVGProps } from 'react';
import { IconSort } from '../LibraryFilters/FilterIcons';

/** Порядок полос в блоке «Основные шкалы»: как в тесте, от большего к меньшему, от меньшего к большему */
export type ScaleOrder = 'none' | 'desc' | 'asc';

/** Каждое нажатие — следующий порядок по кругу: как в тесте → по убыванию → по возрастанию → как в тесте */
const NEXT: Record<ScaleOrder, ScaleOrder> = { none: 'desc', desc: 'asc', asc: 'none' };

const LABEL: Record<ScaleOrder, string> = { none: 'Сортировка', desc: 'По убыванию', asc: 'По возрастанию' };

/** Полная подпись для экранной читалки: что сейчас и что будет после нажатия */
const ARIA: Record<ScaleOrder, string> = {
  none: 'Порядок шкал: как в тесте. Нажмите, чтобы отсортировать от большего к меньшему',
  desc: 'Порядок шкал: от большего к меньшему. Нажмите, чтобы отсортировать от меньшего к большему',
  asc: 'Порядок шкал: от меньшего к большему. Нажмите, чтобы вернуть порядок теста',
};

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

/** От большего к меньшему: стрелка вниз и полосы, которые становятся короче */
const IconSortDesc = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5.5 5v14M5.5 19l-3-3M5.5 19l3-3" />
    <path d="M12 6h9M12 12h6.5M12 18h4" />
  </svg>
);

/** От меньшего к большему: стрелка вверх и полосы, которые становятся длиннее */
const IconSortAsc = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5.5 19V5M5.5 5l-3 3M5.5 5l3 3" />
    <path d="M12 6h4M12 12h6.5M12 18h9" />
  </svg>
);

/** Кнопка в заголовке блока шкал: показывает порядок сейчас и переключает его; когда порядок выбран, подсвечена */
export function ScaleSortButton({ order, onChange }: { order: ScaleOrder; onChange: (next: ScaleOrder) => void }) {
  const Icon = order === 'desc' ? IconSortDesc : order === 'asc' ? IconSortAsc : IconSort;
  return (
    <button type="button" className={`cc-sort${order === 'none' ? '' : ' cc-sort--on'}`} aria-label={ARIA[order]} onClick={() => onChange(NEXT[order])}>
      <Icon className="cc-sort__icon" />
      <span className="cc-sort__label">{LABEL[order]}</span>
    </button>
  );
}
