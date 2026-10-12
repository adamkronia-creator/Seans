import type { CSSProperties } from 'react';
import type { PsyTest } from '../../data/tests';
import './TestCard.css';

interface TestCardProps {
  test: PsyTest;
  onClick?: (test: PsyTest) => void;
}

export function TestCard({ test, onClick }: TestCardProps) {
  return (
    <li>
      <button type="button" className="test-card" onClick={() => onClick?.(test)}>
        <span
          className="test-card__avatar"
          style={{ '--tint': test.tint } as CSSProperties}
        >
          <img className="test-card__icon" src={test.icon} alt="" />
        </span>
        <span className="test-card__body">
          <span className="test-card__top">
            <span className="test-card__title">{test.title}</span>
            <span className="test-card__date">{test.date}</span>
          </span>
          <span className="test-card__description">{test.description}</span>
        </span>
      </button>
    </li>
  );
}
