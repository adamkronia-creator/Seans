import type { ComponentType, SVGProps } from 'react';
import type { AppEvent, EventType } from '../../data/events';
import { Avatar } from '../Avatar/Avatar';
import { IconChevronRight, IconEventInvite, IconEventSurvey, IconEventTask } from '../icons';
import './EventItem.css';

const AVATAR_SIZE = 52;

const TYPE_ICON: Record<EventType, ComponentType<SVGProps<SVGSVGElement>>> = {
  task: IconEventTask,
  survey: IconEventSurvey,
  invite: IconEventInvite,
};

interface EventItemProps {
  event: AppEvent;
  onClick?: (event: AppEvent) => void;
}

export function EventItem({ event, onClick }: EventItemProps) {
  const TypeIcon = TYPE_ICON[event.type];

  const content = (
    <>
      <Avatar src={event.avatar} size={AVATAR_SIZE} badge={<TypeIcon />} />
      <span className="event-item__body">
        <span className="event-item__top">
          <span className="event-item__name">{event.name}</span>
          <span className="event-item__date">{event.date}</span>
        </span>
        <span className="event-item__row">
          <span className="event-item__text">{event.text}</span>
          {event.link && <IconChevronRight className="event-item__chevron" />}
        </span>
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
