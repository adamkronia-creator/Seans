import type { CSSProperties } from 'react';
import IconCalendar from '../../assets/icons/solar/calendar.svg?react';
import type { ConclusionData } from '../../data/conclusions';
import type { PsyTest } from '../../data/tests';
import { usePick, type PickProps } from '../ChatCase/ChatCase';
import { ScaleList } from '../ChatHistory/ScaleList';
import { IconDots } from '../Profile/ProfileIcons';
import '../LibraryCard/LibraryCard.css';
import '../LibraryCard/CatalogCard.css';
import '../TestCard/TestCard.css';

interface ChatActivityCardProps extends PickProps {
  item: PsyTest;
  kind: 'test' | 'task';
  cover?: string;
  badge?: string;
  description?: string;
  date?: string;
  details?: string;
  result?: ConclusionData;
  onOpen: () => void;
  onMenu: (id: string, opener: HTMLButtonElement) => void;
  onRemind?: () => void;
}

export function ChatActivityCard({ item, kind, cover, badge, description, date = item.fullDate || item.date, details, result, onOpen, onMenu, onRemind, selecting, selected, onPick }: ChatActivityCardProps) {
  const pick = usePick(item.id, { selecting, onPick }, true);
  const done = item.status === 'done';
  const assigned = item.status === 'permanent' || item.status === 'assigned';
  const label = kind === 'test'
    ? (done ? 'Завершён' : 'Отправлен')
    : (done ? 'Завершено' : assigned ? 'Назначено' : 'Отправлено');

  return (
    <li className="chat-activity-card" data-selecting={selecting || undefined} data-selected={selected || undefined} {...pick}>
      <button type="button" className="test-card" onClick={onOpen}>
        <span className="test-card__avatar" style={{ '--tint': item.tint } as CSSProperties}>
          <img
            className={cover ? 'lib-card__cover' : 'test-card__icon'}
            src={cover ?? item.icon}
            alt=""
            loading="lazy"
            decoding="async"
          />
          {cover && badge && <span className="lib-card__abbr" data-below-reminder={onRemind ? '' : undefined}>{badge}</span>}
        </span>
        <span className="test-card__body">
          <span className="test-card__title">{item.title}</span>
          <span className="test-card__description">{description || item.description}</span>
          <span className="chat-activity-card__facts lib-card__fact-list">
            {done && item.sentDate && <><span><IconCalendar aria-hidden="true" />Отправлен {item.sentDate}</span>{' '}</>}
            {date && <span><IconCalendar aria-hidden="true" />{label} {date}</span>}
            {details && <>{' '}<span>{details}</span></>}
          </span>
        </span>
        {selecting && <span className="pick-mark" aria-hidden="true" />}
      </button>
      {result && result.scales.length > 0 && (
        <div className="chat-activity-card__scales" {...({ inert: selecting ? '' : undefined } as object)}>
          <ScaleList data={result} onOpen={onOpen} grouping={item.id === '5pfq' ? 'factors' : 'main-extra'} />
        </div>
      )}
      {!selecting && onRemind && (
        <button
          type="button"
          className="chat-activity-card__remind"
          aria-label={`Напомнить: ${item.title}`}
          data-no-swipe
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onRemind}
        >
          Напомнить
        </button>
      )}
      {!selecting && (
        <button
          type="button"
          className="chat-activity-card__menu"
          aria-label={`Действия: ${item.title}`}
          aria-haspopup="menu"
          data-no-swipe
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => onMenu(item.id, event.currentTarget)}
        >
          <IconDots aria-hidden="true" />
        </button>
      )}
    </li>
  );
}
