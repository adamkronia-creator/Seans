import type { AppEvent } from '../../data/events';
import { Avatar } from '../Avatar/Avatar';
import './EventItem.css';

const AVATAR_SIZE = 48;

interface EventItemProps {
  event: AppEvent;
  onClick?: (event: AppEvent) => void;
}

export function EventItem({ event, onClick }: EventItemProps) {
  const content = (
    <>
      <Avatar src={event.avatar} size={AVATAR_SIZE} />
      <span className="event-item__body">
        <span className="event-item__top">
          <span className="event-item__name">{event.name}</span>
          <span className="event-item__date">{event.date}</span>
        </span>
        <span className="event-item__text">{event.text}</span>
      </span>
    </>
  );

  return (
    <li className="event-item">
      {event.link ? (
        <button type="button" className="event-item__inner" onClick={() => onClick?.(event)}>
          {content}
        </button>
      ) : (
        <div className="event-item__inner">{content}</div>
      )}
    </li>
  );
}
