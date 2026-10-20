import type { CSSProperties } from 'react';
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
}

/** Строка теста или задания в библиотеке: вид как у чата в списке «Диалогов», справа сердечко «в избранное» (см. LibraryCard.css) */
export function LibraryCard({ test, favorite, onToggleFavorite, onClick, facts, why, marks }: LibraryCardProps) {
  return (
    <li className={`lib-card${favorite ? ' lib-card--fav' : ''}`}>
      <button type="button" className="test-card" onClick={() => onClick?.(test)}>
        <span className="test-card__avatar" style={{ '--tint': test.tint } as CSSProperties}>
          <img className="test-card__icon" src={test.icon} alt="" loading="lazy" decoding="async" />
        </span>
        <span className="test-card__body">
          <span className="test-card__top lib-card__top">
            <span className="test-card__title">
              <Highlight text={test.title} words={marks} />
            </span>
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
