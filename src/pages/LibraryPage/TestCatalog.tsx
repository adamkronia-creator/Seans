import IconList from '../../assets/icons/solar/list.svg?react';

export type CatalogLayout = 'cards' | 'list';

export function TestCatalogResults({ heading, count, layout, onLayout }: {
  heading: string;
  count: string;
  layout: CatalogLayout;
  onLayout: (layout: CatalogLayout) => void;
}) {
  return (
    <div className="catalog-results">
      <div className="catalog-results__title">
        <h2>{heading}</h2>
        <span aria-live="polite">{count}</span>
      </div>
      <div className="catalog-layout" role="group" aria-label="Вид каталога">
        <button type="button" aria-label="Карточки" aria-pressed={layout === 'cards'} onClick={() => onLayout('cards')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" aria-hidden="true">
            <rect x="4" y="5" width="16" height="14" rx="3" />
            <path d="M4 14h16" />
          </svg>
        </button>
        <button type="button" aria-label="Список" aria-pressed={layout === 'list'} onClick={() => onLayout('list')}>
          <IconList aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
