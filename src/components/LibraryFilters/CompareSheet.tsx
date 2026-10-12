import type { CSSProperties } from 'react';
import { IconClose } from '../ChatParts/ChatIcons';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import type { LibraryItem } from '../../data/library';
import type { Kind } from '../../data/libraryMeta';
import { compare, shortName, summary, type CompareRow, type Entry } from '../../data/libraryQuery';
import '../EditSheet/EditSheet.css';
import '../TestCard/TestCard.css';
import './LibraryFilters.css';

interface CompareSheetProps {
  kind: Kind;
  /** Два или три материала */
  entries: Entry[];
  onOpen: (item: LibraryItem) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

function Row({ row }: { row: CompareRow }) {
  return (
    <div className="compare__row" role="row">
      <div className="compare__label">{row.label}</div>
      <div className="compare__cells">
        {row.cells.map((cell, i) => (
          <div key={i} className="compare__cell" role="cell">
            <span className={cell ? 'compare__value' : 'compare__value compare__value--none'}>{cell ? cell.text : '—'}</span>
            {row.bar && row.max ? (
              <span className="compare__bar" aria-hidden="true">
                <span className="compare__fill" style={{ width: `${cell?.value !== undefined ? Math.max(6, Math.round((cell.value / row.max) * 100)) : 0}%` }} />
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Сравнение двух-трёх материалов: сначала итог словами, затем только то, чем они отличаются; общее собрано внизу */
export function CompareSheet({ kind, entries, onOpen, onRemove, onClose }: CompareSheetProps) {
  useSheet(onClose);
  const { different, same } = compare(kind, entries);
  const lines = summary(entries);
  const style = { '--cols': entries.length } as CSSProperties;
  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Сравнение">
        <div className="sheet__grab" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__heading">Сравнение</h2>
        </div>
        <div className="sheet__body">
          <div className="compare" style={style} role="table" aria-label="Сравнение материалов">
            <div className="compare__head" role="row">
              {entries.map((e) => (
                <div key={e.item.id} className="compare__who" role="columnheader">
                  {entries.length > 2 && (
                    <button type="button" className="compare__remove" aria-label={`Убрать из сравнения: ${shortName(e.item)}`} onClick={() => onRemove(e.item.id)}>
                      <IconClose />
                    </button>
                  )}
                  <span className="test-card__avatar" style={{ '--tint': e.item.tint } as CSSProperties}>
                    <img className="test-card__icon" src={e.item.icon} alt="" />
                  </span>
                  <span className="compare__name">{shortName(e.item)}</span>
                  <button type="button" className="compare__open" onClick={() => onOpen(e.item)}>
                    Открыть
                  </button>
                </div>
              ))}
            </div>

            {lines.length > 0 && (
              <section className="sheet__card compare__card compare__summary" aria-label="Итог">
                {lines.map((line) => {
                  const at = line.indexOf(':');
                  return (
                    <p key={line} className="compare__line">
                      <strong>{line.slice(0, at + 1)}</strong>
                      {line.slice(at + 1)}
                    </p>
                  );
                })}
              </section>
            )}

            {different.length > 0 && (
              <section className="sheet__card compare__card" aria-label="Чем отличаются">
                <h3 className="compare__heading">Чем отличаются</h3>
                {different.map((row) => (
                  <Row key={row.id} row={row} />
                ))}
              </section>
            )}

            {same.length > 0 && (
              <section className="sheet__card compare__card" aria-label="Одинаково у всех">
                <h3 className="compare__heading">Одинаково у всех</h3>
                {same.map((row) => (
                  <div key={row.id} className="compare__same" role="row">
                    <span className="compare__label compare__label--inline">{row.label}</span>
                    <span className="compare__value compare__value--same">{row.cells[0]?.text}</span>
                  </div>
                ))}
              </section>
            )}

            {different.length === 0 && same.length === 0 && <p className="compare__empty">Для этих материалов пока нет сведений, которые можно сравнить.</p>}
          </div>
        </div>
        <div className="sheet__footer">
          <button type="button" className="sheet__button" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </SheetOverlay>
  );
}
