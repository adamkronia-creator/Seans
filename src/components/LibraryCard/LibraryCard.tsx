import type { CSSProperties, ReactNode } from 'react';
import { useLongPress } from '../../utils/useLongPress';
import { useJustOn } from '../../utils/useJustOn';
import { IconHeartRed } from '../icons';
import IconHeart from '../../assets/icons/solar/heart.svg?react';
import IconHeartBold from '../../assets/icons/solar/heart-bold.svg?react';
import { Highlight } from '../LibraryFilters/Highlight';
import type { LibraryItem } from '../../data/library';
import '../TestCard/TestCard.css';
import './LibraryCard.css';
import './CatalogCard.css';

interface LibraryCardProps {
  test: LibraryItem;
  cover?: string;
  coverBadge?: string;
  description?: string;
  favorite: boolean;
  favoriteOnAvatar?: boolean;
  onFavoriteChange?: (on: boolean) => void;
  selecting?: boolean;
  onClick?: (test: LibraryItem) => void;
  /** Строка сведений под описанием (у задания: «Дневник · КПТ · 5–7 мин на запись») — по ней материалы различают, не открывая */
  facts?: ReactNode;
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

/** Строка теста или задания в библиотеке: вид как у чата в списке «Диалогов», сердечко отмечает избранное (см. LibraryCard.css) */
export function LibraryCard({ test, cover, coverBadge = test.abbr, description, favorite, favoriteOnAvatar, onFavoriteChange, selecting, onClick, facts, why, marks, pinned = false, selected = false, onLongPress }: LibraryCardProps) {
  const { handlers, swallow } = useLongPress(onLongPress ? () => onLongPress(test) : undefined);
  // Отметили избранным или закрепили, пока строка на экране: значок выскакивает с пружинкой
  const newFav = useJustOn(favorite);
  const newPin = useJustOn(pinned);
  return (
    <li className={`lib-card${favorite && !onFavoriteChange ? ' lib-card--fav' : ''}${favoriteOnAvatar ? ' lib-card--favorite-on-avatar' : ''}${selected ? ' lib-card--selected' : ''}${newFav ? ' lib-card--fav-new' : ''}${newPin ? ' lib-card--pin-new' : ''}`} data-item={test.id}>
      <button type="button" className="test-card" aria-description={favorite ? 'В избранном' : undefined} onClick={(e) => !swallow(e) && onClick?.(test)} {...handlers}>
        <span className="test-card__avatar" style={{ '--tint': test.tint } as CSSProperties}>
          <img className={cover ? 'lib-card__cover' : 'test-card__icon'} src={cover ?? test.icon} alt="" loading="lazy" decoding="async" />
          {cover && coverBadge && <span className="lib-card__abbr">{coverBadge}</span>}
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
          <span className={description ? 'test-card__description lib-card__description--full' : 'test-card__description'}>
            <Highlight text={description ?? test.catalogDescription ?? test.description} words={marks} />
          </span>
          {facts && <span className="lib-card__facts">{facts}</span>}
          {why && <span className="lib-card__why">{why}</span>}
        </span>
      </button>
      {onFavoriteChange ? (
        <button type="button" className="lib-card__favorite" aria-label={`Избранное — ${test.title}`}
          aria-pressed={favorite} disabled={selecting} onClick={() => onFavoriteChange(!favorite)}>
          {favorite ? <IconHeartBold aria-hidden="true" /> : <IconHeart aria-hidden="true" />}
        </button>
      ) : favorite && <span className="lib-card__heart" aria-hidden="true"><IconHeartRed /></span>}
    </li>
  );
}
