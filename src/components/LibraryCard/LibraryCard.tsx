import type { CSSProperties } from 'react';
import { IconHeartGray, IconHeartRed } from '../icons';
import { TruncatedText } from '../TruncatedText/TruncatedText';
import type { LibraryTest } from '../../data/library';
import '../TestCard/TestCard.css';
import './LibraryCard.css';

interface LibraryCardProps {
  test: LibraryTest;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClick?: (test: LibraryTest) => void;
}

/** Карточка теста в библиотеке: вид как у карточки в чате, но справа сердечко «в избранное» */
export function LibraryCard({ test, favorite, onToggleFavorite, onClick }: LibraryCardProps) {
  return (
    <li className="lib-card">
      <button type="button" className="test-card" onClick={() => onClick?.(test)}>
        <span className="test-card__avatar" style={{ '--tint': test.tint } as CSSProperties}>
          <img className="test-card__icon" src={test.icon} alt="" />
        </span>
        <span className="test-card__body">
          <span className="test-card__top lib-card__top">
            <TruncatedText className="test-card__title" text={test.title} />
          </span>
          <span className="test-card__description">{test.description}</span>
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
