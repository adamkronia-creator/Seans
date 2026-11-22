import type { CSSProperties } from 'react';
import IconCalendar from '../../assets/icons/solar/calendar.svg?react';
import type { ConclusionData } from '../../data/conclusions';
import type { LibraryTest } from '../../data/library';
import type { PsyTest } from '../../data/tests';
import { usePick, type PickProps } from '../ChatCase/ChatCase';
import { ScaleList } from '../ChatHistory/ScaleList';
import { IconDots } from '../Profile/ProfileIcons';
import '../LibraryCard/LibraryCard.css';
import '../LibraryCard/CatalogCard.css';
import '../TestCard/TestCard.css';

interface ChatTestCardProps extends PickProps {
  item: PsyTest;
  test?: LibraryTest;
  description?: string;
  result?: ConclusionData;
  onOpen: () => void;
  onMenu: (id: string, opener: HTMLButtonElement) => void;
  onRemind?: () => void;
}

export function ChatTestCard({ item, test, description, result, onOpen, onMenu, onRemind, selecting, selected, onPick }: ChatTestCardProps) {
  const pick = usePick(item.id, { selecting, onPick }, true);
  const done = item.status === 'done';
  const date = item.fullDate || result?.info.date || item.date;
  const sentDate = done ? item.sentDate : date;

  return (
    <li className="chat-test-card" data-selecting={selecting || undefined} data-selected={selected || undefined} {...pick}>
      <button type="button" className="test-card" onClick={onOpen}>
        <span className="test-card__avatar" style={{ '--tint': item.tint } as CSSProperties}>
          <img
            className={test?.catalogCover ? 'lib-card__cover' : 'test-card__icon'}
            src={test?.catalogCover ?? item.icon}
            alt=""
            loading="lazy"
            decoding="async"
          />
          {done && test?.catalogCover && test.abbr && <span className="lib-card__abbr">{test.abbr}</span>}
        </span>
        <span className="test-card__body">
          <span className="test-card__title">{item.title}</span>
          <span className="test-card__description">{description || item.description}</span>
          <span className="chat-test-card__dates lib-card__fact-list">
            {sentDate && <span><IconCalendar aria-hidden="true" />Отправлен {sentDate}</span>}
            {sentDate && done && ' '}
            {done && <span><IconCalendar aria-hidden="true" />Завершён {date}</span>}
          </span>
        </span>
        {selecting && <span className="pick-mark" aria-hidden="true" />}
      </button>
      {result && result.scales.length > 0 && (
        <div className="chat-test-card__scales" {...({ inert: selecting ? '' : undefined } as object)}>
          <ScaleList data={result} onOpen={onOpen} grouping={test?.id === '5pfq' ? 'factors' : 'main-extra'} />
        </div>
      )}
      {!selecting && onRemind && (
        <button
          type="button"
          className="chat-test-card__remind"
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
          className="chat-test-card__menu"
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
