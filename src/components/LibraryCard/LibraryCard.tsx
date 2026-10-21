import type { CSSProperties } from 'react';
import { useLongPress } from '../../utils/useLongPress';
import { IconHeartGray, IconHeartRed } from '../icons';
import { Highlight } from '../LibraryFilters/Highlight';
import type { LibraryItem } from '../../data/library';
import '../TestCard/TestCard.css';
import './LibraryCard.css';

interface LibraryCardProps {
  test: LibraryItem;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClick?: (test: LibraryItem) => void;
  /** Строка сведений под описанием (у задания: «Дневник · КПТ · 5–7 мин на запись») — по ней материалы различают, не открывая */
  facts?: string;
  /** Почему найдено, если в названии и описании этого нет: «Шкала: Ипохондрия (Hs)» */
  why?: string;
  /** Слова, по которым нашлось: подсвечиваются в названии и описании */
  marks?: ReadonlySet<string> | null;
  /** Закреплён: значок рядом с названием, в списке стоит выше остальных */
  pinned?: boolean;
  /** Идёт выбор: строка выбрана (галочка на значке и заливка) */
  selected?: boolean;
  /** Долгое нажатие на строку включает выбор */
  onLongPress?: (test: LibraryItem) => void;
}

/** Строка теста или задания в библиотеке: вид как у чата в списке «Диалогов», справа сердечко «в избранное» (см. LibraryCard.css) */
export function LibraryCard({ test, favorite, onToggleFavorite, onClick, facts, why, marks, pinned = false, selected = false, onLongPress }: LibraryCardProps) {
  const { handlers, swallow } = useLongPress(onLongPress ? () => onLongPress(test) : undefined);
  return (
    <li className={`lib-card${favorite ? ' lib-card--fav' : ''}${selected ? ' lib-card--selected' : ''}`} data-item={test.id}>
      <button type="button" className="test-card" onClick={(e) => !swallow(e) && onClick?.(test)} {...handlers}>
        <span className="test-card__avatar" style={{ '--tint': test.tint } as CSSProperties}>
          <img className="test-card__icon" src={test.icon} alt="" loading="lazy" decoding="async" />
        </span>
        <span className="lib-card__check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <span className="test-card__body">
          <span className="test-card__top lib-card__top">
            <span className="test-card__title">
              <Highlight text={test.title} words={marks} />
            </span>
            {pinned && (
              <svg className="lib-card__pin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Закреплён">
                <path d="M9 3.5h6l-1 6 3 3.5H7l3-3.5-1-6zM12 13v7.5" />
              </svg>
            )}
          </span>
          <span className="test-card__description">
            <Highlight text={test.description} words={marks} />
          </span>
          {facts && <span className="lib-card__facts">{facts}</span>}
          {why && <span className="lib-card__why">{why}</span>}
        </span>
      </button>
      <button
        type="button"
        className="lib-card__heart"
        aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
        aria-pressed={favorite}
        onClick={() => onToggleFavorite(test.id)}
      >
        {favorite ? <IconHeartRed /> : <IconHeartGray />}
      </button>
    </li>
  );
}
