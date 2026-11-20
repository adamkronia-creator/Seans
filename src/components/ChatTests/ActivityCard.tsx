import type { CSSProperties } from 'react';
import { usePick, type PickProps } from '../ChatCase/ChatCase';
import { ScaleList } from '../ChatHistory/ScaleList';
import type { ConclusionData } from '../../data/conclusions';
import { IconDots } from '../Profile/ProfileIcons';
import type { PsyTest } from '../../data/tests';

interface ActivityCardProps extends PickProps {
  item: PsyTest;
  category: string;
  date: string;
  description?: string;
  details?: string;
  result?: ConclusionData;
  onOpen: () => void;
  onMenu: (id: string, opener: HTMLButtonElement) => void;
}

export function ActivityCard({ item, category, date, description, details, result, onOpen, onMenu, selecting, selected, onPick }: ActivityCardProps) {
  const pick = usePick(item.id, { selecting, onPick }, true);
  return (
    <li className="activity-card" data-selecting={selecting || undefined} data-selected={selected || undefined} {...pick}>
      <button type="button" className="activity-card__body" onClick={onOpen}>
        <span className="activity-card__header">
          <span className="activity-card__icon" style={{ '--tint': item.tint } as CSSProperties}>
            <img src={item.icon} alt="" loading="lazy" decoding="async" />
          </span>
          <span className="activity-card__meta">
            <span>{category}</span>
            <span className="activity-card__date">{date}{details && ` · ${details}`}</span>
          </span>
        </span>
        <span className="activity-card__title">{item.title}</span>
        <span className="activity-card__description">{description || item.description}</span>
        {selecting && <span className="pick-mark" aria-hidden="true" />}
      </button>
      {result && result.scales.length > 0 && (
        <div className="activity-card__scales">
          <ScaleList data={result} onOpen={onOpen} grouping={item.id === '5pfq' ? 'factors' : 'main-extra'} />
        </div>
      )}
      {!selecting && (
        <button
          type="button"
          className="case-card__edit"
          aria-label={`Действия: ${item.title}`}
          aria-haspopup="menu"
          data-no-swipe
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => onMenu(item.id, event.currentTarget)}
        >
          <IconDots />
        </button>
      )}
    </li>
  );
}
