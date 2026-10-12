import type { CSSProperties } from 'react';
import { IconClose } from '../ChatParts/ChatIcons';
import type { LibraryItem } from '../../data/library';
import { COMPARE_LIMIT } from '../../data/libraryView';
import './LibraryFilters.css';

interface CompareBarProps {
  picked: LibraryItem[];
  onCompare: () => void;
  onCancel: () => void;
}

/** Плавающая панель над списком, пока выбирают материалы для сравнения: кто выбран и кнопка, когда выбрано двое */
export function CompareBar({ picked, onCompare, onCancel }: CompareBarProps) {
  const text = picked.length === 0 ? `Выберите 2–${COMPARE_LIMIT}` : picked.length === 1 ? 'Выберите ещё' : `Выбрано ${picked.length}`;
  return (
    <div className="compare-bar" role="region" aria-label="Выбор для сравнения">
      {picked.length > 0 && (
        <span className="compare-bar__stack" aria-hidden="true">
          {picked.map((p) => (
            <span key={p.id} className="compare-bar__avatar" style={{ '--tint': p.tint } as CSSProperties}>
              <img src={p.icon} alt="" />
            </span>
          ))}
        </span>
      )}
      <p className={`compare-bar__text${picked.length >= 2 ? ' compare-bar__text--count' : ''}`} aria-live="polite">
        {text}
      </p>
      <button type="button" className="compare-bar__go" disabled={picked.length < 2} onClick={onCompare}>
        Сравнить
      </button>
      <button type="button" className="compare-bar__cancel" aria-label="Отменить выбор" onClick={onCancel}>
        <IconClose />
      </button>
    </div>
  );
}
