import type { CSSProperties } from 'react';
import { usePick, type PickProps } from '../ChatCase/ChatCase';
import type { PsyTest } from '../../data/tests';
import './TestCard.css';

interface TestCardProps extends PickProps {
  test: PsyTest;
  onClick?: (test: PsyTest) => void;
}

export function TestCard({ test, onClick, selecting, selected, onPick }: TestCardProps) {
  const pick = usePick(test.id, { selecting, onPick }, true);
  return (
    <li data-selecting={selecting || undefined} data-selected={selected || undefined} {...pick}>
      <button type="button" className="test-card" onClick={() => onClick?.(test)}>
        <span
          className="test-card__avatar"
          style={{ '--tint': test.tint } as CSSProperties}
        >
          <img className="test-card__icon" src={test.icon} alt="" loading="lazy" decoding="async" />
        </span>
        <span className="test-card__body">
          <span className="test-card__top">
            <span className="test-card__title">{test.title}</span>
            <span className="test-card__date">{test.date}</span>
          </span>
          <span className="test-card__description">{test.description}</span>
        </span>
        {selecting && <span className="pick-mark" aria-hidden="true" />}
      </button>
    </li>
  );
}
