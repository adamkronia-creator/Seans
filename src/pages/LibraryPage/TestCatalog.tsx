import type { CSSProperties, ReactNode } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { IconTabLibrary } from '../../components/icons';
import { useAvatarSrc } from '../../data/profile';
import type { Catalog, Filters } from '../../data/libraryQuery';
import { switchTab } from '../../utils/tabNav';
import IconClock from '../../assets/icons/solar/clock-circle.svg?react';
import IconList from '../../assets/icons/solar/list.svg?react';

const TOPICS = [
  { option: 'personality', entry: 'smol', label: 'Личность' },
  { option: 'anxiety', entry: 'itt', label: 'Тревога' },
  { option: 'depression', entry: 'bdi', label: 'Депрессия' },
  { option: 'selfesteem', entry: 'rses', label: 'Самооценка' },
  { option: 'symptoms', entry: 'scl90', label: 'Симптомы' },
  { option: 'suicide', entry: 'ocr', label: 'Риск суицида' },
];

const SHORTCUTS = [
  { facet: 'time', option: 'fast', Icon: IconClock },
  { facet: 'result', option: 'profile', Icon: IconTabLibrary },
];

interface CatalogHeaderProps {
  title: string;
  catalog: Catalog;
  filters: Filters;
  onToggle: (facet: string, option: string) => void;
  search: ReactNode;
  suggestions: ReactNode;
  filterButton: ReactNode;
  folders: ReactNode;
  selection: ReactNode;
}

export function TestCatalogHeader({ title, catalog, filters, onToggle, search, suggestions, filterButton, folders, selection }: CatalogHeaderProps) {
  const avatar = useAvatarSrc();
  const domain = catalog.facets.find(({ id }) => id === 'domain');
  return (
    <header className="catalog-head">
      {selection ? (
        <div className="chats-header__top chats-header__top--select">{selection}</div>
      ) : (
        <>
          <div className="catalog-head__top">
            <h1>{title}</h1>
            <button type="button" className="catalog-head__profile" aria-label="Открыть профиль" onClick={() => switchTab('profile')}>
              <Avatar src={avatar} />
            </button>
          </div>
          <div className="catalog-search">{search}{suggestions}</div>
          <div className="catalog-topics" role="group" aria-label="Темы диагностики" data-hscroll>
            {TOPICS.map(({ option, entry, label }) => {
              const item = catalog.byId.get(entry)?.item;
              const name = domain?.options.find(({ id }) => id === option)?.label;
              if (!item || !name) return null;
              return (
                <button
                  key={option}
                  type="button"
                  className="catalog-topic"
                  aria-label={name}
                  aria-pressed={filters.domain?.includes(option) ?? false}
                  onClick={() => onToggle('domain', option)}
                >
                  <span className="catalog-topic__art" style={{ '--topic-tint': item.tint } as CSSProperties}>
                    <img src={item.icon} alt="" />
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          <div className="catalog-shortcuts" role="group" aria-label="Быстрые фильтры" data-hscroll>
            {filterButton}
            {SHORTCUTS.map(({ facet, option, Icon }) => {
              const name = catalog.facets.find(({ id }) => id === facet)?.options.find(({ id }) => id === option)?.label;
              if (!name) return null;
              return (
                <button
                  key={facet}
                  type="button"
                  className="catalog-shortcut"
                  aria-pressed={filters[facet]?.includes(option) ?? false}
                  onClick={() => onToggle(facet, option)}
                >
                  <Icon aria-hidden="true" />
                  {name}
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="screen-header__chips catalog-folders" role="group" aria-label="Подборки тестов" data-hscroll>
        <span className="chips-pill" aria-hidden="true" />
        {folders}
      </div>
    </header>
  );
}

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
