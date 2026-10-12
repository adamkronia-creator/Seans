import { IconCheck } from '../Profile/ProfileIcons';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import { SORTS, type SortId } from '../../data/libraryQuery';
import '../EditSheet/EditSheet.css';
import './LibraryFilters.css';

interface SortSheetProps {
  value: SortId;
  /** Идёт поиск по словам: «по умолчанию» значит «по совпадению» */
  searching: boolean;
  onPick: (sort: SortId) => void;
  onClose: () => void;
}

/** Подпись порядка: «по умолчанию» при поиске — «по совпадению» */
export const sortLabel = (id: SortId, searching: boolean) => (id === 'auto' ? (searching ? 'По совпадению' : 'По умолчанию') : (SORTS.find((s) => s.id === id)?.label ?? ''));

/** Окно выбора порядка: нажатие выбирает и закрывает */
export function SortSheet({ value, searching, onPick, onClose }: SortSheetProps) {
  useSheet(onClose);
  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Сортировка">
        <div className="sheet__grab" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__heading">Сортировка</h2>
        </div>
        <div className="sheet__body">
          <section className="sheet__card">
            <ul className="pick-list" role="radiogroup" aria-label="Порядок">
              {SORTS.map((s) => (
                <li key={s.id}>
                  <button type="button" role="radio" aria-checked={value === s.id} className={`pick-row${value === s.id ? ' pick-row--on' : ''}`} onClick={() => onPick(s.id)}>
                    <span className="pick-row__text">
                      <span className="pick-row__label">{sortLabel(s.id, searching)}</span>
                      {(s.hint || (s.id === 'auto' && searching)) && <span className="pick-row__hint">{s.id === 'auto' ? 'Сначала самые подходящие запросу' : s.hint}</span>}
                    </span>
                    {value === s.id && <IconCheck className="pick-row__check" />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
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
