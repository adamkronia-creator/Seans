import type { CSSProperties } from 'react';
import '../../styles/segmented-control.css';
import IconList from '../../assets/icons/solar/list.svg?react';

export type CatalogLayout = 'cards' | 'list';

export function CatalogLayoutSwitch({ layout, onLayout }: {
  layout: CatalogLayout;
  onLayout: (layout: CatalogLayout) => void;
}) {
  return (
    <div
      className="segmented-control catalog-layout"
      role="group"
      aria-label="Вид каталога"
      style={{ '--seg-i': layout === 'list' ? 1 : 0, '--seg-n': 2 } as CSSProperties}
    >
      <button className="segmented-control__item" type="button" aria-label="Карточки" aria-pressed={layout === 'cards'} onClick={() => onLayout('cards')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M4 14h16" />
        </svg>
      </button>
      <button className="segmented-control__item" type="button" aria-label="Список" aria-pressed={layout === 'list'} onClick={() => onLayout('list')}>
        <IconList aria-hidden="true" />
      </button>
    </div>
  );
}
