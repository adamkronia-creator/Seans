import { Fragment, useMemo, useState } from 'react';
import { Chip } from '../Chip/Chip';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import { countFilters, facetCounts, listIds, type Catalog, type Filters, type ViewQuery } from '../../data/libraryQuery';
import { plural } from '../../data/taskValues';
import '../EditSheet/EditSheet.css';
import './LibraryFilters.css';

interface FilterSheetProps {
  catalog: Catalog;
  /** Запрос и порядок; фильтры в нём — уже применённые, окно правит их копию */
  view: ViewQuery;
  /** Материалы раздела, из которого открыли окно */
  scope: string[];
  favorites: ReadonlySet<string>;
  /** «тест», «теста», «тестов» */
  noun: [string, string, string];
  onApply: (filters: Filters) => void;
  onClose: () => void;
}

/**
 * Окно фильтров. У каждого пункта число материалов, которое он даст при остальных выбранных условиях и запросе;
 * пункт, который даст ноль, недоступен. Внизу сразу видно итог («Показать 3 теста»), применяется по кнопке.
 */
export function FilterSheet({ catalog, view, scope, favorites, noun, onApply, onClose }: FilterSheetProps) {
  useSheet(onClose);
  const [draft, setDraft] = useState<Filters>(view.filters);
  const counts = useMemo(() => facetCounts(catalog, { ...view, filters: draft }, scope), [catalog, view, draft, scope]);
  const total = useMemo(() => listIds(catalog, { ...view, filters: draft }, scope, favorites).ids.length, [catalog, view, draft, scope, favorites]);

  const toggle = (facet: string, option: string) =>
    setDraft((d) => {
      const current = d[facet] ?? [];
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
      const out = { ...d, [facet]: next };
      if (!next.length) delete out[facet];
      return out;
    });

  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Фильтры">
        <div className="sheet__grab" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__heading">Фильтры</h2>
        </div>
        <div className="sheet__body">
          {catalog.facets.map((facet) => (
            <Fragment key={facet.id}>
              <h3 className="filter-group__title">{facet.label}</h3>
              <section className="sheet__card filter-group" aria-label={facet.label}>
                <div className="filter-group__chips">
                  {facet.options.map((option) => {
                    const on = (draft[facet.id] ?? []).includes(option.id);
                    const count = counts[facet.id]?.[option.id] ?? 0;
                    return (
                      <Chip key={option.id} active={on} count={count} ariaLabel={`${option.label}: ${count}`} disabled={!on && count === 0} onClick={() => toggle(facet.id, option.id)}>
                        {option.label}
                      </Chip>
                    );
                  })}
                </div>
              </section>
            </Fragment>
          ))}
        </div>
        <div className="sheet__footer">
          <button type="button" className="sheet__button filter-sheet__reset" disabled={countFilters(draft) === 0} onClick={() => setDraft({})}>
            Сбросить
          </button>
          <button
            type="button"
            className="sheet__button sheet__button--primary filter-sheet__apply"
            disabled={total === 0}
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {total === 0 ? 'Ничего нет' : `Показать ${total} ${plural(total, noun)}`}
          </button>
        </div>
      </div>
    </SheetOverlay>
  );
}
