import type { CSSProperties } from 'react';
import { IconHeartGray, IconHeartRed } from '../icons';
import { Highlight } from '../LibraryFilters/Highlight';
import { IconCheck } from '../Profile/ProfileIcons';
import type { LibraryItem } from '../../data/library';
import '../TestCard/TestCard.css';
import './LibraryCard.css';

interface LibraryCardProps {
  test: LibraryItem;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClick?: (test: LibraryItem) => void;
  /** Строка сведений под описанием: «71 вопрос · 15–20 мин · 16+» — по ней материалы различают, не открывая */
  facts?: string;
  /** Почему найдено, если в названии и описании этого нет: «Шкала: Ипохондрия (Hs)» */
  why?: string;
  /** Слова, по которым нашлось: подсвечиваются в названии и описании */
  marks?: ReadonlySet<string> | null;
  /** Идёт выбор для сравнения: вместо сердечка кружок выбора; недоступен, когда выбрано предельное число */
  pick?: { selected: boolean; disabled: boolean };
}

/** Карточка теста в библиотеке: вид как у карточки в чате, но справа сердечко «в избранное» */
export function LibraryCard({ test, favorite, onToggleFavorite, onClick, facts, why, marks, pick }: LibraryCardProps) {
  const cls = ['lib-card', pick && 'lib-card--pick', pick?.selected && 'lib-card--picked', pick?.disabled && !pick.selected && 'lib-card--dim'].filter(Boolean).join(' ');
  return (
    <li className={cls}>
      <button
        type="button"
        className="test-card"
        aria-pressed={pick ? pick.selected : undefined}
        aria-disabled={pick?.disabled && !pick.selected ? true : undefined}
        onClick={() => onClick?.(test)}
      >
        <span className="test-card__avatar" style={{ '--tint': test.tint } as CSSProperties}>
          <img className="test-card__icon" src={test.icon} alt="" />
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
      {pick ? (
        <span className="lib-card__pick" aria-hidden="true">
          {pick.selected && <IconCheck />}
        </span>
      ) : (
        <button
          type="button"
          className="lib-card__heart"
          aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          aria-pressed={favorite}
          onClick={() => onToggleFavorite(test.id)}
        >
          {favorite ? <IconHeartRed /> : <IconHeartGray />}
        </button>
      )}
    </li>
  );
}
